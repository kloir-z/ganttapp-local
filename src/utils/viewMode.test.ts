import { decideInitialViewMode, readRememberedViewMode, rememberViewMode } from './viewMode';

const base = { hasEmbeddedData: true, rememberedViewMode: null, hasSavedFileHandle: false, hasDirtyDraft: false };

describe('decideInitialViewMode', () => {
  it('opens the app itself (no embedded data) for editing', () => {
    expect(decideInitialViewMode({ ...base, hasEmbeddedData: false, rememberedViewMode: true })).toBe(false);
  });

  it('opens an exported HTML this browser never saved in view mode', () => {
    expect(decideInitialViewMode(base)).toBe(true);
  });

  it('opens it for editing when this browser saved it before or has unsaved edits of it', () => {
    expect(decideInitialViewMode({ ...base, hasSavedFileHandle: true })).toBe(false);
    expect(decideInitialViewMode({ ...base, hasDirtyDraft: true })).toBe(false);
  });

  it('keeps the mode chosen in this tab across a reload', () => {
    expect(decideInitialViewMode({ ...base, rememberedViewMode: false })).toBe(false);
    expect(decideInitialViewMode({ ...base, hasSavedFileHandle: true, rememberedViewMode: true })).toBe(true);
  });
});

describe('remembered view mode', () => {
  beforeEach(() => sessionStorage.clear());

  it('is unknown until something is remembered, then round-trips', () => {
    expect(readRememberedViewMode()).toBeNull();
    rememberViewMode(true);
    expect(readRememberedViewMode()).toBe(true);
    rememberViewMode(false);
    expect(readRememberedViewMode()).toBe(false);
  });
});
