import { AppDispatch, ExtendedColumn, RootState, setColumns, setDateFormat, setIsSavedChangesStore, setShowYear, updateEntireRegularDaysOffSetting, updateHolidayColor } from "../reduxStoreAndSlices/store";
import { ensureCpPredecessorsColumn, ensureWbsNumberColumn } from "../reduxStoreAndSlices/initialColumns";
import { ColorInfo, setIsSavedChangesColor } from "../reduxStoreAndSlices/colorSlice";
import { WBSData, DateFormatType, RegularDaysOffSettingsType, HolidayColor } from "../types/DataTypes";
import { updateEntireColorSettings } from "../reduxStoreAndSlices/colorSlice";
import { setEntireData, setHolidays } from "../reduxStoreAndSlices/store";
import { setWbsWidth, setDateRange, setHolidayInput, setTitle, setCalendarWidth, setCellWidth, setLanguage, setIsSavedChangesSettings, setScrollPosition } from "../reduxStoreAndSlices/baseSettingsSlice";
import JSZip from 'jszip';
import { parseHolidaysFromInput } from '../components/Setting/utils/settingHelpers';
import { createAsyncThunk } from "@reduxjs/toolkit";
import { ExtendedTreeDataNode, noteData, setIsSavedChangesNotes, setNotes, NotesModalState } from "../reduxStoreAndSlices/notesSlice";
import { importHistory, clearHistory } from "../reduxStoreAndSlices/historySlice";
import i18n from "i18next";

// Schema version of the exported project data. Bump this whenever the shape of
// the exported JSON changes in a way that import logic must account for.
// Files exported before versioning existed have no `version` field; treat those as 1.
export const EXPORT_SCHEMA_VERSION = 1;

export interface ExportData {
  fileId: string;
  colors: { [id: number]: ColorInfo };
  dateRange: { startDate: string, endDate: string };
  columns: ExtendedColumn[];
  data: { [id: string]: WBSData };
  holidayInput: string;
  holidayColor: HolidayColor;
  regularDaysOffSetting: RegularDaysOffSettingsType;
  wbsWidth: number;
  calendarWidth: number;
  cellWidth: number;
  title: string;
  showYear: boolean;
  dateFormat: DateFormatType;
  treeData: ExtendedTreeDataNode[];
  noteData: noteData;
  rowNoteData?: noteData;
  language: string;
  scrollPosition: { scrollLeft: number; scrollTop: number };
  notesModalState?: NotesModalState;
  treeExpandedKeys?: React.Key[];
  treeScrollPosition?: number;
  editorStates?: { [key: string]: any };
  selectedNodeKey?: string;
  historySnapshots?: any[];
}

// Collect the canonical, format-agnostic project model from the export options.
// This is the single source of truth that every export format serializes from.
export const buildProjectData = (options: ExportData) => {
  const {
    colors,
    dateRange,
    columns,
    data,
    holidayInput,
    holidayColor,
    regularDaysOffSetting,
    wbsWidth,
    calendarWidth,
    cellWidth,
    title,
    showYear,
    dateFormat,
    treeData,
    noteData,
    rowNoteData,
    language,
    scrollPosition,
    notesModalState,
    treeExpandedKeys,
    treeScrollPosition,
    editorStates,
    selectedNodeKey,
    historySnapshots,
  } = options;
  // Deferred orphan cleanup: only persist row notes whose row still exists in
  // the current WBS data. Rows deleted earlier leave their notes in state until
  // the next save, at which point they are dropped here.
  const prunedRowNoteData: noteData = {};
  const sourceRowNoteData = rowNoteData ?? {};
  for (const rowId of Object.keys(sourceRowNoteData)) {
    if (data[rowId]) {
      prunedRowNoteData[rowId] = sourceRowNoteData[rowId];
    }
  }
  return {
    version: EXPORT_SCHEMA_VERSION,
    colors,
    dateRange,
    columns,
    data,
    holidayInput,
    holidayColor,
    regularDaysOffSetting,
    wbsWidth,
    calendarWidth,
    cellWidth,
    title,
    showYear,
    dateFormat,
    treeData,
    noteData,
    rowNoteData: prunedRowNoteData,
    language,
    scrollPosition,
    ...(notesModalState && { notesModalState }),
    ...(treeExpandedKeys && { treeExpandedKeys }),
    ...(treeScrollPosition !== undefined && { treeScrollPosition }),
    ...(editorStates && { editorStates }),
    ...(selectedNodeKey && { selectedNodeKey }),
    ...(historySnapshots && { historySnapshots }),
  };
};

export type ProjectData = ReturnType<typeof buildProjectData>;

// Serialize the project model to the native ZIP format (a deflated JSON entry).
export const serializeToZip = async (fileId: string, projectData: ProjectData): Promise<Blob> => {
  const zip = new JSZip();
  const jsonData = JSON.stringify(projectData, null, 2);
  zip.file(`${fileId}.json`, jsonData, { compression: 'DEFLATE', compressionOptions: { level: 9 } });
  return zip.generateAsync({ type: 'blob' });
};

export const handleExport = async (options: ExportData): Promise<Blob> => {
  const projectData = buildProjectData(options);
  return serializeToZip(options.fileId, projectData);
};

