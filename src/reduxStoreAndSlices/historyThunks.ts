import { createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from './store';
import { startViewingPast, returnToPresent } from './historySlice';
import { setEntireData, setColumns, updateHolidayColor, updateEntireRegularDaysOffSetting, setShowYear, setDateFormat } from './store';
import { updateEntireColorSettings } from './colorSlice';
import { setDateRange, setTitle, setCellWidth, setWbsWidth, setCalendarWidth, setHolidayInput, setLanguage, setScrollPosition } from './baseSettingsSlice';
import { setNotes } from './notesSlice';
import { createStateBackup, parseBackupData } from '../utils/StateBackupUtils';
import { isCompressedData, decompressData } from '../utils/CompressionUtils';

// 履歴表示開始（バックアップ付き）
export const startViewingPastWithBackup = createAsyncThunk(
  'history/startViewingPastWithBackup',
  async (snapshotId: string, { dispatch, getState }) => {
    const state = getState() as RootState;
    
    // 現在の状態をバックアップとして保存
    const currentStateBackup = createStateBackup(state);
    
    // スナップショットを見つける
    const snapshot = state.history.snapshots.find(s => s.id === snapshotId);
    if (!snapshot) {
      console.error('Snapshot not found:', snapshotId);
      return;
    }
    
    try {
      let previewData: any;
      
      // 圧縮データかどうかをチェック
      if (isCompressedData(snapshot.projectDataSnapshot)) {
        // 圧縮データを展開
        const jsonString = await decompressData(snapshot.projectDataSnapshot);
        previewData = JSON.parse(jsonString);
      } else {
        // 文字列データ（後方互換）
        previewData = JSON.parse(snapshot.projectDataSnapshot as string);
      }
      
      dispatch(startViewingPast({ 
        snapshotId, 
        currentStateBackup, 
        previewData 
      }));
    } catch (error) {
      console.error('Failed to load snapshot data:', error);
      // エラーの場合はプレビューデータなしで実行
      dispatch(startViewingPast({ snapshotId, currentStateBackup }));
    }
  }
);

// 最新状態に戻る（バックアップから復元）
export const returnToPresentWithRestore = createAsyncThunk(
  'history/returnToPresentWithRestore',
  async (_, { dispatch, getState }) => {
    const state = getState() as RootState;
    
    if (state.history.backupSnapshot) {
      const backupData = parseBackupData(state.history.backupSnapshot);
      
      if (backupData) {
        // バックアップから各状態を復元
        dispatch(setEntireData(backupData.data));
        dispatch(setColumns(backupData.columns));
        dispatch(updateEntireColorSettings(backupData.colors));
        dispatch(setDateRange(backupData.dateRange));
        dispatch(setTitle(backupData.title));
        dispatch(setCellWidth(backupData.cellWidth));
        dispatch(setWbsWidth(backupData.wbsWidth));
        dispatch(setCalendarWidth(backupData.calendarWidth));
        dispatch(setHolidayInput(backupData.holidayInput));
        dispatch(updateHolidayColor(backupData.holidayColor?.color || '#000000'));
        dispatch(updateEntireRegularDaysOffSetting(backupData.regularDaysOffSetting));
        dispatch(setShowYear(backupData.showYear));
        dispatch(setDateFormat(backupData.dateFormat as any));
        dispatch(setNotes({
          treeData: backupData.treeData,
          noteData: backupData.noteData,
          modalState: backupData.modalState,
          selectedNodeKey: backupData.selectedNodeKey,
          treeExpandedKeys: backupData.treeExpandedKeys,
          treeScrollPosition: backupData.treeScrollPosition,
          editorStates: backupData.editorStates
        }));
        dispatch(setLanguage(backupData.language));
        dispatch(setScrollPosition(backupData.scrollPosition));
      } else {
        // TODO: Implement proper error reporting system
        console.error('Failed to restore from backup: Invalid backup data');
        // Could dispatch an error action here for user notification
      }
    }
    
    dispatch(returnToPresent());
  }
);