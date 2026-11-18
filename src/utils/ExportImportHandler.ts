import { AppDispatch, ExtendedColumn, RootState, setColumns, setDateFormat, setIsSavedChangesStore, setShowYear, updateEntireRegularDaysOffSetting, updateHolidayColor } from "../reduxStoreAndSlices/store";
import { ensureCpPredecessorsColumn, ensureExtendedTextColumns, ensureWbsNumberColumn } from "../reduxStoreAndSlices/initialColumns";
import { ColorInfo, ColorScheme, setIsSavedChangesColor } from "../reduxStoreAndSlices/colorSlice";
import { WBSData, DateFormatType, RegularDaysOffSettingsType, HolidayColor, ChartAnnotation } from "../types/DataTypes";
import { updateEntireColorSettings, setEntireColorState } from "../reduxStoreAndSlices/colorSlice";
import { setEntireData, setHolidays, setEntireAnnotations } from "../reduxStoreAndSlices/store";
import { setWbsWidth, setDateRange, setHolidayInput, setTitle, setCalendarWidth, setCellWidth, setExtendActualBarToToday, setLanguage, setIsSavedChangesSettings, setScrollPosition, setProjectId, setRevisionId } from "../reduxStoreAndSlices/baseSettingsSlice";
import JSZip from 'jszip';
import { parseHolidaysFromInput } from '../components/Setting/utils/settingHelpers';
import { createAsyncThunk } from "@reduxjs/toolkit";
import { ExtendedTreeDataNode, noteData, setIsSavedChangesNotes, setNotes, NotesModalState } from "../reduxStoreAndSlices/notesSlice";
import i18n from "i18next";
import { v4 as uuidv4 } from 'uuid';

// Schema version of the exported project data. Bump this whenever the shape of
// the exported JSON changes in a way that import logic must account for.
// Files exported before versioning existed have no `version` field; treat those as 1.
// v2: 色分け基準列(colorBasisColumn)と基準列ごとのパレット(colorSchemes)を追加。
//     `colors` はアクティブなパレットとして残す(旧アプリでも開ける)。
export const EXPORT_SCHEMA_VERSION = 2;

export interface ExportData {
  fileId: string;
  colors: { [id: number]: ColorInfo };
  colorSchemes?: { [columnId: string]: ColorScheme };
  colorBasisColumn?: string;
  dateRange: { startDate: string, endDate: string };
  columns: ExtendedColumn[];
  data: { [id: string]: WBSData };
  holidayInput: string;
  holidayColor: HolidayColor;
  regularDaysOffSetting: RegularDaysOffSettingsType;
  wbsWidth: number;
  calendarWidth: number;
  cellWidth: number;
  // 実績終了日が未入力の行の実績バーを当日まで伸ばすか。v2 に後から追加した項目なので
  // 省略可(古いファイルには無い。読み込み時は既定の true になる)。
  extendActualBarToToday?: boolean;
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
  // チャート注釈(複数行を指し示す見せる用のメモ)。後から追加した項目なので省略可。
  annotations?: ChartAnnotation[];
  // プロジェクトを見分ける ID(下書きとの対応づけ用)。後から追加した項目なので省略可。
  projectId?: string;
  // 保存した版の ID(保存のたびに新しくなる)。後から追加した項目なので省略可。
  revisionId?: string;
}

