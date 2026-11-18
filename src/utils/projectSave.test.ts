import JSZip from 'jszip';
import { store } from '../reduxStoreAndSlices/store';
import { setIsSavedChangesStore } from '../reduxStoreAndSlices/store';
import { setProjectId, setRevisionId, setTitle } from '../reduxStoreAndSlices/baseSettingsSlice';
import { isAllSaved } from './draftSession';
import { readEmbeddedProjectDataFromHtml } from './HtmlSnapshotExport';
import { formatOfFileName, readSavedFileIds, saveProject, saveProjectAs, SaveContext } from './projectSave';

jest.mock('i18next', () => ({
  __esModule: true,
  default: { changeLanguage: jest.fn(), t: (key: string) => key },
  t: (key: string) => key,
}));

// showSaveFilePicker が返すファイルハンドルの代わり。書いた内容を覚える。
const makeHandle = (name: string, initial = '') => {
  const handle = {
    kind: 'file' as const,
    name,
    content: new Blob([initial]),
    writes: 0,
    getFile: async () => handle.content,
    createWritable: async () => ({
      write: async (blob: Blob) => { handle.content = blob; },
      close: async () => { handle.writes += 1; },
    }),
    queryPermission: jest.fn(async () => 'granted' as PermissionState),
    requestPermission: jest.fn(async () => 'granted' as PermissionState),
  };
  return handle;
};

type FakeHandle = ReturnType<typeof makeHandle>;

const setPicker = (impl: (() => Promise<FakeHandle>) | undefined) => {
  Object.defineProperty(window, 'showSaveFilePicker', { value: impl, configurable: true, writable: true });
};

const makeContext = (confirmOverwrite = jest.fn(() => true)): SaveContext & { confirmOverwrite: jest.Mock } => ({
  getState: store.getState,
  dispatch: store.dispatch,
  confirmOverwrite,
});

const writtenProject = async (handle: FakeHandle) => readEmbeddedProjectDataFromHtml(await handle.content.text());

describe('formatOfFileName', () => {
  it('chooses ZIP only for .zip files', () => {
    expect(formatOfFileName('plan.zip')).toBe('zip');
    expect(formatOfFileName('plan.ZIP')).toBe('zip');
    expect(formatOfFileName('plan.html')).toBe('html');
  });
});

describe('readSavedFileIds', () => {
  it('reads the ids from an exported HTML file', async () => {
    const html = '<html><head><script id="gantt-embedded-project-data" type="application/json">'
      + JSON.stringify({ projectId: 'p', revisionId: 'r', title: 'x\u003c/script' })
      + '</script></head></html>';
    expect(await readSavedFileIds(new Blob([html]), 'html')).toEqual({ projectId: 'p', revisionId: 'r' });
  });

  it('reads the ids from a project ZIP', async () => {
    const zip = new JSZip();
    zip.file('a.json', JSON.stringify({ projectId: 'p', revisionId: 'r' }));
    const blob = await zip.generateAsync({ type: 'blob' });
    expect(await readSavedFileIds(blob, 'zip')).toEqual({ projectId: 'p', revisionId: 'r' });
  });

  it('returns null for empty or unrelated files', async () => {
    expect(await readSavedFileIds(new Blob([]), 'html')).toBeNull();
    expect(await readSavedFileIds(new Blob(['<html></html>']), 'html')).toBeNull();
    expect(await readSavedFileIds(new Blob(['not a zip']), 'zip')).toBeNull();
  });
});

describe('saveProject / saveProjectAs', () => {
  let projectCounter = 0;

  beforeEach(() => {
    // 上書き先はプロジェクトごとに覚えるので、テストごとに別のプロジェクトにする
    projectCounter += 1;
    store.dispatch(setProjectId(`save-test-${projectCounter}`));
    store.dispatch(setRevisionId(''));
    store.dispatch(setTitle(`Plan ${projectCounter}`));
    store.dispatch(setIsSavedChangesStore(false));
  });

  afterEach(() => setPicker(undefined));

  it('asks for a destination the first time, then overwrites it without asking', async () => {
    const handle = makeHandle('plan.html');
    const picker = jest.fn(async () => handle);
    setPicker(picker);
    const ctx = makeContext();

    expect(await saveProject(ctx)).toEqual({ status: 'saved', fileName: 'plan.html', method: 'file' });
    expect(picker).toHaveBeenCalledTimes(1);
    const firstRevision = store.getState().baseSettings.revisionId;
    expect(firstRevision).not.toBe('');
    expect(isAllSaved(store.getState())).toBe(true);
    expect((await writtenProject(handle))?.revisionId).toBe(firstRevision);

    store.dispatch(setTitle('Changed'));
    expect(await saveProject(ctx)).toMatchObject({ status: 'saved', method: 'file' });
    expect(picker).toHaveBeenCalledTimes(1);
    expect(handle.writes).toBe(2);
    const written = await writtenProject(handle);
    expect(written?.title).toBe('Changed');
    expect(written?.revisionId).toBe(store.getState().baseSettings.revisionId);
    expect(written?.revisionId).not.toBe(firstRevision);
    expect(ctx.confirmOverwrite).not.toHaveBeenCalled();
  });

  it('asks before overwriting a file that was saved with another revision since it was opened', async () => {
    const { projectId } = store.getState().baseSettings;
    store.dispatch(setRevisionId('opened-revision'));
    const html = `<script id="gantt-embedded-project-data" type="application/json">${JSON.stringify({ projectId, revisionId: 'someone-elses' })}</script>`;
    const handle = makeHandle('plan.html', html);
    setPicker(async () => handle);

    const declined = makeContext(jest.fn(() => false));
    expect(await saveProjectAs(declined)).toEqual({ status: 'cancelled' });
    expect(declined.confirmOverwrite).toHaveBeenCalledWith('plan.html');
    expect(handle.writes).toBe(0);
    expect(isAllSaved(store.getState())).toBe(false);
    expect(store.getState().baseSettings.revisionId).toBe('opened-revision');

    const accepted = makeContext(jest.fn(() => true));
    expect(await saveProjectAs(accepted)).toMatchObject({ status: 'saved' });
    expect(handle.writes).toBe(1);
  });

  it('does not ask when the file holds the revision that was opened', async () => {
    const { projectId } = store.getState().baseSettings;
    store.dispatch(setRevisionId('opened-revision'));
    const html = `<script id="gantt-embedded-project-data" type="application/json">${JSON.stringify({ projectId, revisionId: 'opened-revision' })}</script>`;
    const handle = makeHandle('plan.html', html);
    setPicker(async () => handle);
    const ctx = makeContext();
    expect(await saveProjectAs(ctx)).toMatchObject({ status: 'saved' });
    expect(ctx.confirmOverwrite).not.toHaveBeenCalled();
  });

  it('writes a ZIP when a .zip file is chosen', async () => {
    const handle = makeHandle('plan.zip');
    setPicker(async () => handle);
    await saveProjectAs(makeContext());
    expect(await readSavedFileIds(handle.content, 'zip')).toEqual({
      projectId: store.getState().baseSettings.projectId,
      revisionId: store.getState().baseSettings.revisionId,
    });
  });

  it('changes nothing when the file picker is cancelled', async () => {
    setPicker(async () => { throw new DOMException('cancelled', 'AbortError'); });
    expect(await saveProjectAs(makeContext())).toEqual({ status: 'cancelled' });
    expect(isAllSaved(store.getState())).toBe(false);
    expect(store.getState().baseSettings.revisionId).toBe('');
  });
});
