import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { WBSData, EventRow, RegularDaysOffSettingsType, isChartRow, isEventRow, isSeparatorRow, DateFormatType, HolidayColor, RowType, MessageInfo } from '../types/DataTypes';
import { calculatePlannedDays, buildDependencyMap, updateDependentRows, resetEndDate, updateSeparatorRowDates, adjustColorOpacity, createNewRow, resolveDependencies, isHoliday, isRegularDaysOff } from '../utils/CommonUtils';
import copiedRowsReducer from './copiedRowsSlice';
import colorReducer from './colorSlice'
import baseSettingsReducer from './baseSettingsSlice';
import uiFlagsReducer from './uiFlagSlice';
import subMenuReducer from './subMenuSlice';
import notesReducer from './notesSlice';
import rowDialogReducer from './rowDialogSlice';
import historyReducer from './historySlice';
import { Column } from "@silevis/reactgrid";
import { initializedEmptyData } from './initialData';
import { initialRegularDaysOffSetting } from './initialHolidays';
import { initialColumns } from './initialColumns';
import { assignIds } from '../components/Table/utils/wbsHelpers';
import { cdate } from 'cdate';

export interface ExtendedColumn extends Column {
  columnId: string;
  columnName: string;
  visible: boolean;
}

export interface UndoableState {
  data: { [id: string]: WBSData },
  columns: ExtendedColumn[],
}

export interface AddRowPayload {
  rowType: RowType;
  insertAtId: string;
  numberOfRows: number;
  maxRowsMessage: string;
}

const MAX_ROWS = 999;

const isDisplayNameOnlyRow = (row: WBSData): boolean => {
  if (!isChartRow(row) && !isEventRow(row)) {
    return false;
  }
  const isEmpty = (value: string | null | undefined): boolean => {
    return !value || value.trim() === '';
  };
  if (isEmpty(row.displayName)) {
    return false;
  }
  const baseFieldsEmpty = isEmpty(row.plannedStartDate) &&
    isEmpty(row.plannedEndDate) &&
    isEmpty(row.actualStartDate) &&
    isEmpty(row.actualEndDate) &&
    isEmpty(row.textColumn1) &&
    isEmpty(row.textColumn2) &&
    isEmpty(row.textColumn3);
  if (isChartRow(row)) {
    return baseFieldsEmpty && isEmpty(row.dependency);
  } else {

    return baseFieldsEmpty;
  }
};

const initialState: {
  data: {
    [id: string]: WBSData
  },
  holidays: string[],
  holidayColor: HolidayColor,
  regularDaysOffSetting: RegularDaysOffSettingsType,
  regularDaysOff: number[],
  columns: ExtendedColumn[],
  showYear: boolean,
  dateFormat: DateFormatType,
  dependencyMap: { [id: string]: string[] },
  past: UndoableState[],
  future: UndoableState[],
  messageInfo: MessageInfo,
  isSavedChanges: boolean;
} = {
  data: updateSeparatorRowDates(initializedEmptyData),
  holidays: [],
  holidayColor: { color: '#ffdcdc', subColor: adjustColorOpacity('#ffdcdc') },
  regularDaysOffSetting: initialRegularDaysOffSetting,
  regularDaysOff: Array.from(new Set(Object.values(initialRegularDaysOffSetting).flatMap(setting => setting.days))),
  showYear: false,
  dateFormat: "yyyy/M/d",
  columns: initialColumns,
  dependencyMap: buildDependencyMap(initializedEmptyData),
  past: [{
    data: updateSeparatorRowDates(initializedEmptyData),
    columns: initialColumns
  }],
  future: [],
  messageInfo: { message: '', severity: 'info' },
  isSavedChanges: true,
};

const emptyState = {
  ...initialState,
  data: initializedEmptyData,
  past: initialState.past.map(p => ({ ...p, data: initializedEmptyData })),
  isSavedChanges: true,
};

