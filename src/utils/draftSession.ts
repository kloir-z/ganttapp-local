// 未保存の変更をブラウザ内(IndexedDB)の下書きに書き続け、閉じたタブや再読み込みから
// 復元できるようにする。
//
// 保存状態との結びつけ方:
// - 「保存済み」は今までどおり 4 つの isSavedChanges(wbsData/color/baseSettings/notes)が
//   すべて true であること。どれかが false の間だけ下書きを書く(最後の変更から少し待って)。
// - 保存済みだった最後の状態を基準点とし、その中身のハッシュ(baseHash)を下書きに持たせる。
//   画面の状態(スクロール位置やメモ画面の位置)はハッシュに含めないので、それだけを動かした
//   ときや、元に戻すで最初まで戻ったときは下書きを作らない(あれば消す)。
// - ダウンロード(markSaved)のあとは下書きを消さずに「ダウンロード済み」にして残す。
//   ダウンロードを取り消しても、ファイルメニューの「下書き」から開き直せる。
// - 新規作成・ファイルを開くなどで別のプロジェクトに切り替えるとき(detach)は、書きかけの
//   下書きをタブから切り離して残す。切り替えで変更が消えることはない。
// - タブは開いている間 Web Lock を持つ。起動時に、ロックの持ち主がいない下書きだけを
//   「閉じたタブの下書き」として扱う(別のタブで編集中のものは出さない)。
import { v4 as uuidv4 } from 'uuid';
import type { AppDispatch, RootState } from '../reduxStoreAndSlices/store';
import { removePastState, setIsSavedChangesStore } from '../reduxStoreAndSlices/store';
import { setIsSavedChangesColor } from '../reduxStoreAndSlices/colorSlice';
import { setIsSavedChangesNotes } from '../reduxStoreAndSlices/notesSlice';
import { setIsSavedChangesSettings } from '../reduxStoreAndSlices/baseSettingsSlice';
import { buildExportOptionsFromState, buildProjectData, EXPORT_SCHEMA_VERSION, handleImport, ProjectData } from './ExportImportHandler';
import { createIndexedDbDraftStorage, createMemoryDraftStorage, DraftRecord, DraftStorage } from './draftStorage';

// 最後の変更からこれだけ待って書く。ドラッグなどで変更が続いても、MAX_WAIT ごとには書く。
export const DRAFT_DEBOUNCE_MS = 1000;
export const DRAFT_MAX_WAIT_MS = 5000;
// 残しておく件数と期間(古いもの・多すぎるものは起動時に消す)
export const DRAFT_MAX_RECORDS = 20;
export const DRAFT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const TAB_ID_KEY = 'gantty_draft_tab_id';
const SESSION_DRAFT_ID_KEY = 'gantty_draft_id';
const TAB_LOCK_PREFIX = 'gantty-tab:';

// 画面の状態だけを表す項目。ファイルには入るが、変わっても「中身が変わった」とは見なさない。
const VIEW_ONLY_KEYS: Record<string, true> = {
  scrollPosition: true,
  notesModalState: true,
  treeExpandedKeys: true,
  treeScrollPosition: true,
  editorStates: true,
  selectedNodeKey: true,
  // 版の ID は保存のたびに変わるが、中身の変更ではない
  revisionId: true,
};

export const isAllSaved = (state: RootState): boolean =>
  state.wbsData.isSavedChanges && state.color.isSavedChanges
  && state.baseSettings.isSavedChanges && state.notes.isSavedChanges;

// cyrb53: 速い 53 ビットの文字列ハッシュ。改ざん検出ではなく「同じ中身か」を見るだけなので十分。
// crypto.subtle と違って同期で動き、jsdom のテストでもそのまま使える。
export const hashString = (text: string): string => {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
};

export const projectContentHash = (project: ProjectData): string => {
  const root = project;
  return hashString(JSON.stringify(project, function (this: unknown, key: string, value: unknown) {
    return this === root && VIEW_ONLY_KEYS[key] ? undefined : value;
  }));
};

