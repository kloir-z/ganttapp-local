import JSZip from 'jszip';
import { buildGanttWorkbook, buildGanttXlsxBuffer } from './GanttExcelExport';
import { ChartRow, SeparatorRow, WBSData } from '../types/DataTypes';
import { ExtendedColumn } from '../reduxStoreAndSlices/store';

const t = ((key: string) => key) as any;

const columns: ExtendedColumn[] = [
  { columnId: 'no', columnName: 'No', width: 37, visible: true } as ExtendedColumn,
  { columnId: 'displayName', columnName: 'DisplayName', width: 100, visible: true } as ExtendedColumn,
  { columnId: 'plannedStartDate', columnName: 'PlanS', width: 50, visible: true } as ExtendedColumn,
  { columnId: 'plannedEndDate', columnName: 'PlanE', width: 50, visible: true } as ExtendedColumn,
  { columnId: 'color', columnName: 'Color', width: 50, visible: false } as ExtendedColumn,
];

const chartRow = (overrides: Partial<ChartRow>): ChartRow => ({
  no: 1, id: 'r1', rowType: 'Chart', displayName: 'Task A', color: '',
  plannedStartDate: '2024/06/03', plannedEndDate: '2024/06/07',
  plannedDays: 5, actualStartDate: '2024/06/04', actualEndDate: '2024/06/06',
  dependentId: '', dependency: '', progress: '50', textColumn1: '', textColumn2: '',
  textColumn3: '', isIncludeHolidays: false, ...overrides,
});

const sepRow = (overrides: Partial<SeparatorRow>): SeparatorRow => ({
  no: 2, id: 's1', rowType: 'Separator', displayName: 'Phase 1', isCollapsed: false,
  level: 0, minStartDate: '2024/06/03', maxEndDate: '2024/06/10', ...overrides,
});

const baseParams = (data: { [id: string]: WBSData }) => ({
  data,
  columns,
  colors: { 1: { alias: 'A', color: '#70b0ff51' }, 999: { alias: '', color: '#0000003d' } },
  fallbackColor: '#76ff7051',
  dateRange: { startDate: '2024/06/01', endDate: '2024/06/30' },
  holidays: ['2024/06/10'],
  holidayColor: { color: '#ff000020', subColor: '#ff000010' },
  regularDaysOffSetting: { 0: { color: '#88888820', subColor: '#88888810', days: [0, 6] } },
  dateFormat: 'yyyy/MM/dd' as const,
  showYear: false,
  title: 'Test Project',
  cellWidth: 8,
  t,
});

