// wbsRowCreators.ts
import { ChartRow, SeparatorRow, EventRow } from '../../../types/DataTypes';
import { Row, DefaultCellTypes, NumberCell, CheckboxCell, Column } from "@silevis/reactgrid";
import { CustomDateCell } from './CustomDateCell';
import { CustomTextCell } from './CustomTextCell';
import { SeparatorCell } from './SeparatorCell';
import { CustomNumberCell } from './CustomNumberCell';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fillEmptyCells = (cells: (NumberCell | CheckboxCell | CustomTextCell | CustomDateCell | CustomNumberCell | SeparatorCell)[], columnCount: number, style?: any) => {
  while (cells.length < columnCount) {
    const emptyCell: CustomTextCell = { type: "customText", text: "", value: NaN, style };
    cells.push(emptyCell);
  }
};

export const createChartRow = (chartRow: ChartRow, columns: Column[], rowHeight: number): Row<DefaultCellTypes | CustomTextCell | CustomDateCell | CustomNumberCell> => {
  const rowCells: (NumberCell | CustomTextCell | CustomDateCell | CustomNumberCell | CheckboxCell)[] = columns.map(column => {
    const columnId = column.columnId as string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cellValue = (chartRow as any)[columnId];
    if (cellValue === null || cellValue === undefined) {
      cellValue = '';
    }
    const columnWidth = column.width || 80;
    if (["plannedStartDate", "plannedEndDate", "actualStartDate", "actualEndDate"].includes(columnId)) {
      return { type: "customDate", text: cellValue, longDate: '', shortDate: '', value: NaN };
    } else if (columnId === "no") {
      return { type: "number", value: cellValue, style: { background: 'rgba(128, 128, 128, 0.1)' } };
    } else if (columnId === "isIncludeHolidays") {
      if (cellValue === '') {
        cellValue = false;
      }
      return { type: "checkbox", checked: cellValue };
    } else if (columnId === "progress") {
      return { type: "customNumber", text: cellValue, value: NaN, columnWidth };
    } else {
      return { type: "customText", text: cellValue, value: NaN, columnWidth };
    }
  });
  return { rowId: chartRow.id, height: rowHeight, cells: rowCells, reorderable: true };
};

export const createEventRow = (eventRow: EventRow, columns: Column[], rowHeight: number): Row<DefaultCellTypes | CustomTextCell | CustomDateCell | CustomNumberCell> => {
  const rowCells: (NumberCell | CustomTextCell | CustomDateCell | CustomNumberCell)[] = columns.map(column => {
    const columnId = column.columnId as string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    else {
      return { type: "customText", text: cellValue, value: NaN, columnWidth, style: { background: 'rgba(128, 128, 128, 0.1)' } };
    }
  });
  return { rowId: eventRow.id, height: rowHeight, cells: rowCells, reorderable: true };
};

export const createSeparatorRow = (separatorRow: SeparatorRow, columns: Column[], rowHeight: number): Row<DefaultCellTypes | SeparatorCell> => {
  const rowCells: (NumberCell | SeparatorCell)[] = [
    { type: "number", value: separatorRow.no, style: { background: 'rgba(128, 128, 128, 0.1)' } },
    { type: "separator", text: separatorRow.displayName, value: NaN, isCollapsed: separatorRow.isCollapsed, style: { color: 'transparent', background: '#ddedff' } }
  ];
  fillEmptyCells(rowCells, columns.length, { background: '#ddedff' });
  return { rowId: separatorRow.id, height: rowHeight, cells: rowCells, reorderable: true };
};