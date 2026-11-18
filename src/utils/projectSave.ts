// 保存(上書き保存・名前を付けて保存・ZIP のダウンロード・HTML の書き出し)を 1 か所にまとめる。
//
// どの保存も「新しい版の ID を作ってファイルに書く → 書けたら state の版を進め、下書きを保存済みにし、
// 未保存の印を消す」の順に進む。書けなかった(取り消した)ときは何も変えない。
//
// 上書き保存は File System Access API を使う(Edge/Chrome。file:// で開いた HTML でも使える)。
// - 保存先のファイルハンドルはプロジェクト(projectId)ごとに IndexedDB に覚え、次に開いたときも使う。
//   ブラウザを開き直したあとの最初の 1 回は、ブラウザが書き込みの許可を求める。
// - 書き込む前に保存先ファイルの版の ID を読み、開いたときの版と違えば(別のタブや別の人が
//   更新していれば)上書きしてよいか尋ねる。
// - 使えないブラウザ(Firefox など)では HTML のダウンロードに戻す。
import { v4 as uuidv4 } from 'uuid';
import JSZip from 'jszip';
import type { AppDispatch, RootState } from '../reduxStoreAndSlices/store';
import { setIsSavedChangesStore } from '../reduxStoreAndSlices/store';
import { setIsSavedChangesColor } from '../reduxStoreAndSlices/colorSlice';
import { setIsSavedChangesNotes } from '../reduxStoreAndSlices/notesSlice';
import { setIsSavedChangesSettings, setRevisionId, setTitle } from '../reduxStoreAndSlices/baseSettingsSlice';
import { setViewMode } from '../reduxStoreAndSlices/uiFlagSlice';
import { buildExportOptionsFromState, buildProjectData, ProjectData, serializeToZip } from './ExportImportHandler';
import { buildProjectHtml, htmlFileNameForTitle, readEmbeddedProjectData, readEmbeddedProjectDataFromHtml } from './HtmlSnapshotExport';
import { downloadBlob } from './downloadBlob';
import { draftSession } from './draftSession';
import { loadSavedFileHandle, storeSavedFileHandle } from './draftStorage';

export type SaveFormat = 'html' | 'zip';

export const formatOfFileName = (name: string): SaveFormat => (/\.zip$/i.test(name) ? 'zip' : 'html');

