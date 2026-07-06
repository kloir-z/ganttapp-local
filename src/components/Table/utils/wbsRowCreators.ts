// wbsRowCreators.ts
import { ChartRow, SeparatorRow, EventRow } from '../../../types/DataTypes';
import { Row, DefaultCellTypes, NumberCell, CheckboxCell, Column, TextCell } from "@silevis/reactgrid";
import { CustomDateCell } from './CustomDateCell';
import { CustomTextCell } from './CustomTextCell';
import { SeparatorCell } from './SeparatorCell';
import { CustomNumberCell } from './CustomNumberCell';
import { CustomDependencyCell } from './CustomDependencyCell';

// Read-only, auto-computed WBS number cell (mirrors the "no" column's muted fill).
const wbsNumberCell = (wbsNo: string, background = 'rgba(128, 128, 128, 0.1)'): TextCell => ({
  type: "text", text: wbsNo, nonEditable: true, style: { background, color: '#555' }
});

export const createChartRow = (chartRow: ChartRow, columns: Column[], rowHeight: number, wbsNo = '', cpPredecessorsText = ''): Row<DefaultCellTypes | CustomTextCell | CustomDateCell | CustomNumberCell | CustomDependencyCell> => {
  const rowCells: (NumberCell | TextCell | CustomTextCell | CustomDateCell | CustomNumberCell | CheckboxCell | CustomDependencyCell)[] = columns.map(column => {
    const columnId = column.columnId as string;
     
    let cellValue = (chartRow as any)[columnId];
    if (cellValue === null || cellValue === undefined) {
      cellValue = '';
    }
    const columnWidth = column.width || 80;
    if (["plannedStartDate", "plannedEndDate", "actualStartDate", "actualEndDate"].includes(columnId)) {
      return { type: "customDate", text: cellValue, longDate: '', shortDate: '', value: NaN };
    } else if (columnId === "no") {
      return { type: "number", value: cellValue, style: { background: 'rgba(128, 128, 128, 0.1)' } };
    } else if (columnId === "wbsNumber") {
      return wbsNumberCell(wbsNo);
    } else if (columnId === "isIncludeHolidays") {
      if (cellValue === '') {
        cellValue = false;
      }
      return { type: "checkbox", checked: cellValue };
    } else if (columnId === "progress") {
      return { type: "customNumber", text: cellValue, value: NaN, columnWidth };
    } else if (columnId === "dependency") {
      return { type: "customDependency", text: cellValue, value: NaN, columnWidth, rowId: chartRow.id };
    } else if (columnId === "cpPredecessors") {
      // 内部は行IDで保持し、表示は現在の行番号に変換したテキスト(呼び出し側で算出)。
      return { type: "customText", text: cpPredecessorsText, value: NaN, columnWidth };
    } else {
      return { type: "customText", text: cellValue, value: NaN, columnWidth };
    }
  });
  return { rowId: chartRow.id, height: rowHeight, cells: rowCells, reorderable: true };
};

export const createEventRow = (eventRow: EventRow, columns: Column[], rowHeight: number, wbsNo = ''): Row<DefaultCellTypes | CustomTextCell | CustomDateCell | CustomNumberCell> => {
  const rowCells: (NumberCell | TextCell | CustomTextCell | CustomDateCell | CustomNumberCell)[] = columns.map(column => {
    const columnId = column.columnId as string;
     
    let cellValue = (eventRow as any)[columnId];
    if (cellValue === null || cellValue === undefined) {
      cellValue = '';
    }
    const columnWidth = column.width || 80;
    if (["plannedStartDate", "plannedEndDate", "actualStartDate", "actualEndDate"].includes(columnId)) {
      return { type: "customDate", text: cellValue, longDate: '', shortDate: '', value: NaN, style: { background: 'rgba(128, 128, 128, 0.1)' } };
    }
    else if (columnId === "no") {
      return { type: "number", value: cellValue, style: { background: 'rgba(128, 128, 128, 0.1)' } };
    }
    else if (columnId === "wbsNumber") {
      return wbsNumberCell(wbsNo);
    }
    else {
      return { type: "customText", text: cellValue, value: NaN, columnWidth, style: { background: 'rgba(128, 128, 128, 0.1)' } };
    }
  });
  return { rowId: eventRow.id, height: rowHeight, cells: rowCells, reorderable: true };
};

export const createSeparatorRow = (separatorRow: SeparatorRow, columns: Column[], rowHeight: number, wbsNo = ''): Row<DefaultCellTypes | SeparatorCell> => {
  // Map over the visible columns so the optional WBS column lands in its slot.
  // The editable section-name cell goes in the first data column (the first
  // column that is neither "no" nor "wbsNumber"), mirroring the original layout.
  let namePlaced = false;
  const rowCells: (NumberCell | TextCell | SeparatorCell)[] = columns.map(column => {
    const columnId = column.columnId as string;
    if (columnId === "no") {
      return { type: "number", value: separatorRow.no, style: { background: 'rgba(128, 128, 128, 0.1)' } };
    } else if (columnId === "wbsNumber") {
      return wbsNumberCell(wbsNo, '#ddedff');
    } else if (!namePlaced) {
      namePlaced = true;
      return { type: "separator", text: separatorRow.displayName, value: NaN, isCollapsed: separatorRow.isCollapsed, style: { color: 'transparent', background: '#ddedff' } };
    } else {
      return { type: "text", text: "", nonEditable: true, style: { background: '#ddedff' } };
    }
  });
  return { rowId: separatorRow.id, height: rowHeight, cells: rowCells, reorderable: true };
};