// 書き出した HTML(work.html)を file:// で直接開いている場面。覚えておいた保存先の使い方と、
// 名前の違う複製から元のファイルを黙って上書きしないことを確かめる。
// ページのファイル名は SaveContext.pageFileName で渡す(jsdom の URL を file:// にすると、
// Node 20 では localStorage が使えずテストファイルごと読み込めない)。
import { store } from '../reduxStoreAndSlices/store';
import { setIsSavedChangesStore } from '../reduxStoreAndSlices/store';
import { setProjectId, setRevisionId, setTitle } from '../reduxStoreAndSlices/baseSettingsSlice';
import { EMBEDDED_DATA_SCRIPT_ID } from './HtmlSnapshotExport';
import { loadSavedFileHandle } from './draftStorage';
import { saveProject, SaveContext } from './projectSave';

jest.mock('i18next', () => ({
  __esModule: true,
  default: { changeLanguage: jest.fn(), t: (key: string) => key },
  t: (key: string) => key,
}));

jest.mock('./draftStorage', () => ({
  ...jest.requireActual('./draftStorage'),
  loadSavedFileHandle: jest.fn(),
  storeSavedFileHandle: jest.fn(async () => undefined),
}));

const makeHandle = (name: string, permission: PermissionState) => {
  const handle = {
    kind: 'file' as const,
    name,
    content: new Blob(['']),
    writes: 0,
    getFile: async () => handle.content,
    createWritable: async () => ({
      write: async (blob: Blob) => { handle.content = blob; },
      close: async () => { handle.writes += 1; },
    }),
    queryPermission: jest.fn(async () => permission),
    requestPermission: jest.fn(async () => permission),
  };
  return handle;
};

const ctx: SaveContext = { getState: store.getState, dispatch: store.dispatch, confirmOverwrite: () => true, pageFileName: 'work.html' };

const picked = makeHandle('picked.html', 'granted');
const picker = jest.fn(async () => picked);

let counter = 0;
beforeEach(() => {
  counter += 1;
  store.dispatch(setProjectId(`file-url-${counter}`));
  store.dispatch(setRevisionId('r0'));
  store.dispatch(setTitle(`Work ${counter}`));
  store.dispatch(setIsSavedChangesStore(false));
  picker.mockClear();
  picked.writes = 0;
  Object.defineProperty(window, 'showSaveFilePicker', { value: picker, configurable: true, writable: true });
  // このページが書き出した HTML であることを表す埋め込みデータ
  document.getElementById(EMBEDDED_DATA_SCRIPT_ID)?.remove();
  const script = document.createElement('script');
  script.id = EMBEDDED_DATA_SCRIPT_ID;
  script.type = 'application/json';
  script.textContent = '{}';
  document.head.appendChild(script);
});

it('overwrites the remembered file for this page without asking, after the browser grants write access', async () => {
  const remembered = makeHandle('work.html', 'prompt');
  remembered.requestPermission.mockResolvedValue('granted');
  jest.mocked(loadSavedFileHandle).mockResolvedValue({ projectId: 'x', handle: remembered as unknown as FileSystemFileHandle, savedAt: 0 });

  expect(await saveProject(ctx)).toEqual({ status: 'saved', fileName: 'work.html', method: 'file' });
  expect(picker).not.toHaveBeenCalled();
  expect(remembered.requestPermission).toHaveBeenCalledWith({ mode: 'readwrite' });
  expect(remembered.writes).toBe(1);
});

it('asks for a destination when write access is refused', async () => {
  const remembered = makeHandle('work.html', 'denied');
  jest.mocked(loadSavedFileHandle).mockResolvedValue({ projectId: 'x', handle: remembered as unknown as FileSystemFileHandle, savedAt: 0 });

  expect(await saveProject(ctx)).toMatchObject({ status: 'saved', fileName: 'picked.html' });
  expect(picker).toHaveBeenCalledTimes(1);
  expect(remembered.writes).toBe(0);
});

it('does not overwrite the remembered file from a copy with another name', async () => {
  const remembered = makeHandle('original.html', 'granted');
  jest.mocked(loadSavedFileHandle).mockResolvedValue({ projectId: 'x', handle: remembered as unknown as FileSystemFileHandle, savedAt: 0 });

  expect(await saveProject(ctx)).toMatchObject({ status: 'saved', fileName: 'picked.html' });
  expect(remembered.writes).toBe(0);
  // 保存先の候補は、いま開いているファイルの名前
  expect(picker).toHaveBeenCalledWith(expect.objectContaining({ suggestedName: 'work.html' }));
});
