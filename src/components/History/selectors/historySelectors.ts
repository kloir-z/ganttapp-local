import { createSelector } from 'reselect';
import { RootState } from '../../../reduxStoreAndSlices/store';

// Base selectors
const selectHistoryState = (state: RootState) => state.history;
const selectColorState = (state: RootState) => state.color;
const selectBaseSettingsState = (state: RootState) => state.baseSettings;
const selectWbsDataState = (state: RootState) => state.wbsData;
const selectNotesState = (state: RootState) => state.notes;

// Memoized selectors
export const selectSnapshots = createSelector(
  [selectHistoryState],
  (historyState) => historyState.snapshots
);

export const selectCurrentSnapshotId = createSelector(
  [selectHistoryState],
  (historyState) => historyState.currentSnapshotId
);

// Combine all required state for snapshot creation into a single memoized selector
export const selectAllRequiredStateForSnapshot = createSelector(
  [selectColorState, selectBaseSettingsState, selectWbsDataState, selectNotesState],
  (colorState, baseSettingsState, wbsDataState, notesState) => ({
    colors: colorState.colors,
    fallbackColor: colorState.fallbackColor,
    dateRange: baseSettingsState.dateRange,
    columns: wbsDataState.columns,
    data: wbsDataState.data,
    holidayInput: baseSettingsState.holidayInput,
    holidayColor: wbsDataState.holidayColor,
    regularDaysOffSetting: wbsDataState.regularDaysOffSetting,
    wbsWidth: baseSettingsState.wbsWidth,
    calendarWidth: baseSettingsState.calendarWidth,
    cellWidth: baseSettingsState.cellWidth,
    title: baseSettingsState.title,
    showYear: wbsDataState.showYear,
    dateFormat: wbsDataState.dateFormat,
    treeData: notesState.treeData,
    noteData: notesState.noteData,
    language: baseSettingsState.language,
    scrollPosition: baseSettingsState.scrollPosition,
    modalState: notesState.modalState,
    treeExpandedKeys: notesState.treeExpandedKeys,
    treeScrollPosition: notesState.treeScrollPosition,
    editorStates: notesState.editorStates,
    selectedNodeKey: notesState.selectedNodeKey
  })
);