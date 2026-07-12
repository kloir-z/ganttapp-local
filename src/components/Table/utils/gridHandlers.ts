// gridHandlers.ts
import i18next from 'i18next';
import { CellChange, TextCell, NumberCell, CheckboxCell, EmailCell, DropdownCell, ChevronCell, HeaderCell, TimeCell, DateCell } from "@silevis/reactgrid";
import { WBSData, ChartRow, isChartRow, isEventRow, isSeparatorRow } from '../../../types/DataTypes';
import { setEntireData, setPlannedDate, updateSeparatorDates, pushPastState, ExtendedColumn, setMessageInfo, clearMessageInfo, AppDispatch } from '../../../reduxStoreAndSlices/store';
import { CustomDateCell } from './CustomDateCell';
import { CustomTextCell } from "./CustomTextCell";
import { addPlannedDays, validateDateString } from "../../../utils/CommonUtils";
import { parseCpPredecessorsText } from "../../../utils/CriticalPath";
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

  if (otherChanges.length > 0) {
    applyOtherChanges(dispatch, updatedData, otherChanges, secondVisibleColumnId, maxLength, holidays, regularDaysOff);
    dispatch(setEntireData(updatedData));
  }

  // 予定日は setEntireData の後に適用する(範囲ペーストで予定日と他列が同時に来たとき、
  // 古いデータ起点の setEntireData に上書きされないように)。setEntireData 自身が
  // undo スナップショットを積むので、pushPastState は単独時のみ。
  if (plannedDateChanges.length > 0) {
    if (otherChanges.length === 0) {
      dispatch(pushPastState());
    }
    // 同一行の開始日・終了日が同時に届く範囲ペーストでは、行ごとに1回の
    // setPlannedDate にまとめる(別々に dispatch すると、後の dispatch が
    // もう片方の日付をペースト前の値で戻してしまう)。
    const plannedByRow = new Map<string, { startDate?: string; endDate?: string }>();
    plannedDateChanges.forEach((change) => {
      const rowId = change.rowId.toString();
      const entry = plannedByRow.get(rowId) ?? {};
      const newDate = validateDateString((change.newCell as CustomDateCell).text);
      if (change.columnId === 'plannedStartDate') {
        entry.startDate = newDate;
      } else {
        entry.endDate = newDate;
      }
      plannedByRow.set(rowId, entry);
    });
    plannedByRow.forEach((entry, rowId) => {
      const chartRow = data[rowId] as ChartRow;
      dispatch(setPlannedDate({
        id: rowId,
        startDate: entry.startDate ?? validateDateString(chartRow.plannedStartDate),
        endDate: entry.endDate ?? validateDateString(chartRow.plannedEndDate),
      }));
    });
    dispatch(updateSeparatorDates());
  }
};

const applyOtherChanges = (dispatch: AppDispatch, updatedData: { [id: string]: WBSData }, otherChanges: CellChange<AllCellTypes>[], secondVisibleColumnId: string | null, maxLength: number, holidays: string[], regularDaysOff: number[]) => {
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
      if (fieldName === 'cpPredecessors') {
        // CP先行は ChartRow 専用。イベント行のセルに入力されても無視する。
        return;
      }
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
      } else if (fieldName === "cpPredecessors") {
        // クリティカルパス先行列: 行番号(+/-lag)のテキストを行ID配列にパースして保持。
        // 既存の dependency とは独立しており、日付の再計算は発生しない。
        const customTextCell = newCell as CustomTextCell;
        const updatedText = typeof customTextCell.text === 'string' ? customTextCell.text.trim() : '';
        updatedData[rowId] = {
          ...rowData,
          cpPredecessors: parseCpPredecessorsText(updatedText, updatedData, rowId)
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
};