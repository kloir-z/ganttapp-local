// gridHandlers.ts
import i18next from 'i18next';
import { CellChange, TextCell, NumberCell, CheckboxCell, EmailCell, DropdownCell, ChevronCell, HeaderCell, TimeCell, DateCell } from "@silevis/reactgrid";
import { WBSData, ChartRow, isChartRow, isEventRow, isSeparatorRow } from '../../../types/DataTypes';
import { setEntireData, setPlannedDate, updateSeparatorDates, pushPastState, ExtendedColumn, setMessageInfo, clearMessageInfo, AppDispatch } from '../../../reduxStoreAndSlices/store';
import { CustomDateCell } from './CustomDateCell';
import { CustomTextCell } from "./CustomTextCell";
import { addPlannedDays, validateDateString } from "../../../utils/CommonUtils";
import { SeparatorCell } from "./SeparatorCell";
import { CustomNumberCell } from './CustomNumberCell';
import { CustomDependencyCell } from './CustomDependencyCell';

type AllCellTypes = TextCell | NumberCell | CheckboxCell | EmailCell | DropdownCell | ChevronCell | HeaderCell | TimeCell | DateCell | CustomDateCell | CustomTextCell | CustomNumberCell | SeparatorCell | CustomDependencyCell;

const validateTextLength = (text: string, maxLength: number) => {
  const length = text.length;
  return length <= maxLength;
};

