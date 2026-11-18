import { store } from '../reduxStoreAndSlices/store';
import { setIsSavedChangesStore } from '../reduxStoreAndSlices/store';
import { setIsSavedChangesColor } from '../reduxStoreAndSlices/colorSlice';
import { setIsSavedChangesNotes, updateNotesModalState } from '../reduxStoreAndSlices/notesSlice';
import { setIsSavedChangesSettings, setProjectId, setScrollPosition, setTitle } from '../reduxStoreAndSlices/baseSettingsSlice';
import {
  DRAFT_DEBOUNCE_MS,
  DRAFT_MAX_AGE_MS,
  DRAFT_MAX_RECORDS,
  DraftSession,
  hashString,
  isAllSaved,
  projectContentHash,
  projectFromState,
  selectDraftsToPrune,
} from './draftSession';
import { createMemoryDraftStorage, DraftRecord, DraftStorage } from './draftStorage';

jest.mock('i18next', () => ({
  __esModule: true,
  default: { changeLanguage: jest.fn(), t: (key: string) => key },
  t: (key: string) => key,
}));

// jsdom の Blob には text() が無い(ブラウザにはある)。handleImport が使うので、このテストの中だけ補う。
if (!Blob.prototype.text) {
  Blob.prototype.text = function text(this: Blob) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(this);
    });
  };
}

const markAllSaved = () => {
  store.dispatch(setIsSavedChangesStore(true));
  store.dispatch(setIsSavedChangesColor(true));
  store.dispatch(setIsSavedChangesNotes(true));
  store.dispatch(setIsSavedChangesSettings(true));
};

const makeRecord = (overrides: Partial<DraftRecord>): DraftRecord => ({
  draftId: 'd',
  ownerTabId: '',
  status: 'dirty',
  projectId: 'p',
  title: 'T',
  rowCount: 0,
  updatedAt: 0,
  baseHash: null,
  schemaVersion: 2,
  project: projectFromState(store.getState()),
  ...overrides,
});

describe('hashString / projectContentHash', () => {
  it('returns the same hash for the same text and a different one otherwise', () => {
    expect(hashString('abc')).toBe(hashString('abc'));
    expect(hashString('abc')).not.toBe(hashString('abd'));
  });

  it('ignores view-only fields but not the project content', () => {
    const project = projectFromState(store.getState());
    const scrolled = { ...project, scrollPosition: { scrollLeft: 100, scrollTop: 40 }, selectedNodeKey: 'x' };
    expect(projectContentHash(scrolled)).toBe(projectContentHash(project));
    expect(projectContentHash({ ...project, title: project.title + '!' })).not.toBe(projectContentHash(project));
  });
});

describe('selectDraftsToPrune', () => {
  const now = DRAFT_MAX_AGE_MS * 3;

  it('drops expired drafts unless their tab is still open', () => {
    const records = [
      makeRecord({ draftId: 'old', ownerTabId: '', updatedAt: now - DRAFT_MAX_AGE_MS - 1 }),
      makeRecord({ draftId: 'old-live', ownerTabId: 'live', updatedAt: now - DRAFT_MAX_AGE_MS - 1 }),
      makeRecord({ draftId: 'new', ownerTabId: '', updatedAt: now }),
    ];
    expect(selectDraftsToPrune(records, new Set(['live']), now).map((record) => record.draftId)).toEqual(['old']);
  });

  it('keeps only the newest drafts once there are too many', () => {
    const records = Array.from({ length: DRAFT_MAX_RECORDS + 2 }, (_, index) =>
      makeRecord({ draftId: `d${index}`, updatedAt: now - index }));
    expect(selectDraftsToPrune(records, new Set(), now).map((record) => record.draftId))
      .toEqual([`d${DRAFT_MAX_RECORDS}`, `d${DRAFT_MAX_RECORDS + 1}`]);
  });
});