// Collect the canonical, format-agnostic project model from the export options.
// This is the single source of truth that every export format serializes from.
export const buildProjectData = (options: ExportData) => {
  const {
    colors,
    colorSchemes,
    colorBasisColumn,
    dateRange,
    columns,
    data,
    holidayInput,
    holidayColor,
    regularDaysOffSetting,
    wbsWidth,
    calendarWidth,
    cellWidth,
    extendActualBarToToday,
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
    annotations,
    projectId,
    revisionId,
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
    ...(projectId && { projectId }),
    ...(revisionId && { revisionId }),
    colors,
    ...(colorSchemes && { colorSchemes }),
    ...(colorBasisColumn && { colorBasisColumn }),
    dateRange,
    columns,
    data,
    holidayInput,
    holidayColor,
    regularDaysOffSetting,
    wbsWidth,
    calendarWidth,
    cellWidth,
    ...(extendActualBarToToday !== undefined && { extendActualBarToToday }),
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
    ...(annotations && annotations.length > 0 && { annotations }),
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

// Collect the export options straight from the store, so callers read the state at
// the moment they save instead of each keeping its own long list of selectors.
export const buildExportOptionsFromState = (state: RootState): ExportData => ({
  fileId: uuidv4(),
  projectId: state.baseSettings.projectId,
  revisionId: state.baseSettings.revisionId,
  colors: state.color.colors,
  colorSchemes: state.color.schemes,
  colorBasisColumn: state.color.basisColumnId,
  dateRange: state.baseSettings.dateRange,
  columns: state.wbsData.columns,
  data: state.wbsData.data,
  holidayInput: state.baseSettings.holidayInput,
  holidayColor: state.wbsData.holidayColor,
  regularDaysOffSetting: state.wbsData.regularDaysOffSetting,
  wbsWidth: state.baseSettings.wbsWidth,
  calendarWidth: state.baseSettings.calendarWidth,
  cellWidth: state.baseSettings.cellWidth,
  extendActualBarToToday: state.baseSettings.extendActualBarToToday,
  title: state.baseSettings.title,
  showYear: state.wbsData.showYear,
  dateFormat: state.wbsData.dateFormat,
  treeData: state.notes.treeData,
  noteData: state.notes.noteData,
  rowNoteData: state.notes.rowNoteData,
  language: state.baseSettings.language,
  scrollPosition: state.baseSettings.scrollPosition,
  notesModalState: state.notes.modalState,
  treeExpandedKeys: state.notes.treeExpandedKeys,
  treeScrollPosition: state.notes.treeScrollPosition,
  editorStates: state.notes.editorStates,
  selectedNodeKey: state.notes.selectedNodeKey,
  annotations: state.wbsData.annotations,
});

export const handleImport = createAsyncThunk<void, { file: Blob }, { state: RootState, dispatch: AppDispatch }>(
  'project/import',
  async ({ file }, { dispatch }) => {
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
    if (parsedData.colorSchemes && typeof parsedData.colorSchemes === 'object') {
      // v2: 基準列ごとのパレット一式を復元する。
      dispatch(setEntireColorState({
        schemes: parsedData.colorSchemes,
        basisColumnId: typeof parsedData.colorBasisColumn === 'string' ? parsedData.colorBasisColumn : 'color',
      }));
    } else if (parsedData.colors) {
      // v1(旧形式): 単一パレットを Color 列基準として読み込む。
      dispatch(updateEntireColorSettings(parsedData.colors));
    }
    if (parsedData.dateRange && parsedData.dateRange.startDate && parsedData.dateRange.endDate) {
      dispatch(setDateRange({
        startDate: parsedData.dateRange.startDate,
        endDate: parsedData.dateRange.endDate,
      }));
    }
    if (parsedData.columns && Array.isArray(parsedData.columns)) {
      // Older projects predate the optional "WBS" column, the critical-path
      // "CP" column and the extended text columns (Text4〜7); inject them
      // (hidden) so they can be turned on from the column settings.
      dispatch(setColumns(ensureExtendedTextColumns(ensureCpPredecessorsColumn(ensureWbsNumberColumn(parsedData.columns)))));
    }
    // 注釈は後から追加した省略可能な配列。無いファイルは空で読み込む。
    dispatch(setEntireAnnotations(
      Array.isArray(parsedData.annotations) ? parsedData.annotations : []
    ));
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
    // projectId の無い古いファイルには、開いたときに ID を付ける(次の保存でファイルにも入る)。
    dispatch(setProjectId(
      typeof parsedData.projectId === 'string' && parsedData.projectId !== '' ? parsedData.projectId : uuidv4()
    ));
    // 版の ID。無い(古い)ファイルは版が分からないので空にする。
    dispatch(setRevisionId(typeof parsedData.revisionId === 'string' ? parsedData.revisionId : ''));
    if (parsedData.showYear) {
      dispatch(setShowYear(parsedData.showYear));
    }
    if (parsedData.calendarWidth) {
      dispatch(setCalendarWidth(parsedData.calendarWidth));
    }
    if (parsedData.cellWidth) {
      dispatch(setCellWidth(parsedData.cellWidth));
    }
    // 古いファイルにはこの項目が無いので、既定(当日まで伸ばす)として読み込む
    dispatch(setExtendActualBarToToday(parsedData.extendActualBarToToday !== false));
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

    // 以前の版で保存したファイルには historySnapshots(履歴スナップショット)が
    // 入っていることがある。機能を廃止したので読み込まず、次の保存で消える。

    dispatch(setIsSavedChangesStore(true));
    dispatch(setIsSavedChangesColor(true));
    dispatch(setIsSavedChangesNotes(true));
    dispatch(setIsSavedChangesSettings(true));
  }
);