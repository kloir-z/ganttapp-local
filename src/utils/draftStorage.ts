// ブラウザ内の下書き(未保存の変更)と、上書き保存先のファイルハンドルの保存先。
//
// file:// で開いた HTML はフォルダやファイル名に関係なく同じ保存領域(オリジン "file://")を
// 共有するので、1 つのキーに書くとタブどうし・アプリのコピーどうしで上書きし合う。
// そのため下書きは 1 件ずつ draftId をキーにして持ち、どのタブのものかは ownerTabId で表す。
// localStorage は 5MB ほどで書き込み中に画面が止まるため、容量が大きく非同期の IndexedDB を使う。
import type { ProjectData } from './ExportImportHandler';

// dirty: 保存されていない変更がある。起動時に復元するかを尋ねる対象。
// saved: その内容を保存(ダウンロード・書き出し・上書き保存)済み。尋ねはしないが、
//        ダウンロードを取り消した場合などにファイルメニューの「下書き」から開き直せるよう残しておく。
export type DraftStatus = 'dirty' | 'saved';

export interface DraftRecord {
  draftId: string;
  // 書いているタブの ID。タブを離れた(新規・開くで別のプロジェクトに切り替えた)下書きは空文字。
  ownerTabId: string;
  status: DraftStatus;
  projectId: string;
  // 編集を始めた版の ID(開いた・最後に保存したファイルの revisionId)。分からなければ空文字。
  baseRevisionId: string;
  title: string;
  rowCount: number;
  updatedAt: number;
  // 最後に保存した(または開いた)時点の中身のハッシュ。中身がこれに戻ったら下書きは要らない。
  baseHash: string | null;
  // 書いたアプリの EXPORT_SCHEMA_VERSION。新しい版が書いた下書きは警告してから開く。
  schemaVersion: number;
  project: ProjectData;
}

export interface DraftStorage {
  get(draftId: string): Promise<DraftRecord | undefined>;
  put(record: DraftRecord): Promise<void>;
  remove(draftId: string): Promise<void>;
  list(): Promise<DraftRecord[]>;
}

// 上書き保存先。プロジェクトごとに最後に保存したファイルを覚えておき、次に開いたときも使う。
export interface SavedFileHandleRecord {
  projectId: string;
  handle: FileSystemFileHandle;
  savedAt: number;
}

const DB_NAME = 'gantty-drafts';
const DB_VERSION = 2;
const DRAFT_STORE = 'drafts';
const HANDLE_STORE = 'fileHandles';

const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

let dbPromise: Promise<IDBDatabase> | null = null;
const openDb = (): Promise<IDBDatabase> => {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(DRAFT_STORE)) db.createObjectStore(DRAFT_STORE, { keyPath: 'draftId' });
        if (!db.objectStoreNames.contains(HANDLE_STORE)) db.createObjectStore(HANDLE_STORE, { keyPath: 'projectId' });
      };
      request.onsuccess = () => {
        // 新しい版のアプリが別のタブで開き直そうとしたら、閉じて道を空ける
        request.result.onversionchange = () => { request.result.close(); dbPromise = null; };
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
    // 開けなかったら次の呼び出しで開き直す
    dbPromise.catch(() => { dbPromise = null; });
  }
  return dbPromise;
};

const run = async <T>(
  storeName: string, mode: IDBTransactionMode, body: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> => {
  const db = await openDb();
  const transaction = db.transaction(storeName, mode);
  const result = requestToPromise(body(transaction.objectStore(storeName)));
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
  return result;
};

export const createIndexedDbDraftStorage = (): DraftStorage => ({
  get: (draftId) => run(DRAFT_STORE, 'readonly', (store) => store.get(draftId) as IDBRequest<DraftRecord | undefined>),
  put: async (record) => { await run(DRAFT_STORE, 'readwrite', (store) => store.put(record)); },
  remove: async (draftId) => { await run(DRAFT_STORE, 'readwrite', (store) => store.delete(draftId)); },
  list: () => run(DRAFT_STORE, 'readonly', (store) => store.getAll() as IDBRequest<DraftRecord[]>),
});

// テスト用と、IndexedDB が使えない環境の代わり(タブを閉じると消える)。
export const createMemoryDraftStorage = (): DraftStorage => {
  const records = new Map<string, DraftRecord>();
  return {
    get: async (draftId) => records.get(draftId),
    put: async (record) => { records.set(record.draftId, record); },
    remove: async (draftId) => { records.delete(draftId); },
    list: async () => Array.from(records.values()),
  };
};

const hasIndexedDb = () => typeof indexedDB !== 'undefined';

export const loadSavedFileHandle = async (projectId: string): Promise<SavedFileHandleRecord | undefined> => {
  if (!hasIndexedDb() || !projectId) return undefined;
  return run(HANDLE_STORE, 'readonly', (store) => store.get(projectId) as IDBRequest<SavedFileHandleRecord | undefined>);
};

export const storeSavedFileHandle = async (record: SavedFileHandleRecord): Promise<void> => {
  if (!hasIndexedDb() || !record.projectId) return;
  await run(HANDLE_STORE, 'readwrite', (store) => store.put(record));
};