export const handleImport = createAsyncThunk<void, { file: Blob; skipHistoryImport?: boolean }, { state: RootState, dispatch: AppDispatch }>(
  'project/import',
  async ({ file, skipHistoryImport = false }, { dispatch }) => {
    if (!file) throw new Error("File is not provided");
    
    let parsedData: any;
    
    // Check if the file is a JSON file directly
    if (file.type === 'application/json') {
      const jsonData = await file.text();
      parsedData = JSON.parse(jsonData);
    } else {
      // Handle as ZIP file
      const zip = new JSZip();
      const zipContent = await file.arrayBuffer();
      const loadedZip = await zip.loadAsync(zipContent);
      const jsonFileEntry = Object.values(loadedZip.files).find(file => file.name.endsWith('.json'));
      if (!jsonFileEntry) throw new Error("No JSON file found in ZIP");
      const jsonData = await jsonFileEntry.async("string");
      parsedData = JSON.parse(jsonData);
    }
    // Schema version of the imported file. Legacy files predate versioning and
    // have no `version` field, so they are treated as version 1. Branch on
    // `schemaVersion` here when a future schema change needs migration on import.
    const schemaVersion: number = parsedData.version ?? 1;
    if (schemaVersion > EXPORT_SCHEMA_VERSION) {
      console.warn(
        `Importing a project saved with a newer format (v${schemaVersion}) than this app supports (v${EXPORT_SCHEMA_VERSION}). Some data may not load correctly.`
      );
    }
    if (parsedData.colors) {
      dispatch(updateEntireColorSettings(parsedData.colors));
    }
    if (parsedData.dateRange && parsedData.dateRange.startDate && parsedData.dateRange.endDate) {
      dispatch(setDateRange({
        startDate: parsedData.dateRange.startDate,
        endDate: parsedData.dateRange.endDate,
      }));
    }
    if (parsedData.columns && Array.isArray(parsedData.columns)) {
      // Older projects predate the optional "WBS" column and the critical-path
      // "CP" column; inject them (hidden) so they can be turned on from the
      // column settings.
      dispatch(setColumns(ensureCpPredecessorsColumn(ensureWbsNumberColumn(parsedData.columns))));
    }
    if (parsedData.regularDaysOffSetting) {
      dispatch(updateEntireRegularDaysOffSetting(parsedData.regularDaysOffSetting));
    }
    let dateFormat: DateFormatType;
    if (parsedData.dateFormat) {
      dispatch(setDateFormat(parsedData.dateFormat));
      dateFormat = parsedData.dateFormat;
    } else {
      dateFormat = 'yyyy/M/d'
    }
    if (parsedData.holidayInput) {
      const newHolidayInput = parsedData.holidayInput;
      dispatch(setHolidayInput(newHolidayInput));
      dispatch(setHolidays(parseHolidaysFromInput(newHolidayInput, dateFormat)));
    }
    if (parsedData.holidayColor) {
      dispatch(updateHolidayColor(parsedData.holidayColor.color));
    }
    if (parsedData.data) {
      dispatch(setEntireData(parsedData.data));
    }
    if (parsedData.wbsWidth) {
      dispatch(setWbsWidth(parsedData.wbsWidth));
    }
    if (parsedData.title) {
      dispatch(setTitle(parsedData.title));
    }
    if (parsedData.showYear) {
      dispatch(setShowYear(parsedData.showYear));
    }
    if (parsedData.calendarWidth) {
      dispatch(setCalendarWidth(parsedData.calendarWidth));
    }
    if (parsedData.cellWidth) {
      dispatch(setCellWidth(parsedData.cellWidth));
    }
    if (parsedData.noteData && parsedData.treeData) {
      dispatch(setNotes({
        treeData: parsedData.treeData,
        noteData: parsedData.noteData,
        rowNoteData: parsedData.rowNoteData ?? {},
        modalState: parsedData.notesModalState,
        treeExpandedKeys: parsedData.treeExpandedKeys,
        treeScrollPosition: parsedData.treeScrollPosition,
        editorStates: parsedData.editorStates,
        selectedNodeKey: parsedData.selectedNodeKey
      }));
    }
    if (parsedData.language) {
      i18n.changeLanguage(parsedData.language);
      dispatch(setLanguage(parsedData.language));
    }
    if (parsedData.scrollPosition) {
      const scrollPosition = parsedData.scrollPosition;
      if (typeof scrollPosition === 'object' && 
          typeof scrollPosition.scrollLeft === 'number' && 
          typeof scrollPosition.scrollTop === 'number' &&
          scrollPosition.scrollLeft >= 0 && 
          scrollPosition.scrollTop >= 0) {
        dispatch(setScrollPosition(scrollPosition));
      } else {
        dispatch(setScrollPosition({ scrollLeft: 0, scrollTop: 0 }));
      }
    } else {
      dispatch(setScrollPosition({ scrollLeft: 0, scrollTop: 0 }));
    }
    
    // Import history snapshots if they exist and not skipping history import
    if (!skipHistoryImport) {
      if (parsedData.historySnapshots && Array.isArray(parsedData.historySnapshots)) {
        dispatch(importHistory(parsedData.historySnapshots));
      } else {
        // Clear history if no history data exists in imported file
        dispatch(clearHistory());
      }
    }
    
    dispatch(setIsSavedChangesStore(true));
    dispatch(setIsSavedChangesColor(true));
    dispatch(setIsSavedChangesNotes(true));
    dispatch(setIsSavedChangesSettings(true));
  }
);