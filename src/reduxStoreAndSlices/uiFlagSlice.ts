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
  // クリティカルパス(cpPredecessors ネットワークから算出)の強調表示トグル。
  // 表示専用のフラグなので保存ファイルには含めない。
  showCriticalPath: boolean;
  // チャート注釈の表示トグル。注釈自体はプロジェクトデータだが、「編集中は消して
  // おきたい」ための表示切替なので、CP 表示と同じくファイルには含めない。
  showAnnotations: boolean;
  // 選択中の注釈(編集ハンドルを出す対象)。純粋なUI状態なので保存しない。
  selectedAnnotationId: string;
  // チャートバーの複数選択(一括移動の対象行)。表示順を保つため配列で持つ。
  // 純粋なUI状態なので保存もundoもしない(selectedAnnotationId と同じ扱い)。
  selectedBarRowIds: string[];
  // Ctrl+Shift+クリックの範囲選択の起点。直前に単独で選び直した行を覚えておく。
  lastSelectedBarRowId: string | null;
  // バーの選択モード。ONの間はチャートの空白ドラッグがパンではなく矩形選択になる。
  isBarSelectionMode: boolean;
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
  showCriticalPath: false,
  showAnnotations: true,
  selectedAnnotationId: '',
  selectedBarRowIds: [],
  lastSelectedBarRowId: null,
  isBarSelectionMode: false,
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
    setShowCriticalPath(state, action: PayloadAction<boolean>) {
      state.showCriticalPath = action.payload;
    },
    setShowAnnotations(state, action: PayloadAction<boolean>) {
      state.showAnnotations = action.payload;
    },
    setSelectedAnnotationId(state, action: PayloadAction<string>) {
      state.selectedAnnotationId = action.payload;
    },
    // 一括移動の選択。anchor は Ctrl+Shift+クリックの起点で、範囲選択のときは
    // 起点を動かさないので undefined を渡して現状維持にする。
    setSelectedBarRows(state, action: PayloadAction<{ rowIds: string[]; anchorRowId?: string | null }>) {
      const { rowIds, anchorRowId } = action.payload;
      state.selectedBarRowIds = rowIds;
      if (anchorRowId !== undefined) {
        state.lastSelectedBarRowId = anchorRowId;
      }
    },
    toggleSelectedBarRow(state, action: PayloadAction<string>) {
      const rowId = action.payload;
      if (state.selectedBarRowIds.includes(rowId)) {
        state.selectedBarRowIds = state.selectedBarRowIds.filter(id => id !== rowId);
        // 外した行は起点として残さない(次の範囲選択の基準が消えた行になるのを防ぐ)
        if (state.lastSelectedBarRowId === rowId) {
          state.lastSelectedBarRowId = state.selectedBarRowIds[state.selectedBarRowIds.length - 1] ?? null;
        }
      } else {
        state.selectedBarRowIds.push(rowId);
        state.lastSelectedBarRowId = rowId;
      }
    },
    setBarSelectionMode(state, action: PayloadAction<boolean>) {
      state.isBarSelectionMode = action.payload;
      // モードを抜けるときは選択も畳む(選択だけ残って一括移動が暴発するのを防ぐ)
      if (!action.payload) {
        state.selectedBarRowIds = [];
        state.lastSelectedBarRowId = null;
      }
    },
    clearSelectedBarRows(state) {
      if (state.selectedBarRowIds.length > 0) {
        state.selectedBarRowIds = [];
      }
      state.lastSelectedBarRowId = null;
    },
    // 行削除・インポート・undo のあとに、もう存在しない行を選択から落とす。
    pruneSelectedBarRows(state, action: PayloadAction<string[]>) {
      const existingIds = new Set(action.payload);
      const pruned = state.selectedBarRowIds.filter(id => existingIds.has(id));
      if (pruned.length !== state.selectedBarRowIds.length) {
        state.selectedBarRowIds = pruned;
      }
      if (state.lastSelectedBarRowId && !existingIds.has(state.lastSelectedBarRowId)) {
        state.lastSelectedBarRowId = null;
      }
    },
  },
});

export const { setActiveModal, setIsContextMenuOpen, setIsLoading, setIsExporting, setIsDependencyEditing, setDependencyTargetRowId, setDependencySourceRowId, setDependencyChainRowIds, openDependencyBuilder, closeDependencyBuilder, setShowCriticalPath, setShowAnnotations, setSelectedAnnotationId, setSelectedBarRows, toggleSelectedBarRow, clearSelectedBarRows, pruneSelectedBarRows, setBarSelectionMode } = uiFlagsSlice.actions;
export default uiFlagsSlice.reducer;