export const projectFromState = (state: RootState): ProjectData =>
  buildProjectData(buildExportOptionsFromState(state));

// 下書きと、いま開いているプロジェクトとの関係。
// continuation: 開いている版から編集を始めたもの(保存し忘れた続き)。
// otherVersion: 同じプロジェクトだが別の版から編集を始めたもの(あとで別の版が保存された、など)。
// otherProject: 別のプロジェクト。
export type DraftRelation = 'continuation' | 'otherVersion' | 'otherProject';

export const draftRelation = (
  record: Pick<DraftRecord, 'projectId' | 'baseRevisionId'>, projectId: string, revisionId: string
): DraftRelation => {
  if (!record.projectId || record.projectId !== projectId) return 'otherProject';
  // 版が分からない(古いファイル・保存前の新規)ときは同じ版とは言えない
  return record.baseRevisionId !== '' && record.baseRevisionId === revisionId ? 'continuation' : 'otherVersion';
};

// 起動時に消す下書きを選ぶ。開いているタブのものは消さない。
// 期限切れを消し、残りが多すぎれば更新の古い順に消す。
export const selectDraftsToPrune = (
  records: DraftRecord[], liveTabIds: Set<string>, now: number
): DraftRecord[] => {
  const removable = records.filter((record) => !liveTabIds.has(record.ownerTabId));
  const expired = removable.filter((record) => now - record.updatedAt > DRAFT_MAX_AGE_MS);
  const rest = records
    .filter((record) => !expired.includes(record))
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const overflow = rest.slice(DRAFT_MAX_RECORDS).filter((record) => !liveTabIds.has(record.ownerTabId));
  return [...expired, ...overflow];
};

interface DraftStore {
  getState(): RootState;
  dispatch: AppDispatch;
  subscribe(listener: () => void): () => void;
}

export interface DraftSessionOptions {
  storage: DraftStorage;
  // Web Lock を使えないとき(テストや一部のブラウザ)は null。
  locks?: LockManager | null;
  sessionStorage?: Storage | null;
  now?: () => number;
}

export class DraftSession {
  private store: DraftStore | null = null;
  private unsubscribe: (() => void) | null = null;
  private readonly storage: DraftStorage;
  private readonly locks: LockManager | null;
  private readonly sessionStore: Storage | null;
  private readonly now: () => number;

  tabId = '';
  // 今のプロジェクトの下書き。まだ書いていなければ null。
  private draftId: string | null = null;
  private recordExists = false;
  private baseHash: string | null = null;
  // 保存済みだった最後の状態。baseHash はここから必要になったときに計算する。
  private lastSavedState: RootState | null = null;
  private wasSaved = true;
  // このプロジェクトをこのタブでダウンロードしたことがあるか
  private savedInSession = false;
  private timer: number | undefined = undefined;
  private firstPendingAt: number | null = null;
  private queue: Promise<void> = Promise.resolve();
  private releaseLock: (() => void) | null = null;
  private adopting = false;

  constructor(options: DraftSessionOptions) {
    this.storage = options.storage;
    this.locks = options.locks ?? null;
    this.sessionStore = options.sessionStorage ?? null;
    this.now = options.now ?? Date.now;
  }

  get isStarted(): boolean {
    return this.store !== null;
  }

  // タブの ID を決めてロックを取り、ストアの監視を始める。
  async start(store: DraftStore): Promise<void> {
    if (this.store) return;
    this.tabId = await this.acquireTabId();
    this.store = store;
    const state = store.getState();
    this.wasSaved = isAllSaved(state);
    if (this.wasSaved) this.lastSavedState = state;
    this.unsubscribe = store.subscribe(this.handleChange);
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.store = null;
    this.clearTimer();
    this.releaseLock?.();
    this.releaseLock = null;
  }

