import { RootState } from '../reduxStoreAndSlices/store';

/**
 * 現在の状態をバックアップ用JSONに変換する
 */
export const createStateBackup = (state: RootState): string => {
  return JSON.stringify({
    data: state.wbsData.data,
    columns: state.wbsData.columns,
    colors: state.color.colors,
    dateRange: state.baseSettings.dateRange,
    title: state.baseSettings.title,
    cellWidth: state.baseSettings.cellWidth,
    wbsWidth: state.baseSettings.wbsWidth,
    calendarWidth: state.baseSettings.calendarWidth,
    holidayInput: state.baseSettings.holidayInput,
    holidayColor: state.wbsData.holidayColor,
    regularDaysOffSetting: state.wbsData.regularDaysOffSetting,
    showYear: state.wbsData.showYear,
    dateFormat: state.wbsData.dateFormat,
    treeData: state.notes.treeData,
    noteData: state.notes.noteData,
    modalState: state.notes.modalState,
    selectedNodeKey: state.notes.selectedNodeKey,
    treeExpandedKeys: state.notes.treeExpandedKeys,
    treeScrollPosition: state.notes.treeScrollPosition,
    editorStates: state.notes.editorStates,
    language: state.baseSettings.language,
    scrollPosition: state.baseSettings.scrollPosition
  });
};

/**
 * バックアップデータの型定義
 */
export interface BackupData {
  data: Record<string, any>;
  columns: any[];
  colors: any;
  dateRange: any;
  title: string;
  cellWidth: number;
  wbsWidth: number;
  calendarWidth: number;
  holidayInput: any;
  holidayColor: any;
  regularDaysOffSetting: any;
  showYear: boolean;
  dateFormat: string;
  treeData: any;
  noteData: any;
  modalState: any;
  selectedNodeKey: string;
  treeExpandedKeys: any;
  treeScrollPosition: number;
  editorStates: any;
  language: string;
  scrollPosition: any;
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