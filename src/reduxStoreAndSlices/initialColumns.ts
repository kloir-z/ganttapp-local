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
  { columnId: "cpPredecessors", columnName: "CP", width: 60, resizable: true, reorderable: true, visible: true },
  { columnId: "textColumn1", columnName: "Text1", width: 50, resizable: true, reorderable: true, visible: true },
  { columnId: "textColumn2", columnName: "Text2", width: 50, resizable: true, reorderable: true, visible: true },
  { columnId: "textColumn3", columnName: "Text3", width: 50, resizable: true, reorderable: true, visible: true },
  // Text4〜7 は後から追加された拡張テキスト列。既存レイアウトを乱さないよう
  // デフォルト非表示(列設定から表示できる)。
  { columnId: "textColumn4", columnName: "Text4", width: 50, resizable: true, reorderable: true, visible: false },
  { columnId: "textColumn5", columnName: "Text5", width: 50, resizable: true, reorderable: true, visible: false },
  { columnId: "textColumn6", columnName: "Text6", width: 50, resizable: true, reorderable: true, visible: false },
  { columnId: "textColumn7", columnName: "Text7", width: 50, resizable: true, reorderable: true, visible: false },
  { columnId: "isIncludeHolidays", columnName: "IncHol", width: 50, resizable: true, reorderable: true, visible: true },
]

// All text-column ids, in order. Shared by the color-basis feature and the
// column-order lists so adding an eighth column stays a one-line change.
export const TEXT_COLUMN_IDS = [
  "textColumn1", "textColumn2", "textColumn3", "textColumn4",
  "textColumn5", "textColumn6", "textColumn7",
] as const;

// Inject the optional read-only "WBS" column (added later) into a column list
// loaded from an older project that predates it. Placed right after "no" and
// hidden by default; idempotent.
 
export const ensureWbsNumberColumn = <T extends { columnId: string }>(columns: T[]): T[] => {
  if (!Array.isArray(columns) || columns.some(c => c.columnId === 'wbsNumber')) return columns;
  const noIdx = columns.findIndex(c => c.columnId === 'no');
  const wbsCol = { columnId: "wbsNumber", columnName: "WBS", width: 50, resizable: true, reorderable: false, visible: false } as unknown as T;
  const copy = [...columns];
  copy.splice(noIdx >= 0 ? noIdx + 1 : 0, 0, wbsCol);
  return copy;
}

// Inject the extended text columns (Text4〜7, added later) into a column list
// loaded from an older project that predates them. Placed right after the last
// existing text column (falling back to just before isIncludeHolidays, then to
// the end) and hidden by default; idempotent.
export const ensureExtendedTextColumns = <T extends { columnId: string }>(columns: T[]): T[] => {
  if (!Array.isArray(columns)) return columns;
  const missing = TEXT_COLUMN_IDS.filter(id => !columns.some(c => c.columnId === id));
  if (missing.length === 0) return columns;
  const copy = [...columns];
  let insertIdx = -1;
  for (let i = copy.length - 1; i >= 0; i--) {
    if ((TEXT_COLUMN_IDS as readonly string[]).includes(copy[i].columnId)) {
      insertIdx = i + 1;
      break;
    }
  }
  if (insertIdx === -1) {
    const incHolIdx = copy.findIndex(c => c.columnId === 'isIncludeHolidays');
    insertIdx = incHolIdx >= 0 ? incHolIdx : copy.length;
  }
  const newCols = missing.map(id => ({
    columnId: id,
    columnName: `Text${id.replace('textColumn', '')}`,
    width: 50, resizable: true, reorderable: true, visible: false,
  } as unknown as T));
  copy.splice(insertIdx, 0, ...newCols);
  return copy;
}

// Inject the critical-path predecessors column ("CP", added later) into a column
// list loaded from an older project that predates it. Placed right after the
// dependency column and hidden by default (non-disruptive for existing layouts;
// it can be turned on from the column settings); idempotent.
export const ensureCpPredecessorsColumn = <T extends { columnId: string }>(columns: T[]): T[] => {
  if (!Array.isArray(columns) || columns.some(c => c.columnId === 'cpPredecessors')) return columns;
  const depIdx = columns.findIndex(c => c.columnId === 'dependency');
  const cpCol = { columnId: "cpPredecessors", columnName: "CP", width: 60, resizable: true, reorderable: true, visible: false } as unknown as T;
  const copy = [...columns];
  copy.splice(depIdx >= 0 ? depIdx + 1 : copy.length, 0, cpCol);
  return copy;
}