  private async acquireTabId(): Promise<string> {
    const stored = this.readSession(TAB_ID_KEY);
    if (!this.locks) {
      const tabId = stored ?? uuidv4();
      this.writeSession(TAB_ID_KEY, tabId);
      return tabId;
    }
    // 複製したタブは sessionStorage ごと ID を引き継ぐ。元のタブがロックを持っていたら
    // 新しい ID にする(同じ ID のまま書くと、互いの下書きを上書きしてしまう)。
    let candidate = stored ?? uuidv4();
    for (let attempt = 0; attempt < 3; attempt++) {
      if (await this.tryHoldLock(candidate)) {
        this.writeSession(TAB_ID_KEY, candidate);
        if (candidate !== stored) this.removeSession(SESSION_DRAFT_ID_KEY);
        return candidate;
      }
      candidate = uuidv4();
    }
    this.removeSession(SESSION_DRAFT_ID_KEY);
    return candidate;
  }

  private tryHoldLock(tabId: string): Promise<boolean> {
    const locks = this.locks as LockManager;
    return new Promise((resolve) => {
      locks.request(TAB_LOCK_PREFIX + tabId, { ifAvailable: true }, (lock) => {
        if (!lock) {
          resolve(false);
          return undefined;
        }
        resolve(true);
        // タブを閉じるまで持ち続ける
        return new Promise<void>((release) => { this.releaseLock = release; });
      }).catch(() => resolve(false));
    });
  }

  private readSession(key: string): string | null {
    try { return this.sessionStore?.getItem(key) ?? null; } catch { return null; }
  }

  private writeSession(key: string, value: string): void {
    try { this.sessionStore?.setItem(key, value); } catch { /* 使えなければ覚えない */ }
  }

  private removeSession(key: string): void {
    try { this.sessionStore?.removeItem(key); } catch { /* 同上 */ }
  }

  private handleChange = (): void => {
    if (!this.store || this.adopting) return;
    const state = this.store.getState();
    const saved = isAllSaved(state);
    if (saved) {
      if (!this.wasSaved) {
        // 保存・読み込みで保存済みに戻った。基準点はこの状態から取り直す。
        this.baseHash = null;
        this.clearTimer();
      }
      this.lastSavedState = state;
    } else if (state.uiFlags.isViewMode) {
      // 閲覧モードでは下書きを書かない。基準点(最後に保存済みだった状態)だけは追い続けるので、
      // 編集モードに切り替えた時点で、開いたファイルとの違いが下書きになる。
      this.clearTimer();
    } else {
      this.schedule();
    }
    this.wasSaved = saved;
  };

  private schedule(): void {
    const now = this.now();
    if (this.firstPendingAt === null) this.firstPendingAt = now;
    clearTimeout(this.timer);
    const wait = Math.max(0, Math.min(DRAFT_DEBOUNCE_MS, this.firstPendingAt + DRAFT_MAX_WAIT_MS - now));
    this.timer = window.setTimeout(() => { void this.flush(); }, wait);
  }

  private clearTimer(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.firstPendingAt = null;
  }

  private ensureBaseHash(): string | null {
    if (this.baseHash === null && this.lastSavedState) {
      this.baseHash = projectContentHash(projectFromState(this.lastSavedState));
    }
    return this.baseHash;
  }

  // 書きかけを今すぐ書く(ページを離れるときなど)。中身はこの呼び出しの時点で取る。
  flush(ownerTabId: string = this.tabId): Promise<void> {
    this.clearTimer();
    if (!this.store) return this.queue;
    const state = this.store.getState();
    // 閲覧モードでは書かない(閉じれば消える。切り替える前の変更も、編集モードにしたら書く)
    if (isAllSaved(state) || state.uiFlags.isViewMode) return this.queue;
    const project = projectFromState(state);
    const hash = projectContentHash(project);
    const baseHash = this.ensureBaseHash();

    if (hash === baseHash) {
      // 中身が保存済みの状態に戻った
      if (!this.recordExists || !this.draftId) return this.queue;
      const draftId = this.draftId;
      if (this.savedInSession) {
        return this.enqueue(() => this.storage.put(this.makeRecord(draftId, ownerTabId, 'saved', project, baseHash)));
      }
      this.recordExists = false;
      return this.enqueue(() => this.storage.remove(draftId));
    }

    const draftId = this.ensureDraftId();
    this.recordExists = true;
    return this.enqueue(() => this.storage.put(this.makeRecord(draftId, ownerTabId, 'dirty', project, baseHash)));
  }

