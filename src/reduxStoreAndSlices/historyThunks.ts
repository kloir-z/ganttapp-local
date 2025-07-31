import { createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from './store';
import { startViewingPast, returnToPresent } from './historySlice';
import { setEntireData, setColumns, updateEntireRegularDaysOffSetting, setDateFormat } from './store';
import { updateEntireColorSettings, updateFallbackColor } from './colorSlice';
import { setTitle, setHolidayInput } from './baseSettingsSlice';
import { setNotes } from './notesSlice';
import { createStateBackup, parseBackupData } from '../utils/StateBackupUtils';
import { isCompressedData, decompressData } from '../utils/CompressionUtils';
import { parseHolidaysFromInput } from '../components/Setting/utils/settingHelpers';

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
      
      // holidayInputからholidaysをパースして追加
      if (previewData.holidayInput && previewData.dateFormat) {
        previewData.holidays = parseHolidaysFromInput(previewData.holidayInput, previewData.dateFormat);
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
        if (backupData.fallbackColor) {
          dispatch(updateFallbackColor(backupData.fallbackColor));
        }
        dispatch(setTitle(backupData.title));
        dispatch(setHolidayInput(backupData.holidayInput));
        dispatch(updateEntireRegularDaysOffSetting(backupData.regularDaysOffSetting));
        dispatch(setDateFormat(backupData.dateFormat as any));
        dispatch(setNotes({
          treeData: backupData.treeData,
          noteData: backupData.noteData,
        }));
      } else {
        // TODO: Implement proper error reporting system
        console.error('Failed to restore from backup: Invalid backup data');
        // Could dispatch an error action here for user notification
      }
    }
    
    dispatch(returnToPresent());
  }
);

