// Session-only manager for open per-row note windows.
//
// Lives outside Redux because this is ephemeral UI state shared across every
// RowNoteButton instance (open/closed, stacking order) that must NOT be captured
// by the undo/redo history. Components subscribe via useSyncExternalStore.

type Listener = () => void;

export const MAX_ROW_NOTE_WINDOWS = 10;

// Stacking order, last element = topmost (Windows-like raise-on-click).
let openIds: string[] = [];
const listeners = new Set<Listener>();

const emit = () => listeners.forEach(l => l());

export const rowNoteWindows = {
  subscribe(l: Listener): () => void {
    listeners.add(l);
    return () => { listeners.delete(l); };
  },
  // Stable reference between emits so useSyncExternalStore can compare snapshots.
  getOpenIds(): string[] {
    return openIds;
  },
  isOpen(id: string): boolean {
    return openIds.includes(id);
  },
  // Stacking index (0 = bottom). -1 when the window is closed.
  indexOf(id: string): number {
    return openIds.indexOf(id);
  },
  // Returns false when the window cap is reached (and this id is not already open).
  open(id: string): boolean {
    if (openIds.includes(id)) {
      this.bringToFront(id);
      return true;
    }
    if (openIds.length >= MAX_ROW_NOTE_WINDOWS) return false;
    openIds = [...openIds, id];
    emit();
    return true;
  },
  close(id: string): void {
    if (!openIds.includes(id)) return;
    openIds = openIds.filter(x => x !== id);
    emit();
  },
  bringToFront(id: string): void {
    if (!openIds.includes(id) || openIds[openIds.length - 1] === id) return;
    openIds = [...openIds.filter(x => x !== id), id];
    emit();
  },
};