  // ダウンロードした直後に呼ぶ(isSavedChanges を true に戻す前)。
  markSaved(): Promise<void> {
    this.clearTimer();
    this.savedInSession = true;
    if (!this.store || !this.recordExists || !this.draftId) return this.queue;
    const project = projectFromState(this.store.getState());
    const draftId = this.draftId;
    const hash = projectContentHash(project);
    return this.enqueue(() => this.storage.put(this.makeRecord(draftId, this.tabId, 'saved', project, hash)));
  }

  // 別のプロジェクトに切り替える直前に呼ぶ。書きかけはタブから切り離して残す。
  detach(): Promise<void> {
    if (!this.store) return this.queue;
    let done: Promise<void>;
    if (!isAllSaved(this.store.getState())) {
      done = this.flush('');
    } else if (this.recordExists && this.draftId) {
      const draftId = this.draftId;
      done = this.enqueue(async () => {
        const record = await this.storage.get(draftId);
        if (record) await this.storage.put({ ...record, ownerTabId: '' });
      });
    } else {
      done = this.queue;
    }
    this.draftId = null;
    this.recordExists = false;
    this.baseHash = null;
    this.lastSavedState = null;
    this.savedInSession = false;
    this.removeSession(SESSION_DRAFT_ID_KEY);
    return done;
  }

  // 下書きを開いてこのタブの作業にする。呼ぶ前に resetReduxStates で状態を空にしておくこと。
  async adopt(record: DraftRecord): Promise<void> {
    if (!this.store) throw new Error('Draft session is not started');
    await this.queue;
    const store = this.store;
    const { dispatch } = store;
    // 読み込みの途中の状態(一時的に未保存になる)を下書きとして書かないよう、監視を止めておく
    this.adopting = true;
    this.clearTimer();
    try {
      const blob = new Blob([JSON.stringify(record.project)], { type: 'application/json' });
      const result = await dispatch(handleImport({ file: blob }));
      if (handleImport.rejected.match(result)) {
        throw new Error(result.error?.message || 'Failed to restore the draft');
      }
      dispatch(removePastState(1));
      if (record.status === 'dirty') {
        // ディスク上のファイルは古いままなので、未保存として扱い続ける
        dispatch(setIsSavedChangesStore(false));
        dispatch(setIsSavedChangesColor(false));
        dispatch(setIsSavedChangesNotes(false));
        dispatch(setIsSavedChangesSettings(false));
      }
    } finally {
      this.adopting = false;
    }
    const state = store.getState();
    this.wasSaved = isAllSaved(state);
    this.lastSavedState = this.wasSaved ? state : null;
    this.baseHash = record.status === 'dirty' ? record.baseHash : null;
    this.draftId = record.draftId;
    this.recordExists = true;
    this.savedInSession = record.status === 'saved';
    this.writeSession(SESSION_DRAFT_ID_KEY, record.draftId);
    await this.enqueue(() => this.storage.put({ ...record, ownerTabId: this.tabId }));
  }

