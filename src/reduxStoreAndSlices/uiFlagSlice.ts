// uiFlagsSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface UIFlagsState {
  activeModal: string | null;
  isContextMenuOpen: boolean;
  isLoading: boolean;
  // When true, the Gantt renders every row at full content size (no virtualization)
  // so the whole chart can be captured as an image for PDF export.
  isExporting: boolean;
  // True while the dependency builder popover is open. Used to suppress the chart
  // crosshair indicators while editing a dependency.
  isDependencyEditing: boolean;
  // Row id that the dependency being edited currently points to (for chart highlight).
  dependencyTargetRowId: string | null;
  // Row id being edited (the dependent / source side) for chart highlight.
  dependencySourceRowId: string | null;
  // Every other row that moves together with the edited row (the connected
  // dependency chain, both upstream and downstream), for a lighter chart frame.
  dependencyChainRowIds: string[];
  // When set, the dependency builder is open as a floating popover on the chart
  // (opened from the chart's right-click menu) at the given viewport coordinates.
  dependencyBuilder: { rowId: string; x: number; y: number } | null;
}

const initialState: UIFlagsState = {
  activeModal: null,
  isContextMenuOpen: false,
  isLoading: true,
  isExporting: false,
  isDependencyEditing: false,
  dependencyTargetRowId: null,
  dependencySourceRowId: null,
  dependencyChainRowIds: [],
  dependencyBuilder: null,
};

const uiFlagsSlice = createSlice({
  name: "uiFlags",
  initialState,
  reducers: {
    setActiveModal(state, action: PayloadAction<string | null>) {
      if (state.activeModal === action.payload && action.payload !== 'welcome') {
        state.activeModal = null;
      } else {
        state.activeModal = action.payload;
      }
    },
    setIsContextMenuOpen(state, action: PayloadAction<boolean>) {
      state.isContextMenuOpen = action.payload;
    },
    setIsLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setIsExporting(state, action: PayloadAction<boolean>) {
      state.isExporting = action.payload;
    },
    setIsDependencyEditing(state, action: PayloadAction<boolean>) {
      state.isDependencyEditing = action.payload;
    },
    setDependencyTargetRowId(state, action: PayloadAction<string | null>) {
      state.dependencyTargetRowId = action.payload;
    },
    setDependencySourceRowId(state, action: PayloadAction<string | null>) {
      state.dependencySourceRowId = action.payload;
    },
    setDependencyChainRowIds(state, action: PayloadAction<string[]>) {
      state.dependencyChainRowIds = action.payload;
    },
    openDependencyBuilder(state, action: PayloadAction<{ rowId: string; x: number; y: number }>) {
      state.dependencyBuilder = action.payload;
    },
    closeDependencyBuilder(state) {
      state.dependencyBuilder = null;
    },
  },
});

export const { setActiveModal, setIsContextMenuOpen, setIsLoading, setIsExporting, setIsDependencyEditing, setDependencyTargetRowId, setDependencySourceRowId, setDependencyChainRowIds, openDependencyBuilder, closeDependencyBuilder } = uiFlagsSlice.actions;
export default uiFlagsSlice.reducer;