export const wbsDataSlice = createSlice({
  name: 'wbsData',
  initialState,
  reducers: {
    setEntireData: (state, action: PayloadAction<{ [id: string]: WBSData }>) => {
      const data = action.payload;
      const { updatedData, newDependencyMap } = resolveDependencies(data, state.holidays, state.regularDaysOff);
      state.dependencyMap = newDependencyMap;
      state.past.push({ data: state.data, columns: state.columns });
      state.future = [];
      if (state.past.length > 30) {
        state.past.shift();
      }
      state.data = updatedData;
      state.isSavedChanges = false;
    },
    addRow: (state, action: PayloadAction<AddRowPayload>) => {
      const { rowType, insertAtId, numberOfRows, maxRowsMessage } = action.payload;
      const dataArray: WBSData[] = Object.values(state.data);
      const insertAtIndex = dataArray.findIndex(item => item.id === insertAtId);
      for (let i = 0; i < numberOfRows; i++) {
        const newRow = createNewRow(rowType);
        if (insertAtIndex >= 0) {
          dataArray.splice(insertAtIndex + i, 0, newRow);
        } else {
          dataArray.push(newRow);
        }
      }
      if (dataArray.length >= MAX_ROWS) {
        state.messageInfo = { message: maxRowsMessage, severity: 'error' };
        return;
      }
      const data = assignIds(dataArray);
      const { updatedData, newDependencyMap } = resolveDependencies(data, state.holidays, state.regularDaysOff);
      state.dependencyMap = newDependencyMap;
      state.past.push({ data: state.data, columns: state.columns });
      state.future = [];
      if (state.past.length > 30) {
        state.past.shift();
      }
      state.data = updatedData;
      state.isSavedChanges = false;
    },
    insertCopiedRow: (state, action: PayloadAction<{ insertAtId: string, copiedRows: WBSData[], maxRowsMessage: string }>) => {
      const { insertAtId, copiedRows, maxRowsMessage } = action.payload;
      if (!copiedRows || copiedRows.length === 0) return;
      const dataArray: WBSData[] = Object.values(state.data);
      const insertAtIndex = dataArray.findIndex(item => item.id === insertAtId);
      if (dataArray.length + copiedRows.length > 999) {
        state.messageInfo = { message: maxRowsMessage, severity: 'error' };
        return;
      }
      if (insertAtIndex >= 0) {
        dataArray.splice(insertAtIndex, 0, ...copiedRows.map(row => ({ ...row, id: "" })));
        const data = assignIds(dataArray);
        const { updatedData, newDependencyMap } = resolveDependencies(data, state.holidays, state.regularDaysOff);
        state.dependencyMap = newDependencyMap;
        state.past.push({ data: state.data, columns: state.columns });
        state.future = [];
        if (state.past.length > 30) {
          state.past.shift();
        }
        state.data = updatedData;
        state.isSavedChanges = false;
      }
    },
    deleteRows: (state, action: PayloadAction<string[]>) => {
      const idsToDelete = action.payload;
      const filteredData = Object.values(state.data).filter(row => !idsToDelete.includes(row.id));
      const data = assignIds(filteredData);
      const { updatedData, newDependencyMap } = resolveDependencies(data, state.holidays, state.regularDaysOff);
      state.dependencyMap = newDependencyMap;
      state.past.push({ data: state.data, columns: state.columns });
      state.future = [];
      if (state.past.length > 30) {
        state.past.shift();
      }
      state.data = updatedData;
      state.isSavedChanges = false;
    },
    convertDisplayNameOnlyRowsToSeparator: (state, action: PayloadAction<string[] | undefined>) => {
      const targetRowIds = action.payload;
      const dataArray: WBSData[] = Object.values(state.data);
      let hasChanges = false;
      const updatedDataArray = dataArray.map(row => {
        const shouldProcess = targetRowIds ? targetRowIds.includes(row.id) : true;
        if (shouldProcess && isDisplayNameOnlyRow(row)) {
          hasChanges = true;
          const newSeparatorRow: WBSData = {
            no: row.no,
            id: row.id,
            rowType: "Separator",
            displayName: row.displayName,
            isCollapsed: false,
            minStartDate: undefined,
            maxEndDate: undefined,
            level: 0
          };
          return newSeparatorRow;
        }
        return row;
      });
      if (hasChanges) {
        const data = assignIds(updatedDataArray);
        const { updatedData, newDependencyMap } = resolveDependencies(data, state.holidays, state.regularDaysOff);
        state.dependencyMap = newDependencyMap;
        state.past.push({ data: state.data, columns: state.columns });
        state.future = [];
        if (state.past.length > 30) {
          state.past.shift();
        }
        state.data = updatedData;
        state.isSavedChanges = false;
      }
    },
    setMessageInfo: (state, action: PayloadAction<MessageInfo>) => {
      state.messageInfo = action.payload
    },
    clearMessageInfo: (state) => {
      state.messageInfo = { message: "", severity: 'success' };
    },
    setPlannedDate: (state, action: PayloadAction<{ id: string; startDate: string; endDate: string }>) => {
      const { id, startDate, endDate } = action.payload;
      const chartRow = state.data[id];
      if (isChartRow(chartRow) && (chartRow.plannedStartDate !== startDate || chartRow.plannedEndDate !== endDate)) {
        chartRow.plannedStartDate = startDate;
        chartRow.plannedEndDate = endDate;
        chartRow.plannedDays = calculatePlannedDays(startDate, endDate, state.holidays, chartRow.isIncludeHolidays, state.regularDaysOff);
        updateDependentRows(state, id, startDate, endDate);
        const updatedData = updateSeparatorRowDates(state.data);
        state.data = updatedData;
        state.isSavedChanges = false;
      }
    },
    setActualDate: (state, action: PayloadAction<{ id: string; startDate: string; endDate: string }>) => {
      const { id, startDate, endDate } = action.payload;
      const chartRow = state.data[id];
      if (isChartRow(chartRow) && (chartRow.actualStartDate !== startDate || chartRow.actualEndDate !== endDate)) {
        chartRow.actualStartDate = startDate;
        chartRow.actualEndDate = endDate;
        state.isSavedChanges = false;
      }
    },
    setDisplayName: (state, action: PayloadAction<{ id: string; displayName: string }>) => {
      const { id, displayName } = action.payload;
      if (state.data[id] && state.data[id].displayName !== displayName) {
        state.data[id].displayName = displayName;
        state.isSavedChanges = false;
      }
    },
    toggleSeparatorCollapsed: (state, action: PayloadAction<{ id: string; isCollapsed?: boolean }>) => {
      const { id, isCollapsed } = action.payload;
      const separatorRow = state.data[id];
      if (isSeparatorRow(separatorRow) && isCollapsed !== separatorRow.isCollapsed) {
        separatorRow.isCollapsed = isCollapsed !== undefined ? isCollapsed : !separatorRow.isCollapsed;
        state.isSavedChanges = false;
      }
    },
    setSeparatorLevel: (state, action: PayloadAction<{ id: string; level: number }>) => {
      const { id, level } = action.payload;
      const separatorRow = state.data[id];
      if (isSeparatorRow(separatorRow)) {
        const clampedLevel = Math.max(0, Math.min(4, level));
        if (separatorRow.level !== clampedLevel) {
          separatorRow.level = clampedLevel;
          state.isSavedChanges = false;
        }
      }
    },
    setHolidays: (state, action: PayloadAction<string[]>) => {
      const newHolidays = action.payload;
      const oldHolidays = Array.from(state.holidays);
      const addedHolidays = newHolidays.filter(h => !oldHolidays.includes(h));
      const removedHolidays = oldHolidays.filter(h => !newHolidays.includes(h));
      const affectedHolidays = [...addedHolidays, ...removedHolidays];
      state.holidays = newHolidays;
      state.isSavedChanges = false;
      resetEndDate(state, affectedHolidays)
    },
    updateHolidayColor: (state, action: PayloadAction<string>) => {
      const updatedHolidayColor: HolidayColor = { color: '', subColor: '' };
      updatedHolidayColor.color = action.payload;
      updatedHolidayColor.subColor = adjustColorOpacity(updatedHolidayColor.color);
      state.holidayColor = updatedHolidayColor;
      state.isSavedChanges = false;
    },
    setEventDisplayName: (state, action: PayloadAction<{ id: string; eventIndex: number; displayName: string }>) => {
      const { id, eventIndex, displayName } = action.payload;
      const eventRow = state.data[id];
      if (isEventRow(eventRow) && eventRow.eventData[eventIndex] && eventRow.eventData[eventIndex].eachDisplayName !== displayName) {
        eventRow.eventData[eventIndex].eachDisplayName = displayName;
        state.isSavedChanges = false;
      }
    },
    updateEventRow: (state, action: PayloadAction<{ id: string; updatedEventRow: EventRow }>) => {
      const { id, updatedEventRow } = action.payload;
      if (JSON.stringify(updatedEventRow) !== JSON.stringify(state.data[id])) {
        state.data[id] = updatedEventRow;
        const updatedData = updateSeparatorRowDates(state.data);
        state.data = updatedData;
        state.isSavedChanges = false;
      }
    },
    updateSeparatorDates: (state) => {
      const updatedData = updateSeparatorRowDates(state.data);
      state.data = updatedData;
    },
    updateEntireRegularDaysOffSetting: (state, action: PayloadAction<RegularDaysOffSettingsType>) => {
      const regularDaysOffSetting = action.payload;
      state.regularDaysOffSetting = regularDaysOffSetting;
      state.regularDaysOff = Array.from(new Set(Object.values(initialRegularDaysOffSetting).flatMap(setting => setting.days)));
      state.isSavedChanges = false;
      resetEndDate(state)
    },
    updateRegularDaysOffSetting: (state, action: PayloadAction<{ id: number; day: number; add: boolean }>) => {
      const { id, day, add } = action.payload;
      const setting = state.regularDaysOffSetting[id];
      if (!setting) return;
      if (add) {
        const allDays = Object.values(state.regularDaysOffSetting).flatMap(s => s.days);
        const uniqueDaysBeforeAdding = new Set(allDays);
        uniqueDaysBeforeAdding.add(day);
        if (uniqueDaysBeforeAdding.size === 7) {
          return;
        }
        if (!setting.days.includes(day)) {
          setting.days.push(day);
        }
      } else {
        setting.days = setting.days.filter(d => d !== day);
      }
      if (add) {
        Object.entries(state.regularDaysOffSetting).forEach(([key, otherSetting]) => {
          if (parseInt(key) !== id) {
            otherSetting.days = otherSetting.days.filter(d => d !== day);
          }
        });
      }
      state.regularDaysOff = Array.from(new Set(Object.values(state.regularDaysOffSetting).flatMap(s => s.days)));
      resetEndDate(state);
      state.isSavedChanges = false;
    },
    updateRegularDaysOffColor: (state, action: PayloadAction<{ id: number; color: string }>) => {
      const { id, color } = action.payload;
      const setting = state.regularDaysOffSetting[id];
      if (setting) {
        setting.color = color;
        setting.subColor = adjustColorOpacity(color);
        state.isSavedChanges = false;
      }
    },
    setDateFormat(state, action: PayloadAction<DateFormatType>) {
      if (state.dateFormat !== action.payload) {
        state.dateFormat = action.payload;
      }
    },
    setShowYear(state, action: PayloadAction<boolean>) {
      state.showYear = action.payload;
      state.columns = state.columns.map(column => {
        if (["plannedStartDate", "plannedEndDate", "actualStartDate", "actualEndDate"].includes(column.columnId)) {
          return { ...column, width: action.payload ? 90 : 50 };
        }
        return column;
      });
    },
    setColumns(state, action: PayloadAction<ExtendedColumn[]>) {
      if (JSON.stringify(state.columns) !== JSON.stringify(action.payload)) {
        state.columns = action.payload;
        state.isSavedChanges = false;
      }
    },
    toggleColumnVisibility(state, action: PayloadAction<string>) {
      state.past.push({ data: state.data, columns: state.columns });
      state.future = [];
      if (state.past.length > 30) {
        state.past.shift();
      }
      state.columns = state.columns.map(column =>
        column.columnId === action.payload && column.columnId !== 'no'
          ? { ...column, visible: !column.visible }
          : column
      );
    },
    handleColumnResize(state, action: PayloadAction<{ columnId: string; width: number }>) {
      const columnIndex = state.columns.findIndex(col => col.columnId === action.payload.columnId);
      if (columnIndex >= 0) {
        state.columns[columnIndex] = { ...state.columns[columnIndex], width: action.payload.width };
      }
    },
    resetStore: () => emptyState,
    pushPastState: (state) => {
      state.past.push({ data: state.data, columns: state.columns });
      state.future = [];
      if (state.past.length > 31) {
        state.past.shift();
      }
    },
    removePastState: (state, action: PayloadAction<number>) => {
      const numberToRemove = action.payload;
      state.past.length = Math.max(state.past.length - numberToRemove, 0);
    },
    undo: (state) => {
      if (state.past.length > 1) {
        const lastPast = state.past.pop();
        if (lastPast) {
          state.future.unshift({ data: state.data, columns: state.columns });
          state.data = lastPast.data;
          state.columns = lastPast.columns;
          state.dependencyMap = buildDependencyMap(lastPast.data);
        }
      }
    },
    redo: (state) => {
      if (state.future.length > 0) {
        const firstFuture = state.future.shift();
        if (firstFuture) {
          state.past.push({ data: state.data, columns: state.columns });
          state.data = firstFuture.data;
          state.columns = firstFuture.columns;
          state.dependencyMap = buildDependencyMap(firstFuture.data);
        }
      }
    },
    setIsSavedChangesStore(state, action: PayloadAction<boolean>) {
      state.isSavedChanges = action.payload;
    },
    createTaskChain: (state, action: PayloadAction<string[]>) => {
      const selectedRowIds = action.payload;
      if (selectedRowIds.length < 2) return;
      const dataArray: WBSData[] = Object.values(state.data);
      const selectedRows = selectedRowIds
        .map(id => dataArray.find(row => row.id === id))
        .filter((row): row is WBSData => row !== undefined)
        .sort((a, b) => {
          const aIndex = dataArray.findIndex(r => r.no === a.no);
          const bIndex = dataArray.findIndex(r => r.no === b.no);
          return aIndex - bIndex;
        });
      const chartRows = selectedRows.filter(isChartRow);
      if (chartRows.length < 2) {
        return;
      }
      let hasChanges = false;
      for (let i = 1; i < chartRows.length; i++) {
        const currentRow = chartRows[i];
        const previousRow = chartRows[i - 1];
        const currentIndex = dataArray.findIndex(r => r.id === currentRow.id);
        const previousIndex = dataArray.findIndex(r => r.id === previousRow.id);
        let distance = 0;
        if (previousIndex < currentIndex) {
          for (let j = currentIndex - 1; j >= previousIndex; j--) {
            if (isChartRow(dataArray[j])) {
              distance--;
            }
          }
        } else {
          for (let j = currentIndex + 1; j <= previousIndex; j++) {
            if (isChartRow(dataArray[j])) {
              distance++;
            }
          }
        }
        if (currentRow.plannedStartDate && currentRow.plannedEndDate &&
          previousRow.plannedStartDate && previousRow.plannedEndDate) {
          const startDate = cdate(currentRow.plannedStartDate);
          const endDate = cdate(currentRow.plannedEndDate);
          const startDayOfWeek = startDate.toDate().getDay();
          const endDayOfWeek = endDate.toDate().getDay();
          if (isRegularDaysOff(startDayOfWeek, state.regularDaysOff) ||
            isHoliday(startDate, state.holidays) ||
            isRegularDaysOff(endDayOfWeek, state.regularDaysOff) ||
            isHoliday(endDate, state.holidays)) {
            const originalEndDate = currentRow.plannedEndDate;
            currentRow.isIncludeHolidays = true;
            currentRow.plannedDays = calculatePlannedDays(
              currentRow.plannedStartDate,
              originalEndDate,
              state.holidays,
              true,
              state.regularDaysOff
            );
            hasChanges = true;
          }
          if (currentRow.plannedStartDate === previousRow.plannedStartDate) {
            const offsetDays = 0;
            const newDependency = `sameas,${distance},${offsetDays}`;
            if (currentRow.dependency !== newDependency) {
              currentRow.dependency = newDependency;
              hasChanges = true;
            }
          } else {
            const prevEndDate = cdate(previousRow.plannedEndDate);
            const currStartDate = cdate(currentRow.plannedStartDate);
            let offsetDays = 0;
            if (+currStartDate > +prevEndDate) {
              let tempDate = prevEndDate.add(1, 'day');
              while (+tempDate <= +currStartDate) {
                const dayOfWeek = tempDate.toDate().getDay();
                const isWorkDay = !isRegularDaysOff(dayOfWeek, state.regularDaysOff) &&
                  !isHoliday(tempDate, state.holidays);
                if (+tempDate === +currStartDate) {
                  if (isWorkDay || currentRow.isIncludeHolidays) {
                    offsetDays++;
                  }
                  break;
                } else if (isWorkDay || currentRow.isIncludeHolidays) {
                  offsetDays++;
                }
                tempDate = tempDate.add(1, 'day');
              }
            } else if (+currStartDate < +prevEndDate) {
              let tempDate = currStartDate;
              while (+tempDate <= +prevEndDate) {
                const dayOfWeek = tempDate.toDate().getDay();
                const isWorkDay = !isRegularDaysOff(dayOfWeek, state.regularDaysOff) &&
                  !isHoliday(tempDate, state.holidays);
                if (isWorkDay || currentRow.isIncludeHolidays) {
                  offsetDays--;
                }
                tempDate = tempDate.add(1, 'day');
              }
              const prevIsWorkDay =
                currentRow.isIncludeHolidays ||
                (!isRegularDaysOff(prevEndDate.toDate().getDay(), state.regularDaysOff) &&
                  !isHoliday(prevEndDate, state.holidays));
              if (prevIsWorkDay) {
                offsetDays++;
              }
            } else {
              offsetDays = 0;
            }
            const newDependency = `after,${distance},${offsetDays}`;
            if (currentRow.dependency !== newDependency) {
              currentRow.dependency = newDependency;
              hasChanges = true;
            }
          }
        }
      }
      if (hasChanges) {
        const data = assignIds(dataArray);
        const { updatedData, newDependencyMap } = resolveDependencies(data, state.holidays, state.regularDaysOff);
        state.dependencyMap = newDependencyMap;
        state.data = updatedData;
        state.isSavedChanges = false;
      }
    },
  },
});

export const {
  setEntireData,
  addRow,
  insertCopiedRow,
  deleteRows,
  convertDisplayNameOnlyRowsToSeparator,
  setMessageInfo,
  clearMessageInfo,
  setPlannedDate,
  setActualDate,
  setDisplayName,
  toggleSeparatorCollapsed,
  setSeparatorLevel,
  setHolidays,
  updateHolidayColor,
  setEventDisplayName,
  updateEventRow,
  updateSeparatorDates,
  updateEntireRegularDaysOffSetting,
  updateRegularDaysOffSetting,
  updateRegularDaysOffColor,
  setShowYear,
  setDateFormat,
  setColumns,
  toggleColumnVisibility,
  handleColumnResize,
  resetStore,
  pushPastState,
  removePastState,
  undo,
  redo,
  setIsSavedChangesStore,
  createTaskChain,
} = wbsDataSlice.actions;

export const store = configureStore({
  reducer: {
    wbsData: wbsDataSlice.reducer,
    copiedRows: copiedRowsReducer,
    color: colorReducer,
    baseSettings: baseSettingsReducer,
    uiFlags: uiFlagsReducer,
    subMenu: subMenuReducer,
    notes: notesReducer,
    rowDialog: rowDialogReducer,
    history: historyReducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;