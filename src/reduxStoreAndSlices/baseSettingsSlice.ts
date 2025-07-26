import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { generateDates } from "../utils/CommonUtils";
import { subWeeks, addMonths, format } from "date-fns";
import { SavedFileList } from "../types/DataTypes";

interface BaseSettingsState {
  language: string;
  wbsWidth: number;
  maxWbsWidth: number;
  calendarWidth: number;
  cellWidth: number;
  rowHeight: number;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  holidayInput: string;
  title: string;
  savedFileList: SavedFileList;
  currentFileId: string;
  userEmail: string;
  isSavedChanges: boolean;
}

const now = new Date();
const startDate = subWeeks(now, 2);
const endDate = addMonths(startDate, 24);

const initialState: BaseSettingsState = {
  language: "ja",
  wbsWidth: 690,
  maxWbsWidth: 690,
  calendarWidth: generateDates(format(startDate, "yyyy-MM-dd"), format(endDate, "yyyy-MM-dd")).length * 21,
  cellWidth: 21,
  rowHeight: 21,
  dateRange: {
    startDate: format(startDate, "yyyy-MM-dd"),
    endDate: format(endDate, "yyyy-MM-dd"),
  },
  holidayInput: "",
  title: "",
  savedFileList: {},
  currentFileId: "",
  userEmail: "",
  isSavedChanges: true,
};

const baseSettingsSlice = createSlice({
  name: "baseSettings",
  initialState,
  reducers: {
    setLanguage(state, action: PayloadAction<string>) {
      if (state.language !== action.payload) {
        state.language = action.payload;
        state.isSavedChanges = false;
      }
    },
    setWbsWidth(state, action: PayloadAction<number>) {
      state.wbsWidth = action.payload;
    },
    setMaxWbsWidth(state, action: PayloadAction<number>) {
      state.maxWbsWidth = action.payload;
    },
    setCalendarWidth(state, action: PayloadAction<number>) {
      state.calendarWidth = action.payload;
    },
    setCellWidth(state, action: PayloadAction<number>) {
      if (state.cellWidth !== action.payload) {
        state.cellWidth = action.payload;
        state.calendarWidth = generateDates(state.dateRange.startDate, state.dateRange.endDate).length * state.cellWidth;
        state.isSavedChanges = false;
      }
    },
    setDateRange(state, action: PayloadAction<{ startDate: string; endDate: string }>) {
      if (JSON.stringify(state.dateRange) !== JSON.stringify(action.payload)) {
        state.dateRange = action.payload;
        state.calendarWidth = generateDates(action.payload.startDate, action.payload.endDate).length * state.cellWidth;
        state.isSavedChanges = false;
      }
    },
    setHolidayInput(state, action: PayloadAction<string>) {
      if (state.holidayInput !== action.payload) {
        state.holidayInput = action.payload;
        state.isSavedChanges = false;
      }
    },
    setTitle(state, action: PayloadAction<string>) {
      state.title = action.payload;
      if (state.title !== action.payload) {
        if (action.payload) {
          document.title = action.payload + " - Gantty";
        } else {
          document.title = "Gantty";
        }
        state.isSavedChanges = false;
      }
    },
    resetBaseSettings(state) {
      state.wbsWidth = initialState.wbsWidth;
      state.maxWbsWidth = initialState.maxWbsWidth;
      state.calendarWidth = initialState.calendarWidth;
      state.cellWidth = initialState.cellWidth;
      state.dateRange = initialState.dateRange;
      state.holidayInput = initialState.holidayInput;
      state.title = initialState.title;
      state.isSavedChanges = true;
      document.title = "Gantty";
    },
    setSavedFileList(state, action: PayloadAction<SavedFileList>) {
      state.savedFileList = action.payload;
    },
    setCurrentFileId(state, action: PayloadAction<string>) {
      state.currentFileId = action.payload;
      localStorage.setItem('currentFileId', action.payload);
    },
    setUserEmail(state, action: PayloadAction<string>) {
      state.userEmail = action.payload;
    },
    setIsSavedChangesSettings(state, action: PayloadAction<boolean>) {
      state.isSavedChanges = action.payload;
    },
  },
});

export const { setWbsWidth, setMaxWbsWidth, setCalendarWidth, setCellWidth, setDateRange, setHolidayInput, setTitle, resetBaseSettings, setSavedFileList, setCurrentFileId, setUserEmail, setLanguage, setIsSavedChangesSettings } = baseSettingsSlice.actions;

export default baseSettingsSlice.reducer;