describe('buildGanttWorkbook', () => {
  it('produces a non-empty xlsx buffer with one worksheet', async () => {
    const data: { [id: string]: WBSData } = { r1: chartRow({}), s1: sepRow({}) };
    const wb = await buildGanttWorkbook(baseParams(data));
    expect(wb.worksheets).toHaveLength(1);
    const buffer = await wb.xlsx.writeBuffer();
    expect((buffer as ArrayBuffer).byteLength).toBeGreaterThan(1000);
  });

  it('fills planned and actual bar cells and reproduces the WBS table values', async () => {
    const data: { [id: string]: WBSData } = { r1: chartRow({}) };
    const wb = await buildGanttWorkbook(baseParams(data));
    const ws = wb.worksheets[0];

    // Columns: WBS No + displayName + 2 date columns (No dropped, color hidden).
    const dataRow = ws.getRow(3);
    expect(dataRow.getCell(1).value).toBe('1'); // WBS number (replaces No)
    expect(dataRow.getCell(2).value).toBe('Task A'); // displayName

    // Date grid starts at column 5 (after 4 visible WBS cols); 2024/06/01 = col 5.
    // 2024/06/03 is the 3rd day -> column 5 + 2 = 7. Planned bar should fill it.
    const plannedCell = dataRow.getCell(7);
    expect((plannedCell.fill as any)?.fgColor?.argb).toBeTruthy();
  });

  it('renders bars whose palette color is stored in rgba() form (color-picker output)', async () => {
    // The in-app color picker saves colors as "rgba(r, g, b, a)" rather than hex;
    // the export must paint those bars, not leave them blank.
    const data: { [id: string]: WBSData } = { r1: chartRow({ color: 'Team A' }) };
    const params = {
      ...baseParams(data),
      colors: {
        1: { alias: 'Team A', color: 'rgba(112, 176, 255, 0.32)' },
        999: { alias: '', color: 'rgba(0, 0, 0, 0.24)' },
      },
    };
    const wb = await buildGanttWorkbook(params);
    const ws = wb.worksheets[0];
    // 2024/06/03 -> column 7 (4 visible WBS cols + 3rd day). Planned bar must fill.
    const argb = (ws.getRow(3).getCell(7).fill as any)?.fgColor?.argb;
    expect(argb).toBeTruthy();
    expect(argb).not.toBe('FFFFFFFF'); // not white -> a real (composited blue) fill
  });

  it('fills separator rows with the light-blue band across both panes and labels chart bars', async () => {
    const data: { [id: string]: WBSData } = { s1: sepRow({ no: 1 }), r1: chartRow({ no: 2 }) };
    const wb = await buildGanttWorkbook(baseParams(data));
    const ws = wb.worksheets[0];

    // Separator (row 3): a WBS cell and a date cell are both the light blue band.
    const sepWbs = (ws.getRow(3).getCell(2).fill as any)?.fgColor?.argb;
    const sepDate = (ws.getRow(3).getCell(7).fill as any)?.fgColor?.argb;
    expect(sepWbs).toBe('FFDDEDFF');
    expect(sepDate).toBe('FFDDEDFF');

    // Chart bar (row 4): the planned bar's first date cell carries the task name.
    expect(ws.getRow(4).getCell(7).value).toBe('Task A');
  });

  it('drops the No column and assigns hierarchical WBS numbers', async () => {
    const data: { [id: string]: WBSData } = {
      s1: sepRow({ no: 1, id: 's1', displayName: 'A', level: 0 }),
      r1: chartRow({ no: 2, id: 'r1', displayName: 'T1' }),
      r2: chartRow({ no: 3, id: 'r2', displayName: 'T2' }),
      s2: sepRow({ no: 4, id: 's2', displayName: 'A1', level: 1 }),
      r3: chartRow({ no: 5, id: 'r3', displayName: 'T3' }),
    };
    const wb = await buildGanttWorkbook(baseParams(data));
    const ws = wb.worksheets[0];
    // Column 1 is the always-on WBS number column (header "WBS"); the old No column is gone.
    expect(ws.getRow(2).getCell(1).value).toBe('WBS');
    expect(ws.getRow(3).getCell(1).value).toBe('1');     // separator A
    expect(ws.getRow(4).getCell(1).value).toBe('1-1');   // task under A
    expect(ws.getRow(5).getCell(1).value).toBe('1-2');
    expect(ws.getRow(6).getCell(1).value).toBe('1-3');   // sub-separator A1
    expect(ws.getRow(7).getCell(1).value).toBe('1-3-1'); // task under A1

    // The display-name cell (col 2) is indented to its WBS depth: level 1 flush
    // left (no indent), deeper rows step right one indent unit per dash.
    expect((ws.getRow(3).getCell(2).alignment as any)?.indent ?? 0).toBe(0); // "1"
    expect((ws.getRow(4).getCell(2).alignment as any)?.indent ?? 0).toBe(1); // "1-1"
    expect((ws.getRow(6).getCell(2).alignment as any)?.indent ?? 0).toBe(1); // "1-3"
    expect((ws.getRow(7).getCell(2).alignment as any)?.indent ?? 0).toBe(2); // "1-3-1"
  });

  it('paints the color cell for content rows but leaves wholly-empty rows uncolored', async () => {
    const colsWithColor: ExtendedColumn[] = [
      { columnId: 'no', columnName: 'No', width: 37, visible: true } as ExtendedColumn,
      { columnId: 'displayName', columnName: 'DisplayName', width: 100, visible: true } as ExtendedColumn,
      { columnId: 'color', columnName: 'Color', width: 50, visible: true } as ExtendedColumn,
    ];
    const data: { [id: string]: WBSData } = {
      r1: chartRow({ no: 1, id: 'r1', displayName: 'Task A', color: 'A' }),
      r2: chartRow({
        no: 2, id: 'r2', displayName: '', color: '',
        plannedStartDate: '', plannedEndDate: '', actualStartDate: '', actualEndDate: '',
      }),
    };
    const wb = await buildGanttWorkbook({ ...baseParams(data), columns: colsWithColor });
    const ws = wb.worksheets[0];
    // Color column is the 3rd WBS cell. Content row -> filled; empty row -> no fill.
    expect((ws.getRow(3).getCell(3).fill as any)?.fgColor?.argb).toBeTruthy();
    expect((ws.getRow(4).getCell(3).fill as any)?.fgColor?.argb).toBeFalsy();
  });

  it('injects ignoredErrors so Excel suppresses the number/text-date warnings', async () => {
    const data: { [id: string]: WBSData } = { r1: chartRow({}) };
    const buffer = await buildGanttXlsxBuffer(baseParams(data));
    expect(buffer.byteLength).toBeGreaterThan(1000);
    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file('xl/worksheets/sheet1.xml')!.async('string');
    expect(xml).toContain('<ignoredErrors>');
    expect(xml).toContain('numberStoredAsText="1"');
    expect(xml).toContain('twoDigitTextYear="1"');
    // The block must sit immediately before the closing worksheet tag.
    expect(xml.trimEnd().endsWith('</ignoredErrors></worksheet>')).toBe(true);
  });

  it('shows daily dates when wide and week-of-month numbers when narrow', async () => {
    const data: { [id: string]: WBSData } = {
      r1: chartRow({ plannedStartDate: '2026/06/10', plannedEndDate: '2026/06/20' }),
    };
    const range = { startDate: '2026/06/01', endDate: '2026/06/30' };
    // Date grid starts at column 5 (4 WBS cols). 06/03 -> col 7, 06/07 (Sun) -> col 11.
    const wide = await buildGanttWorkbook({ ...baseParams(data), dateRange: range, cellWidth: 15 });
    const wideWs = wide.worksheets[0];
    expect(wideWs.getRow(2).getCell(7).value).toBe('3'); // daily date

    const narrow = await buildGanttWorkbook({ ...baseParams(data), dateRange: range, cellWidth: 5 });
    const narrowWs = narrow.worksheets[0];
    expect(narrowWs.getRow(2).getCell(7).value ?? '').toBe('');  // mid-week day blanked
    expect(narrowWs.getRow(2).getCell(11).value).toBe('2');      // Sunday shows week number
  });

  it('labels the month band with the human 1-12 month (December = 12, not 0)', async () => {
    const data: { [id: string]: WBSData } = {
      r1: chartRow({ plannedStartDate: '2026/12/03', plannedEndDate: '2026/12/10' }),
    };
    const params = { ...baseParams(data), dateRange: { startDate: '2026/12/01', endDate: '2026/12/31' } };
    const wb = await buildGanttWorkbook(params);
    const ws = wb.worksheets[0];
    // First date column is the 5th column (4 WBS cols); its month band is row 1.
    expect(ws.getRow(1).getCell(5).value).toBe('2026/12');
  });

  it('draws a faint hairline under every chart cell for even row heights', async () => {
    const data: { [id: string]: WBSData } = { r1: chartRow({}) };
    const wb = await buildGanttWorkbook(baseParams(data));
    const ws = wb.worksheets[0];
    // A plain weekday cell well outside the bar (06/20 -> col 24) still gets the line.
    const plainCell = ws.getRow(3).getCell(24);
    expect((plainCell.border?.bottom as any)?.style).toBe('hair');
    // A filled bar cell (06/03 -> col 7) gets the same bottom line.
    const barCell = ws.getRow(3).getCell(7);
    expect((barCell.border?.bottom as any)?.style).toBe('hair');
  });

  it('draws a faint day line on empty cells but never across a bar, and hides default gridlines', async () => {
    // Wide chart so every day gets a vertical line. Bar runs 06/03–06/07.
    const data: { [id: string]: WBSData } = { r1: chartRow({}) };
    const wb = await buildGanttWorkbook({ ...baseParams(data), cellWidth: 15 });
    const ws = wb.worksheets[0];
    // Default gridlines are off; we supply all visible lines ourselves.
    expect((ws.views[0] as any).showGridLines).toBe(false);
    // A plain weekday cell outside the bar (06/20 -> col 24) gets a faint left line.
    const plain = ws.getRow(3).getCell(24);
    expect((plain.border?.left as any)?.style).toBe('hair');
    expect((plain.border?.left as any)?.color?.argb).toBe('FFE6E6E6');
    // A bar cell (06/04 -> col 8, inside 06/03–06/07) gets NO left line, so the bar
    // reads as a continuous block rather than being sliced day by day.
    expect((ws.getRow(3).getCell(8).border?.left as any) ?? undefined).toBeFalsy();
  });

  it('lightens the day line as the chart narrows and drops weekday lines when very narrow', async () => {
    const range = { startDate: '2026/06/01', endDate: '2026/06/30' };
    const data: { [id: string]: WBSData } = { r1: chartRow({ plannedStartDate: '', plannedEndDate: '', actualStartDate: '', actualEndDate: '' }) };
    // Medium width (5.5 < cw <= 8): every day, extra-light line. 06/04 (Thu) -> col 8.
    const medium = await buildGanttWorkbook({ ...baseParams(data), dateRange: range, cellWidth: 7 });
    expect((medium.worksheets[0].getRow(3).getCell(8).border?.left as any)?.color?.argb).toBe('FFEEEEEE');
    // Very narrow (cw <= 5.5): weekdays have no line, only Sundays. 06/04 Thu -> col 8,
    // 06/07 Sun -> col 11.
    const narrow = await buildGanttWorkbook({ ...baseParams(data), dateRange: range, cellWidth: 5 });
    expect((narrow.worksheets[0].getRow(3).getCell(8).border?.left as any) ?? undefined).toBeFalsy();
    expect((narrow.worksheets[0].getRow(3).getCell(11).border?.left as any)?.color?.argb).toBe('FFE6E6E6');
  });

  it('honors collapsed separators by hiding their children', async () => {
    const data: { [id: string]: WBSData } = {
      s1: sepRow({ no: 1, isCollapsed: true }),
      r1: chartRow({ no: 2 }),
    };
    const wb = await buildGanttWorkbook(baseParams(data));
    const ws = wb.worksheets[0];
    // Only the separator should be rendered (row 3); row 4 must be empty.
    expect(ws.getRow(3).getCell(2).value).toBe('Phase 1');
    expect(ws.getRow(4).getCell(2).value ?? '').toBe('');
  });
});
