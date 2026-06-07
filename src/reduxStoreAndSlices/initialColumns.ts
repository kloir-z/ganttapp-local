export const initialColumns = [
  { columnId: "no", columnName: "No", width: 37, resizable: false, visible: true },
  { columnId: "wbsNumber", columnName: "WBS", width: 50, resizable: true, reorderable: false, visible: false },
  { columnId: "displayName", columnName: "DisplayName", width: 100, resizable: true, reorderable: true, visible: true },
  { columnId: "color", columnName: "Color", width: 50, resizable: true, reorderable: true, visible: true },
  { columnId: "plannedStartDate", columnName: "PlanS", width: 50, resizable: true, reorderable: true, visible: true },
  { columnId: "plannedEndDate", columnName: "PlanE", width: 50, resizable: true, reorderable: true, visible: true },
  { columnId: "plannedDays", columnName: "Days", width: 40, resizable: true, reorderable: true, visible: true },
  { columnId: "actualStartDate", columnName: "ActS", width: 50, resizable: true, reorderable: true, visible: true },
  { columnId: "actualEndDate", columnName: "ActE", width: 50, resizable: true, reorderable: true, visible: true },
  { columnId: "progress", columnName: "Prog", width: 50, resizable: true, reorderable: true, visible: true },
  { columnId: "dependency", columnName: "Dep", width: 60, resizable: true, reorderable: true, visible: true },
  { columnId: "textColumn1", columnName: "Text1", width: 50, resizable: true, reorderable: true, visible: true },
  { columnId: "textColumn2", columnName: "Text2", width: 50, resizable: true, reorderable: true, visible: true },
  { columnId: "textColumn3", columnName: "Text3", width: 50, resizable: true, reorderable: true, visible: true },
  { columnId: "isIncludeHolidays", columnName: "IncHol", width: 50, resizable: true, reorderable: true, visible: true },
]

// Inject the optional read-only "WBS" column (added later) into a column list
// loaded from an older project that predates it. Placed right after "no" and
// hidden by default; idempotent.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ensureWbsNumberColumn = <T extends { columnId: string }>(columns: T[]): T[] => {
  if (!Array.isArray(columns) || columns.some(c => c.columnId === 'wbsNumber')) return columns;
  const noIdx = columns.findIndex(c => c.columnId === 'no');
  const wbsCol = { columnId: "wbsNumber", columnName: "WBS", width: 50, resizable: true, reorderable: false, visible: false } as unknown as T;
  const copy = [...columns];
  copy.splice(noIdx >= 0 ? noIdx + 1 : 0, 0, wbsCol);
  return copy;
}