// Shared mechanical WBS numbering, used by both the Excel export and the
// optional on-screen "WBS" column. Numbers follow the visible (collapse-aware)
// row order: separator rows occupy their own `level` depth, leaf rows (chart/
// event) sit one level below the current section. Produces "1", "1-1", "1-1-1".
import { createSelector } from '@reduxjs/toolkit';
import { WBSData, ChartRow, EventRow, isSeparatorRow, isChartRow, isEventRow } from '../types/DataTypes';

// A leaf (chart/event) row counts as "empty" when it has no name and no content
// (dates / events). Empty rows are skipped by the WBS numbering so blank
// placeholder rows don't consume a number.
const isEmptyLeafRow = (row: WBSData): boolean => {
  if (isSeparatorRow(row)) return false;
  const named = ((row as ChartRow | EventRow).displayName || '').trim() !== '';
  if (named) return false;
  if (isChartRow(row)) {
    const r = row as ChartRow;
    return !r.plannedStartDate && !r.plannedEndDate && !r.actualStartDate && !r.actualEndDate;
  }
  if (isEventRow(row)) {
    const r = row as EventRow;
    return !r.eventData || r.eventData.length === 0;
  }
  return true;
};

// The rows that are actually shown, skipping anything inside a collapsed section.
export const collectVisibleRows = (data: { [id: string]: WBSData }): WBSData[] => {
  const result: WBSData[] = [];
  const collapseStack: number[] = [];
  Object.values(data).forEach((entry) => {
    if (isSeparatorRow(entry)) {
      while (collapseStack.length > 0 && collapseStack[collapseStack.length - 1] >= (entry.level || 0)) {
        collapseStack.pop();
      }
      if (collapseStack.length > 0) return;
      result.push(entry);
      if (entry.isCollapsed) collapseStack.push(entry.level || 0);
    } else {
      if (collapseStack.length > 0) return;
      result.push(entry);
    }
  });
  return result;
};

export const computeWbsNumbers = (rows: WBSData[]): string[] => {
  const counters: number[] = [];
  let leafDepth = 0;
  return rows.map((row) => {
    // Empty leaf rows are not numbered and do not advance the counter.
    if (isEmptyLeafRow(row)) return '';
    const depth = isSeparatorRow(row) ? (row.level ?? 0) : leafDepth;
    counters.length = depth + 1; // truncate any deeper counters
    counters[depth] = (counters[depth] ?? 0) + 1;
    if (isSeparatorRow(row)) leafDepth = depth + 1;
    const parts: number[] = [];
    for (let i = 0; i <= depth; i += 1) parts.push(counters[i] ?? 1);
    return parts.join('-');
  });
};

// Convenience map (rowId -> WBS number) for the visible rows.
export const buildWbsNumberMap = (data: { [id: string]: WBSData }): { [id: string]: string } => {
  const rows = collectVisibleRows(data);
  const numbers = computeWbsNumbers(rows);
  const map: { [id: string]: string } = {};
  rows.forEach((row, i) => { map[row.id] = numbers[i]; });
  return map;
};

// Memoized selector so the map is computed once per data change and shared by all
// consumers (the table column and every row-note popover).
export const selectWbsNumberMap = createSelector(
  [(state: { wbsData: { data: { [id: string]: WBSData } } }) => state.wbsData.data],
  (data) => buildWbsNumberMap(data)
);