describe('DraftSession', () => {
  let storage: DraftStorage;
  let session: DraftSession;
  let sessionStore: Storage;

  beforeEach(async () => {
    store.dispatch(setTitle('Base'));
    store.dispatch(setProjectId('project-1'));
    markAllSaved();
    storage = createMemoryDraftStorage();
    sessionStore = window.sessionStorage;
    sessionStore.clear();
    session = new DraftSession({ storage, locks: null, sessionStorage: sessionStore, now: () => 1000 });
    await session.start(store);
  });

  afterEach(() => {
    session.stop();
    jest.useRealTimers();
  });

  it('writes a dirty draft with the hash of the last saved state', async () => {
    const baseHash = projectContentHash(projectFromState(store.getState()));
    store.dispatch(setTitle('Edited'));
    expect(isAllSaved(store.getState())).toBe(false);
    await session.flush();

    const records = await storage.list();
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ status: 'dirty', title: 'Edited', projectId: 'project-1', baseHash, ownerTabId: session.tabId });
  });

  it('writes after the debounce delay without an explicit flush', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask'] });
    store.dispatch(setTitle('Debounced'));
    expect(await storage.list()).toHaveLength(0);
    jest.advanceTimersByTime(DRAFT_DEBOUNCE_MS);
    await new Promise(process.nextTick);
    expect((await storage.list()).map((record) => record.title)).toEqual(['Debounced']);
  });

  it('drops the draft when the content goes back to the saved state', async () => {
    store.dispatch(setTitle('Edited'));
    await session.flush();
    store.dispatch(setTitle('Base'));
    await session.flush();
    expect(await storage.list()).toHaveLength(0);
  });

  it('does not write a draft for view-only changes', async () => {
    store.dispatch(updateNotesModalState({ position: { x: 10, y: 20 } }));
    store.dispatch(setScrollPosition({ scrollLeft: 50, scrollTop: 0 }));
    expect(isAllSaved(store.getState())).toBe(false);
    await session.flush();
    expect(await storage.list()).toHaveLength(0);
  });

  it('keeps the draft as downloaded after saving, and comes back to it on undo', async () => {
    store.dispatch(setTitle('Saved'));
    await session.flush();
    await session.markSaved();
    markAllSaved();
    expect((await storage.list())[0]).toMatchObject({ status: 'downloaded', title: 'Saved' });

    store.dispatch(setTitle('After save'));
    await session.flush();
    expect((await storage.list())[0]).toMatchObject({ status: 'dirty', title: 'After save' });

    store.dispatch(setTitle('Saved'));
    await session.flush();
    const records = await storage.list();
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ status: 'downloaded', title: 'Saved' });
  });

  it('releases the draft from the tab on detach and starts a new one afterwards', async () => {
    store.dispatch(setTitle('Project A edits'));
    await session.flush();
    const [first] = await storage.list();

    await session.detach();
    expect(await storage.get(first.draftId)).toMatchObject({ ownerTabId: '', status: 'dirty' });

    markAllSaved();
    store.dispatch(setTitle('Project B edits'));
    await session.flush();
    const records = await storage.list();
    expect(records).toHaveLength(2);
    expect(records.find((record) => record.draftId !== first.draftId)).toMatchObject({ ownerTabId: session.tabId });
  });

  it('restores a dirty draft as unsaved and takes it over', async () => {
    const record = makeRecord({
      draftId: 'orphan',
      ownerTabId: '',
      title: 'From draft',
      project: { ...projectFromState(store.getState()), title: 'From draft' },
      baseHash: 'base',
    });
    await storage.put(record);

    await session.adopt(record);

    expect(store.getState().baseSettings.title).toBe('From draft');
    expect(isAllSaved(store.getState())).toBe(false);
    expect(await storage.get('orphan')).toMatchObject({ ownerTabId: session.tabId });
  });

  it('lists the tab\'s own dirty draft from the previous load separately from the others', async () => {
    store.dispatch(setTitle('Before reload'));
    await session.flush();
    session.stop();

    // 同じタブで再読み込みした(sessionStorage は残る)
    const reloaded = new DraftSession({ storage, locks: null, sessionStorage: sessionStore, now: () => 2000 });
    markAllSaved();
    await reloaded.start(store);
    await storage.put(makeRecord({ draftId: 'closed-tab', ownerTabId: 'gone', updatedAt: 1500 }));

    const { ownDirty, others } = await reloaded.listOtherDrafts();
    expect(ownDirty).toMatchObject({ title: 'Before reload' });
    expect(others.map((record) => record.draftId)).toEqual(['closed-tab']);
    expect(await reloaded.hasDirtyDraftForProject('project-1')).toBe(true);
    reloaded.stop();
  });
});
