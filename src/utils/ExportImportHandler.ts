import { AppDispatch, ExtendedColumn, RootState, setColumns, setDateFormat, setIsSavedChangesStore, setShowYear, updateEntireRegularDaysOffSetting, updateHolidayColor } from "../reduxStoreAndSlices/store";
import { ColorInfo, setIsSavedChangesColor } from "../reduxStoreAndSlices/colorSlice";
import { WBSData, DateFormatType, RegularDaysOffSettingsType, HolidayColor } from "../types/DataTypes";
import { updateEntireColorSettings } from "../reduxStoreAndSlices/colorSlice";
import { setEntireData, setHolidays } from "../reduxStoreAndSlices/store";
import { setWbsWidth, setDateRange, setHolidayInput, setTitle, setCalendarWidth, setCellWidth, setLanguage, setIsSavedChangesSettings } from "../reduxStoreAndSlices/baseSettingsSlice";
import JSZip from 'jszip';
import { parseHolidaysFromInput } from '../components/Setting/utils/settingHelpers';
import { createAsyncThunk } from "@reduxjs/toolkit";
import { ExtendedTreeDataNode, noteData, setIsSavedChangesNotes, setNotes, NotesModalState } from "../reduxStoreAndSlices/notesSlice";
import i18n from "i18next";

export const handleExport = async (
  fileId: string,
  colors: { [id: number]: ColorInfo },
  dateRange: { startDate: string, endDate: string },
  columns: ExtendedColumn[],
  data: { [id: string]: WBSData },
  holidayInput: string,
  holidayColor: HolidayColor,
  regularDaysOffSetting: RegularDaysOffSettingsType,
  wbsWidth: number,
  calendarWidth: number,
  cellWidth: number,
  title: string,
  showYear: boolean,
  dateFormat: DateFormatType,
  treeData: ExtendedTreeDataNode[],
  noteData: noteData,
  language: string,
  notesModalState?: NotesModalState,
) => {
  const settingsData = {
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
    language,
    ...(notesModalState && { notesModalState }),
  };
  const zip = new JSZip();
  const jsonData = JSON.stringify(settingsData, null, 2);
  zip.file(`${fileId}.json`, jsonData, { compression: 'DEFLATE', compressionOptions: { level: 9 } });
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return zipBlob;
};

export const handleImport = createAsyncThunk<void, Blob, { state: RootState, dispatch: AppDispatch }>(
  'project/import',
  async (file: Blob, { dispatch }) => {
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
      dispatch(setColumns(parsedData.columns));
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
        modalState: parsedData.notesModalState
      }));
    }
    if (parsedData.language) {
      i18n.changeLanguage(parsedData.language);
      dispatch(setLanguage(parsedData.language));
    }
    dispatch(setIsSavedChangesStore(true));
    dispatch(setIsSavedChangesColor(true));
    dispatch(setIsSavedChangesNotes(true));
    dispatch(setIsSavedChangesSettings(true));
  }
);