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
  // チャートバーの複数選択(一括移動の対象)。選択は行ではなく **バー単位** で、
  // `<行ID>|planned` / `<行ID>|actual` のキーで持つ。予定バーを選んでも実績バーは
  // 選ばれない(別物として扱う)。表示順を保つため配列。
  // 純粋なUI状態なので保存もundoもしない(selectedAnnotationId と同じ扱い)。
  selectedBarKeys: string[];
  // Shift+クリックの範囲選択の起点。直前に単独で選び直したバーを覚えておく。
  lastSelectedBarKey: string | null;
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
  selectedBarKeys: [],
  lastSelectedBarKey: null,
  isBarSelectionMode: false,
};

/** 選択キーの組み立て/分解。予定バーと実績バーを別々に選べるようにするためのキー。 */
export type BarType = 'planned' | 'actual';
export const barKeyOf = (rowId: string, barType: BarType) => `${rowId}|${barType}`;
export const rowIdOfBarKey = (barKey: string) => barKey.slice(0, barKey.lastIndexOf('|'));
export const barTypeOfBarKey = (barKey: string) => barKey.slice(barKey.lastIndexOf('|') + 1) as BarType;

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
    // 一括移動の選択。anchor は Shift+クリックの起点で、範囲選択のときは
    // 起点を動かさないので undefined を渡して現状維持にする。
    setSelectedBars(state, action: PayloadAction<{ barKeys: string[]; anchorBarKey?: string | null }>) {
      const { barKeys, anchorBarKey } = action.payload;
      state.selectedBarKeys = barKeys;
      if (anchorBarKey !== undefined) {
        state.lastSelectedBarKey = anchorBarKey;
      }
    },
    toggleSelectedBar(state, action: PayloadAction<string>) {
      const barKey = action.payload;
      if (state.selectedBarKeys.includes(barKey)) {
        state.selectedBarKeys = state.selectedBarKeys.filter(key => key !== barKey);
        // 外したバーは起点として残さない(次の範囲選択の基準が消えたバーになるのを防ぐ)
        if (state.lastSelectedBarKey === barKey) {
          state.lastSelectedBarKey = state.selectedBarKeys[state.selectedBarKeys.length - 1] ?? null;
        }
      } else {
        state.selectedBarKeys.push(barKey);
        state.lastSelectedBarKey = barKey;
      }
    },
    clearSelectedBars(state) {
      if (state.selectedBarKeys.length > 0) {
        state.selectedBarKeys = [];
      }
      state.lastSelectedBarKey = null;
    },
    setBarSelectionMode(state, action: PayloadAction<boolean>) {
      state.isBarSelectionMode = action.payload;
      // モードを抜けるときは選択も畳む(選択だけ残って一括移動が暴発するのを防ぐ)
      if (!action.payload) {
        state.selectedBarKeys = [];
        state.lastSelectedBarKey = null;
      }
    },
    // 行削除・インポート・undo のあとに、もう存在しない行のバーを選択から落とす。
    pruneSelectedBars(state, action: PayloadAction<string[]>) {
      const existingIds = new Set(action.payload);
      const rowIdOf = (barKey: string) => barKey.slice(0, barKey.lastIndexOf('|'));
      const pruned = state.selectedBarKeys.filter(key => existingIds.has(rowIdOf(key)));
      if (pruned.length !== state.selectedBarKeys.length) {
        state.selectedBarKeys = pruned;
      }
      if (state.lastSelectedBarKey && !existingIds.has(rowIdOf(state.lastSelectedBarKey))) {
        state.lastSelectedBarKey = null;
      }
    },
  },
});

export const { setActiveModal, setIsContextMenuOpen, setIsLoading, setIsExporting, setIsDependencyEditing, setDependencyTargetRowId, setDependencySourceRowId, setDependencyChainRowIds, openDependencyBuilder, closeDependencyBuilder, setShowCriticalPath, setShowAnnotations, setSelectedAnnotationId, setSelectedBars, toggleSelectedBar, clearSelectedBars, pruneSelectedBars, setBarSelectionMode } = uiFlagsSlice.actions;
export default uiFlagsSlice.reducer;