// File System Access API のうち、TypeScript の lib.dom に無いもの(Chromium のみ)
type ReadWrite = { mode: 'readwrite' };
interface WritableFileHandle extends FileSystemFileHandle {
  queryPermission?: (descriptor: ReadWrite) => Promise<PermissionState>;
  requestPermission?: (descriptor: ReadWrite) => Promise<PermissionState>;
}
interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: { description: string; accept: Record<string, string[]> }[];
  startIn?: FileSystemHandle;
}
type ShowSaveFilePicker = (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;

const getSavePicker = (): ShowSaveFilePicker | undefined => {
  if (typeof window === 'undefined' || !('showSaveFilePicker' in window)) return undefined;
  const picker = window.showSaveFilePicker;
  // lib.dom に型が無い(Chromium のみの API)ので、関数であることだけ確かめて型を付ける
  return typeof picker === 'function' ? picker as ShowSaveFilePicker : undefined;
};

export const canSaveToFile = (): boolean => typeof getSavePicker() === 'function';

export interface SaveContext {
  getState: () => RootState;
  dispatch: AppDispatch;
  // 上書きしようとしたファイルが、開いたあとに別の内容で保存されていたときに尋ねる
  confirmOverwrite: (fileName: string) => boolean;
}

export type SaveOutcome =
  | { status: 'saved'; fileName: string; method: 'file' | 'download' }
  | { status: 'cancelled' };

// このタブで最後に保存したファイル(プロジェクトごとに 1 つ)
let currentTarget: { projectId: string; handle: WritableFileHandle } | null = null;
let saving = false;

// file:// で開いているページのファイル名(書き出した HTML を直接開いているときは、それが作業ファイル)
const pageFileName = (): string | null => {
  if (typeof location === 'undefined' || location.protocol !== 'file:') return null;
  const name = decodeURIComponent(location.pathname.split('/').pop() ?? '');
  return name || null;
};

const prepare = (ctx: SaveContext, titleOverride?: string): { revisionId: string; projectData: ProjectData } => {
  const revisionId = uuidv4();
  const options = buildExportOptionsFromState(ctx.getState());
  const projectData = buildProjectData({ ...options, revisionId, ...(titleOverride ? { title: titleOverride } : {}) });
  return { revisionId, projectData };
};

const toBlob = async (projectData: ProjectData, format: SaveFormat): Promise<Blob> =>
  format === 'zip'
    ? serializeToZip(uuidv4(), projectData)
    : new Blob([await buildProjectHtml(projectData)], { type: 'text/html' });

// 書けたあとの共通処理。state の版を進めてから下書きを保存済みにするので、
// 下書きの中身・版は書いたファイルと同じになる。
const commitSaved = (ctx: SaveContext, revisionId: string, titleOverride?: string) => {
  const { dispatch } = ctx;
  if (titleOverride) dispatch(setTitle(titleOverride));
  dispatch(setRevisionId(revisionId));
  void draftSession.markSaved();
  dispatch(setIsSavedChangesStore(true));
  dispatch(setIsSavedChangesColor(true));
  dispatch(setIsSavedChangesNotes(true));
  dispatch(setIsSavedChangesSettings(true));
  // 閲覧モードで保存したら、この先も手を入れるものとして編集モードにする
  dispatch(setViewMode(false));
};

// 保存済みファイルに入っているプロジェクトの ID と版の ID を読む(読めなければ null)
export const readSavedFileIds = async (
  file: Blob, format: SaveFormat
): Promise<{ projectId: string; revisionId: string } | null> => {
  if (file.size === 0) return null;
  try {
    let data: Partial<ProjectData> | null;
    if (format === 'zip') {
      const zip = await JSZip.loadAsync(await file.arrayBuffer());
      const entry = Object.values(zip.files).find((f) => f.name.endsWith('.json'));
      data = entry ? JSON.parse(await entry.async('string')) as Partial<ProjectData> : null;
    } else {
      data = readEmbeddedProjectDataFromHtml(await file.text());
    }
    if (!data) return null;
    return { projectId: data.projectId ?? '', revisionId: data.revisionId ?? '' };
  } catch {
    return null;
  }
};

// 保存先が、開いたあとに同じプロジェクトの別の版で保存されていないか。されていたら尋ねる。
const confirmTargetIsCurrent = async (ctx: SaveContext, handle: FileSystemFileHandle): Promise<boolean> => {
  const ids = await readSavedFileIds(await handle.getFile(), formatOfFileName(handle.name));
  const { projectId, revisionId } = ctx.getState().baseSettings;
  if (!ids || ids.projectId !== projectId || ids.revisionId === revisionId) return true;
  return ctx.confirmOverwrite(handle.name);
};

const ensureWritePermission = async (handle: WritableFileHandle): Promise<boolean> => {
  if (!handle.queryPermission || !handle.requestPermission) return true;
  if (await handle.queryPermission({ mode: 'readwrite' }) === 'granted') return true;
  return await handle.requestPermission({ mode: 'readwrite' }) === 'granted';
};

const writeToHandle = async (ctx: SaveContext, handle: WritableFileHandle): Promise<SaveOutcome> => {
  if (!await confirmTargetIsCurrent(ctx, handle)) return { status: 'cancelled' };
  const { revisionId, projectData } = prepare(ctx);
  const blob = await toBlob(projectData, formatOfFileName(handle.name));
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();

  const { projectId } = ctx.getState().baseSettings;
  currentTarget = { projectId, handle };
  await storeSavedFileHandle({ projectId, handle, savedAt: Date.now() }).catch((error) => {
    console.warn('Could not remember the save destination:', error);
  });
  commitSaved(ctx, revisionId);
  return { status: 'saved', fileName: handle.name, method: 'file' };
};

const exclusive = async (task: () => Promise<SaveOutcome>): Promise<SaveOutcome> => {
  if (saving) return { status: 'cancelled' };
  saving = true;
  try {
    return await task();
  } finally {
    saving = false;
  }
};

// 名前を付けて保存。保存先を選んでもらい、拡張子(.html / .zip)で形式を決める。
const saveAsUnlocked = async (ctx: SaveContext): Promise<SaveOutcome> => {
  const picker = getSavePicker();
  if (!picker) return downloadHtmlUnlocked(ctx);
  const { title, projectId } = ctx.getState().baseSettings;
  const page = pageFileName();
  const suggestedName = page && readEmbeddedProjectData() && /\.html?$/i.test(page) ? page : htmlFileNameForTitle(title);
  let handle: FileSystemFileHandle;
  try {
    handle = await picker({
      suggestedName,
      types: [
        { description: 'Gantty HTML', accept: { 'text/html': ['.html'] } },
        { description: 'Gantty project ZIP', accept: { 'application/zip': ['.zip'] } },
      ],
      ...(currentTarget?.projectId === projectId ? { startIn: currentTarget.handle } : {}),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return { status: 'cancelled' };
    throw error;
  }
  return writeToHandle(ctx, handle as WritableFileHandle);
};

export const saveProjectAs = (ctx: SaveContext): Promise<SaveOutcome> => exclusive(() => saveAsUnlocked(ctx));

// 上書き保存。このプロジェクトを前に保存したファイルがあればそこへ、無ければ保存先を尋ねる。
export const saveProject = (ctx: SaveContext): Promise<SaveOutcome> => exclusive(async () => {
  if (!getSavePicker()) return downloadHtmlUnlocked(ctx);
  const { projectId } = ctx.getState().baseSettings;
  let handle: WritableFileHandle | null = currentTarget?.projectId === projectId ? currentTarget.handle : null;
  if (!handle) {
    const stored = await loadSavedFileHandle(projectId).catch(() => undefined);
    const page = pageFileName();
    // 書き出した HTML を直接開いているのに、覚えている保存先と名前が違う(複製したファイルを
    // 開いている、など)ときは、元のファイルを黙って上書きしないよう保存先を尋ね直す。
    const pageIsProjectFile = page !== null && readEmbeddedProjectData() !== null;
    if (stored && !(pageIsProjectFile && stored.handle.name !== page)) {
      handle = stored.handle as WritableFileHandle;
    }
  }
  if (!handle) return saveAsUnlocked(ctx);
  if (!await ensureWritePermission(handle)) return saveAsUnlocked(ctx);
  return writeToHandle(ctx, handle);
});

const downloadHtmlUnlocked = async (ctx: SaveContext): Promise<SaveOutcome> => {
  const { revisionId, projectData } = prepare(ctx);
  const fileName = htmlFileNameForTitle(projectData.title);
  downloadBlob(await toBlob(projectData, 'html'), fileName);
  commitSaved(ctx, revisionId);
  return { status: 'saved', fileName, method: 'download' };
};

// ファイル > エクスポート > HTML。書き出した HTML を作業ファイルとして使うので、これも保存として扱う。
export const downloadProjectHtml = (ctx: SaveContext): Promise<SaveOutcome> => exclusive(() => downloadHtmlUnlocked(ctx));

// ファイル > プロジェクト ZIP のダウンロード(名前を変えるときは titleOverride)
export const downloadProjectZip = (ctx: SaveContext, titleOverride?: string): Promise<SaveOutcome> => exclusive(async () => {
  const { revisionId, projectData } = prepare(ctx, titleOverride);
  const fileName = `${projectData.title || 'gantt-chart'}.zip`;
  downloadBlob(await toBlob(projectData, 'zip'), fileName);
  commitSaved(ctx, revisionId, titleOverride);
  return { status: 'saved', fileName, method: 'download' };
});
