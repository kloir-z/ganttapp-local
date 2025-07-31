import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CompressedData } from '../utils/CompressionUtils';

export interface HistorySnapshot {
  id: string;
  timestamp: number;
  commitMessage: string;
  projectDataSnapshot: string | CompressedData; // 圧縮データまたは文字列（後方互換）
}

interface HistoryState {
  snapshots: HistorySnapshot[];
  currentSnapshotId: string | null;
  maxSnapshots: number;
  isViewingPast: boolean; // 過去の状態を閲覧中かどうか
  viewingSnapshotId: string | null; // 現在閲覧中のスナップショットID
  previewData: {
    data?: Record<string, any>;
    columns?: any[];
    colors?: any;
    fallbackColor?: string;
    dateRange?: any;
    title?: string;
    cellWidth?: number;
    wbsWidth?: number;
    calendarWidth?: number;
    holidayInput?: any;
    holidays?: any;
    holidayColor?: any;
    regularDaysOffSetting?: any;
    showYear?: boolean;
    dateFormat?: string;
    treeData?: any;
    noteData?: any;
    notesModalState?: any;
    selectedNodeKey?: string;
    treeExpandedKeys?: any;
    treeScrollPosition?: number;
    editorStates?: any;
    language?: string;
    scrollPosition?: any;
  } | null; // 一時的なプレビューデータ（パフォーマンス最適化のため）
  tempModalState: {
    position?: { x: number; y: number };
    noteWidth?: number;
    noteHeight?: number;
    treeWidth?: number;
  } | null; // 履歴閲覧中の一時的なモーダル状態
  backupSnapshot: string | null; // 履歴表示開始時の現在状態のバックアップ
}

const initialState: HistoryState = {
  snapshots: [],
  currentSnapshotId: null,
  maxSnapshots: 30,
  isViewingPast: false,
  viewingSnapshotId: null,
  previewData: null,
  tempModalState: null,
  backupSnapshot: null,
};

const historySlice = createSlice({
  name: 'history',
  initialState,
  reducers: {
    addSnapshot: (state, action: PayloadAction<{ commitMessage: string; projectDataSnapshot: string | CompressedData }>) => {
      const newSnapshot: HistorySnapshot = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        commitMessage: action.payload.commitMessage,
        projectDataSnapshot: action.payload.projectDataSnapshot,
      };

      state.snapshots.unshift(newSnapshot);
      
      // Keep only maxSnapshots
      if (state.snapshots.length > state.maxSnapshots) {
        state.snapshots = state.snapshots.slice(0, state.maxSnapshots);
      }
      
      state.currentSnapshotId = newSnapshot.id;
    },
    
    setCurrentSnapshot: (state, action: PayloadAction<string>) => {
      state.currentSnapshotId = action.payload;
    },
    
    clearHistory: (state) => {
      state.snapshots = [];
      state.currentSnapshotId = null;
    },
    
    importHistory: (state, action: PayloadAction<HistorySnapshot[]>) => {
      state.snapshots = action.payload;
      state.currentSnapshotId = null;
    },
    
    // 過去の状態を閲覧開始（バックアップ付き）
    startViewingPast: (state, action: PayloadAction<{ snapshotId: string; currentStateBackup: string; previewData?: any }>) => {
      const snapshot = state.snapshots.find(s => s.id === action.payload.snapshotId);
      if (snapshot) {
        // 現在の状態をバックアップとして保存
        state.backupSnapshot = action.payload.currentStateBackup;
        
        // プレビューデータが提供されている場合はそれを使用（非同期処理済み）
        if (action.payload.previewData) {
          state.previewData = action.payload.previewData;
          state.isViewingPast = true;
          state.viewingSnapshotId = action.payload.snapshotId;
        } else {
          // フォールバック: 文字列データの場合
          try {
            if (typeof snapshot.projectDataSnapshot === 'string') {
              state.previewData = JSON.parse(snapshot.projectDataSnapshot);
              state.isViewingPast = true;
              state.viewingSnapshotId = action.payload.snapshotId;
            }
          } catch (error) {
            // TODO: Implement proper error reporting system
            console.error('Failed to parse snapshot data:', error);
            // Could dispatch an error action here for user notification
          }
        }
      }
    },
    
    // 履歴閲覧中の一時的なモーダル状態を更新
    updateTempModalState: (state, action: PayloadAction<Partial<{
      position: { x: number; y: number };
      noteWidth: number;
      noteHeight: number;
      treeWidth: number;
    }>>) => {
      if (state.isViewingPast) {
        state.tempModalState = {
          ...state.tempModalState,
          ...action.payload,
        };
      }
    },
    
    // 最新の状態に戻る（バックアップから復元）
    returnToPresent: (state) => {
      state.isViewingPast = false;
      state.viewingSnapshotId = null;
      state.previewData = null;
      state.tempModalState = null;
      // バックアップをクリア（復元は別のthunkで行う）
      state.backupSnapshot = null;
    },

    // スナップショットを削除
    deleteSnapshot: (state, action: PayloadAction<string>) => {
      const snapshotId = action.payload;
      const index = state.snapshots.findIndex(s => s.id === snapshotId);
      
      if (index !== -1) {
        state.snapshots.splice(index, 1);
        
        // 削除されたスナップショットが現在のものだった場合、クリア
        if (state.currentSnapshotId === snapshotId) {
          state.currentSnapshotId = null;
        }
        
        // 削除されたスナップショットを表示中だった場合、表示を終了
        if (state.viewingSnapshotId === snapshotId) {
          state.isViewingPast = false;
          state.viewingSnapshotId = null;
          state.previewData = null;
          state.tempModalState = null;
        }
      }
    },
  },
});

export const { addSnapshot, setCurrentSnapshot, clearHistory, importHistory, startViewingPast, returnToPresent, updateTempModalState, deleteSnapshot } = historySlice.actions;
export default historySlice.reducer;