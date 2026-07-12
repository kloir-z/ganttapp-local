import { RootState } from '../reduxStoreAndSlices/store';

/**
 * 現在の状態をバックアップ用JSONに変換する
 */
export const createStateBackup = (state: RootState): string => {
  return JSON.stringify({
    data: state.wbsData.data,
    columns: state.wbsData.columns,
    colors: state.color.colors,
    fallbackColor: state.color.fallbackColor,
    colorSchemes: state.color.schemes,
    colorBasisColumn: state.color.basisColumnId,
    title: state.baseSettings.title,
    holidayInput: state.baseSettings.holidayInput,
    regularDaysOffSetting: state.wbsData.regularDaysOffSetting,
    dateFormat: state.wbsData.dateFormat,
    treeData: state.notes.treeData,
    noteData: state.notes.noteData,
    rowNoteData: state.notes.rowNoteData,
  });
};

/**
 * バックアップデータの型定義
 */
export interface BackupData {
  data: Record<string, any>;
  columns: any[];
  colors: any;
  fallbackColor: string;
  colorSchemes?: any;
  colorBasisColumn?: string;
  title: string;
  holidayInput: any;
  regularDaysOffSetting: any;
  dateFormat: string;
  treeData: any;
  noteData: any;
  rowNoteData: any;
}

/**
 * バックアップJSONをパースして型安全に取得する
 */
export const parseBackupData = (backupJson: string): BackupData | null => {
  try {
    return JSON.parse(backupJson) as BackupData;
  } catch (error) {
    console.error('Failed to parse backup data:', error);
    return null;
  }
};