  // 古い下書きを消したうえで、開き直せる下書きを返す。
  // ownDirty: このタブの前回の読み込みで書いた未保存の下書き(再読み込みのとき。自動で戻す対象)。
  // others: それ以外で、開いているほかのタブが書いていない下書き(新しい順)。
  async listOtherDrafts(): Promise<{ ownDirty: DraftRecord | null; others: DraftRecord[] }> {
    const records = await this.storage.list();
    const liveTabIds = await this.liveTabIds();
    liveTabIds.add(this.tabId);
    const pruned = selectDraftsToPrune(records, liveTabIds, this.now());
    await Promise.all(pruned.map((record) => this.storage.remove(record.draftId)));
    // 今このタブで書いている下書きは出さない。このタブの ID が付いたそれ以外の下書きは、
    // 前回の読み込みで書いたもの(再読み込みで残った)なので開き直せる。
    const remaining = records.filter((record) => !pruned.includes(record) && record.draftId !== this.draftId);
    const sessionDraftId = this.readSession(SESSION_DRAFT_ID_KEY);
    const ownDirty = remaining.find((record) =>
      record.ownerTabId === this.tabId && record.status === 'dirty'
      && (sessionDraftId === null || record.draftId === sessionDraftId)) ?? null;
    const others = remaining
      .filter((record) => record !== ownDirty)
      .filter((record) => record.ownerTabId === this.tabId || !liveTabIds.has(record.ownerTabId))
      .sort((a, b) => b.updatedAt - a.updatedAt);
    return { ownDirty, others };
  }

  // 開いたファイルと同じプロジェクトの、未保存の下書きがほかに残っているか
  async hasDirtyDraftForProject(projectId: string): Promise<boolean> {
    if (!projectId) return false;
    const { ownDirty, others } = await this.listOtherDrafts();
    return [ownDirty, ...others].some((record) => record?.status === 'dirty' && record.projectId === projectId);
  }

  // 起動前でも使える: そのプロジェクトの未保存の下書きが、どのタブのものでも残っているか
  async storageHasDirtyDraft(projectId: string): Promise<boolean> {
    if (!projectId) return false;
    const records = await this.storage.list();
    return records.some((record) => record.status === 'dirty' && record.projectId === projectId);
  }

  remove(draftId: string): Promise<void> {
    if (draftId === this.draftId) {
      this.draftId = null;
      this.recordExists = false;
    }
    return this.enqueue(() => this.storage.remove(draftId));
  }

  private async liveTabIds(): Promise<Set<string>> {
    const live = new Set<string>();
    if (!this.locks) return live;
    try {
      const snapshot = await this.locks.query();
      for (const lock of snapshot.held ?? []) {
        if (lock.name?.startsWith(TAB_LOCK_PREFIX)) live.add(lock.name.slice(TAB_LOCK_PREFIX.length));
      }
    } catch {
      // 調べられなければ、どのタブも閉じているものとして扱う
    }
    return live;
  }

  private ensureDraftId(): string {
    if (!this.draftId) {
      this.draftId = uuidv4();
      this.writeSession(SESSION_DRAFT_ID_KEY, this.draftId);
    }
    return this.draftId;
  }

  private makeRecord(
    draftId: string, ownerTabId: string, status: DraftRecord['status'], project: ProjectData, baseHash: string | null
  ): DraftRecord {
    return {
      draftId,
      ownerTabId,
      status,
      projectId: project.projectId ?? '',
      // 版の ID は保存か読み込みでしか変わらないので、未保存の間の値がそのまま「編集を始めた版」になる
      baseRevisionId: project.revisionId ?? '',
      title: project.title,
      rowCount: Object.keys(project.data).length,
      updatedAt: this.now(),
      baseHash,
      schemaVersion: EXPORT_SCHEMA_VERSION,
      project,
    };
  }

  private enqueue(task: () => Promise<void>): Promise<void> {
    this.queue = this.queue.then(task).catch((error) => {
      console.error('Failed to write the draft:', error);
    });
    return this.queue;
  }
}

// アプリ全体で 1 つ。LocalApp が起動を終えたあとに start する。
// IndexedDB の無い環境(jsdom のテストなど)ではメモリに持つ。
export const draftSession = new DraftSession({
  storage: typeof indexedDB !== 'undefined' ? createIndexedDbDraftStorage() : createMemoryDraftStorage(),
  locks: typeof navigator !== 'undefined' && navigator.locks ? navigator.locks : null,
  sessionStorage: typeof window !== 'undefined' ? window.sessionStorage : null,
});