export const handleGridChanges = (dispatch: AppDispatch, data: { [id: string]: WBSData }, changes: CellChange<AllCellTypes>[], columns: ExtendedColumn[], holidays: string[], regularDaysOff: number[]) => {
  const updatedData = { ...data };
  const visibleColumns = columns.filter(column => column.visible);
  const secondVisibleColumnId = visibleColumns.length > 1 ? visibleColumns[1].columnId : null;
  const maxLength = 150;

  // Planned start/end edits from the table mirror the chart bar drag: set the date
  // directly and cascade to dependent (successor) rows via setPlannedDate, instead of
  // going through setEntireData -> resolveDependencies, which would re-derive (snap
  // back) a dependent row's own start from its predecessor.
  const isPlannedDateChange = (change: CellChange<AllCellTypes>) => {
    const rowData = data[change.rowId.toString()];
    return isChartRow(rowData)
      && (change.columnId === 'plannedStartDate' || change.columnId === 'plannedEndDate')
      && change.newCell.type === 'customDate';
  };
  const plannedDateChanges = changes.filter(isPlannedDateChange);
  const otherChanges = changes.filter(change => !isPlannedDateChange(change));

  if (plannedDateChanges.length > 0) {
    dispatch(pushPastState());
    plannedDateChanges.forEach((change) => {
      const rowId = change.rowId.toString();
      const chartRow = data[rowId] as ChartRow;
      const newDate = validateDateString((change.newCell as CustomDateCell).text);
      const startDate = change.columnId === 'plannedStartDate' ? newDate : validateDateString(chartRow.plannedStartDate);
      const endDate = change.columnId === 'plannedEndDate' ? newDate : validateDateString(chartRow.plannedEndDate);
      dispatch(setPlannedDate({ id: rowId, startDate, endDate }));
    });
    dispatch(updateSeparatorDates());
  }

  if (otherChanges.length === 0) {
    return;
  }

  otherChanges.forEach((change) => {
    const rowId = change.rowId.toString();
    const rowData = updatedData[rowId];

    if (isSeparatorRow(rowData) && change.columnId === secondVisibleColumnId) {
      const newCell = change.newCell;
      if (newCell.type === 'separator') {
        const separatorCell = newCell as SeparatorCell;
        const updatedText = typeof separatorCell.text === 'string' ? separatorCell.text.trim() : separatorCell.text;
        if (validateTextLength(updatedText, maxLength)) {
          updatedData[rowId] = {
            ...rowData,
            displayName: updatedText,
            isCollapsed: newCell.isCollapsed
          };
        } else {
          dispatch(clearMessageInfo());
          const errorMessage = i18next.t('Too long text.', { maxLength, inputLength: updatedText.length });
          dispatch(setMessageInfo({ message: errorMessage, severity: 'error' }));
        }
      }
    }

    if (isEventRow(rowData)) {
      const fieldName = change.columnId;
      const newCell = change.newCell;
      if (newCell.type === 'customDate') {
        const customDateCell = newCell as CustomDateCell;
        updatedData[rowId] = {
          ...rowData,
          [fieldName]: customDateCell.text
        };
      } else if (newCell.type === 'customText') {
        const customTextCell = newCell as CustomTextCell;
        const updatedText = typeof customTextCell.text === 'string' ? customTextCell.text.trim() : customTextCell.text;
        if (validateTextLength(updatedText, maxLength)) {
          updatedData[rowId] = {
            ...rowData,
            [fieldName]: updatedText
          };
        } else {
          dispatch(clearMessageInfo());
          const errorMessage = i18next.t('Too long text.', { maxLength, inputLength: updatedText.length });
          dispatch(setMessageInfo({ message: errorMessage, severity: 'error' }));
        }
      }
    }

    if (isChartRow(rowData)) {
      const chartRow = rowData;
      const fieldName = change.columnId as keyof ChartRow;
      const newCell = change.newCell;
      if (fieldName === "actualStartDate" || fieldName === "actualEndDate") {
        const customDateCell = newCell as CustomDateCell;
        const validatedDate = validateDateString(customDateCell.text);
        updatedData[rowId] = {
          ...rowData,
          [fieldName]: validatedDate
        };
      // plannedStartDate / plannedEndDate are handled above via setPlannedDate
      // (chart-drag-equivalent) and excluded from otherChanges.
      } else if (fieldName === "progress") {
        const customTextCell = newCell as CustomNumberCell;
        let updatedText: string = "";
        if (typeof customTextCell.text === 'string' || typeof customTextCell.text === 'number') {
          updatedText = customTextCell.text.toString().trim();
        }
        if (updatedText.endsWith('%')) {
          updatedText = updatedText.slice(0, -1);
        }
        const progressRaw = parseInt(updatedText, 10);
        if (!isNaN(progressRaw) && progressRaw >= 0 && progressRaw <= 100) {
          const progressText = `${progressRaw}%`;
          updatedData[rowId] = {
            ...rowData,
            progress: progressText
          };
        } else {
          updatedData[rowId] = {
            ...rowData,
            progress: ""
          };
        }
      } else if (fieldName === "plannedDays") {
        const customTextCell = newCell as CustomTextCell;
        const updatedText = typeof customTextCell.text === 'string' ? customTextCell.text.trim() : customTextCell.text;
        const plannedDaysRaw = parseInt(updatedText, 10);
        if (isNaN(plannedDaysRaw) || plannedDaysRaw <= 0) {
          updatedData[rowId] = {
            ...rowData,
            plannedEndDate: '',
            plannedDays: null
          };
        } else {
          const plannedDays = Math.min(plannedDaysRaw, 9999);
          const startDate = chartRow.plannedStartDate;
          updatedData[rowId] = {
            ...rowData,
            plannedEndDate: addPlannedDays(startDate, plannedDays, holidays, chartRow.isIncludeHolidays, true, regularDaysOff),
            plannedDays: plannedDays
          };
        }
      } else if (fieldName === "dependency") {
        const customTextCell = newCell as CustomTextCell;
        let updatedText = '';
        if (typeof customTextCell.text === 'string') {
          updatedText = customTextCell.text.trim();
        }
        if (updatedText && !updatedText.includes("^^user^^")) {
          updatedText += "^^user^^";
        }
        if (updatedText === '') {
          updatedData[rowId] = {
            ...rowData,
            dependency: updatedText,
            dependentId: ''
          };
        } else if (validateTextLength(updatedText, maxLength)) {
          updatedData[rowId] = {
            ...rowData,
            dependency: updatedText
          };
        } else {
          dispatch(clearMessageInfo());
          const errorMessage = i18next.t('Too long text.', { maxLength, inputLength: updatedText.length });
          dispatch(setMessageInfo({ message: errorMessage, severity: 'error' }));
        }
      } else if (newCell.type === 'customText') {
        const customTextCell = newCell as CustomTextCell;
        const updatedText = typeof customTextCell.text === 'string' ? customTextCell.text.trim() : customTextCell.text;
        if (validateTextLength(updatedText, maxLength)) {
          updatedData[rowId] = {
            ...rowData,
            [fieldName]: updatedText
          };
        } else {
          dispatch(clearMessageInfo());
          const errorMessage = i18next.t('Too long text.', { maxLength, inputLength: updatedText.length });
          dispatch(setMessageInfo({ message: errorMessage, severity: 'error' }));
        }
      } else if (fieldName === "isIncludeHolidays" && newCell.type === 'checkbox') {
        const checkboxCell = newCell as CheckboxCell;
        const startDate = chartRow.plannedStartDate
        updatedData[rowId] = {
          ...rowData,
          isIncludeHolidays: checkboxCell.checked,
          plannedEndDate: addPlannedDays(startDate, chartRow.plannedDays, holidays, checkboxCell.checked, true, regularDaysOff),
        };
      }
    }
  });

  dispatch(setEntireData(updatedData));
};