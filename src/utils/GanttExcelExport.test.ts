import JSZip from 'jszip';
import { buildGanttWorkbook, buildGanttXlsxBuffer, htmlToPlainText, noteContentToPlainText, NotesExportData } from './GanttExcelExport';
import { ChartRow, EventRow, SeparatorRow, WBSData } from '../types/DataTypes';
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

const eventRow = (overrides: Partial<EventRow>): EventRow => ({
  no: 1, id: 'e1', rowType: 'Event', displayName: 'Milestones', color: '',
  plannedStartDate: '', plannedEndDate: '', plannedDays: null,
  actualStartDate: '', actualEndDate: '', progress: '',
  textColumn1: '', textColumn2: '', textColumn3: '', eventData: [], ...overrides,
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

  it('labels planned event bars with their per-event name but leaves actual ones unlabeled', async () => {
    const data: { [id: string]: WBSData } = {
      e1: eventRow({
        eventData: [
          { isPlanned: true, eachDisplayName: 'Kickoff', startDate: '2024/06/05', endDate: '2024/06/05' },
          { isPlanned: false, eachDisplayName: 'Delivered', startDate: '2024/06/12', endDate: '2024/06/12' },
        ],
      }),
    };
    const wb = await buildGanttWorkbook(baseParams(data));
    const ws = wb.worksheets[0];
    // 4 visible WBS cols; date grid starts at col 5 (06/01). 06/05 -> col 9, 06/12 -> col 16.
    expect(ws.getRow(3).getCell(9).value).toBe('Kickoff');       // planned event -> labeled
    expect(ws.getRow(3).getCell(16).value ?? '').toBe('');        // actual event -> no label
    // The actual event's bar cell is still painted even though it carries no label.
    expect((ws.getRow(3).getCell(16).fill as any)?.fgColor?.argb).toBeTruthy();
  });

  it('does not append a Notes worksheet when no notes are provided', async () => {
    const data: { [id: string]: WBSData } = { r1: chartRow({}) };
    const wb = await buildGanttWorkbook(baseParams(data));
    expect(wb.worksheets).toHaveLength(1);
  });

  it('appends a Notes worksheet with the notepad tree and per-row notes', async () => {
    const data: { [id: string]: WBSData } = { r1: chartRow({ id: 'r1', displayName: 'Task A' }) };
    const notes: NotesExportData = {
      treeData: [
        {
          key: 'n1', title: 'Parent', updatedAt: '2024/06/01T10:00:00',
          children: [{ key: 'n2', title: 'Child' }],
        },
      ],
      noteData: {
        n1: '<p>Hello <strong>world</strong></p><p>line2</p>',
        n2: '<ul><li>a</li><li>b</li></ul>',
      },
      rowNoteData: { r1: '<p>row note body</p>', missing: '   ' },
    };
    const wb = await buildGanttWorkbook({ ...baseParams(data), notes });
    expect(wb.worksheets).toHaveLength(2);
    const nws = wb.worksheets[1];

    // Tree section: title + header + two nodes (Parent, indented Child).
    expect(nws.getRow(1).getCell(1).value).toBe('Notes');
    expect(nws.getRow(3).getCell(1).value).toBe('Parent');
    expect(nws.getRow(3).getCell(2).value).toBe('Hello world\nline2');
    expect(nws.getRow(4).getCell(1).value).toBe('Child');
    expect((nws.getRow(4).getCell(1).alignment as any)?.indent).toBe(1);
    expect(nws.getRow(4).getCell(2).value).toBe('• a\n• b');

    // Row-notes section: blank-only entries are dropped; the real one is labeled
    // with its WBS number + task name.
    expect(nws.getRow(6).getCell(1).value).toBe('Row Notes');
    expect(nws.getRow(8).getCell(1).value).toBe('1  Task A');
    expect(nws.getRow(8).getCell(2).value).toBe('row note body');
  });

  it('gives the Notes sheet its own ignoredErrors range covering its used cells', async () => {
    const data: { [id: string]: WBSData } = { r1: chartRow({}) };
    const notes: NotesExportData = {
      treeData: [{ key: 'n1', title: 'Note' }],
      noteData: { n1: '<p>body</p>' },
      rowNoteData: {},
    };
    const buffer = await buildGanttXlsxBuffer({ ...baseParams(data), notes });
    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file('xl/worksheets/sheet2.xml')!.async('string');
    expect(xml).toContain('<ignoredErrors>');
    expect(xml.trimEnd().endsWith('</ignoredErrors></worksheet>')).toBe(true);
  });

  it('joins two planned event labels that start in the same cell instead of dropping one', async () => {
    const data: { [id: string]: WBSData } = {
      e1: eventRow({
        eventData: [
          { isPlanned: true, eachDisplayName: 'Design', startDate: '2024/06/05', endDate: '2024/06/05' },
          { isPlanned: true, eachDisplayName: 'Review', startDate: '2024/06/05', endDate: '2024/06/07' },
        ],
      }),
    };
    const wb = await buildGanttWorkbook(baseParams(data));
    // Both events start 06/05 -> col 9; the label must carry both names.
    expect(wb.worksheets[0].getRow(3).getCell(9).value).toBe('Design / Review');
  });

  it("does not paint an event row's own planned/actual dates as bars (chart shows only eventData)", async () => {
    const data: { [id: string]: WBSData } = {
      e1: eventRow({
        plannedStartDate: '2024/06/05', plannedEndDate: '2024/06/07',
        actualStartDate: '2024/06/05', actualEndDate: '2024/06/07',
        eventData: [],
      }),
    };
    const wb = await buildGanttWorkbook(baseParams(data));
    const ws = wb.worksheets[0];
    // 06/05 -> col 9 (a plain weekday). With empty eventData nothing should fill it.
    expect((ws.getRow(3).getCell(9).fill as any)?.fgColor?.argb).toBeFalsy();
    // The left WBS table still shows the typed planned start date, as on screen.
    expect(ws.getRow(3).getCell(3).value).toBeTruthy();
  });

  it('renames the Notes sheet case-insensitively so a "notes"-titled project still exports', async () => {
    const data: { [id: string]: WBSData } = { r1: chartRow({}) };
    const notes: NotesExportData = {
      treeData: [{ key: 'n1', title: 'Note' }], noteData: { n1: '<p>x</p>' }, rowNoteData: {},
    };
    // Gantt sheet becomes "notes"; the Notes sheet ("Notes") collides case-insensitively.
    const wb = await buildGanttWorkbook({ ...baseParams(data), title: 'notes', notes });
    expect(wb.worksheets).toHaveLength(2);
    expect(wb.worksheets[0].name).toBe('notes');
    expect(wb.worksheets[1].name).toBe('Notes (2)');
  });

  it('sanitizes Excel-forbidden characters out of the sheet name derived from the title', async () => {
    const data: { [id: string]: WBSData } = { r1: chartRow({}) };
    const wb = await buildGanttWorkbook({ ...baseParams(data), title: 'A/B: Plan [v2]' });
    // : \ / ? * [ ] are illegal in sheet names; they are replaced with spaces.
    expect(wb.worksheets[0].name).toBe('A B Plan v2');
  });

  it('also strips the full-width CJK variants of forbidden chars (Excel rejects them too)', async () => {
    // A Japanese title like "…チュートリアル：Gantty…" carries a full-width colon
    // (U+FF1A); Excel treats it like ":" and flags the file for repair if it
    // survives into a sheet name. All of ：＼／？＊［］ must be stripped.
    const data: { [id: string]: WBSData } = { r1: chartRow({}) };
    const wb = await buildGanttWorkbook({ ...baseParams(data), title: 'レポート：A／B［v2］' });
    const name = wb.worksheets[0].name;
    expect(name).toBe('レポート A B v2');
    expect(/[：＼／？＊［］:\\/?*[\]]/.test(name)).toBe(false);
  });

  it('renders Quill-Delta-stored note bodies as plain text, not raw JSON', async () => {
    // QuillEditor saves note bodies as JSON.stringify(editor.getContents()) —
    // a Delta document — so the export must decode it (raw {"ops":[...]} text
    // in a cell is the bug this guards against). HTML remains as a legacy form.
    const data: { [id: string]: WBSData } = { r1: chartRow({ id: 'r1', displayName: 'Task A' }) };
    const notes: NotesExportData = {
      treeData: [{ key: 'n1', title: 'Delta note' }],
      noteData: { n1: '{"ops":[{"insert":"tree body\\n"}]}' },
      rowNoteData: { r1: '{"ops":[{"insert":"テストテスト\\n"}]}' },
    };
    const wb = await buildGanttWorkbook({ ...baseParams(data), notes });
    const nws = wb.worksheets[1];
    // Tree: title row 1, header 2, node 3. Row notes: spacer 4, title 5, header 6, entry 7.
    expect(nws.getRow(3).getCell(2).value).toBe('tree body');
    expect(nws.getRow(7).getCell(2).value).toBe('テストテスト');
  });

  it('clamps a note body longer than Excel\'s 32,767-char cell limit', async () => {
    const data: { [id: string]: WBSData } = { r1: chartRow({}) };
    const notes: NotesExportData = {
      treeData: [{ key: 'n1', title: 'Big' }],
      noteData: { n1: `<p>${'x'.repeat(40000)}</p>` },
      rowNoteData: {},
    };
    const wb = await buildGanttWorkbook({ ...baseParams(data), notes });
    const content = wb.worksheets[1].getRow(3).getCell(2).value as string;
    expect(content.length).toBe(32767);
    expect(content.endsWith('…')).toBe(true);
  });
});

describe('htmlToPlainText', () => {
  it('turns <br> and block-closing tags into newlines', () => {
    expect(htmlToPlainText('<p>a</p><p>b</p>')).toBe('a\nb');
    expect(htmlToPlainText('a<br>b')).toBe('a\nb');
    expect(htmlToPlainText('a<br/>b')).toBe('a\nb');
  });

  it('renders list items as bullet lines', () => {
    expect(htmlToPlainText('<ul><li>x</li><li>y</li></ul>')).toBe('• x\n• y');
  });

  it('strips inline tags and decodes entities (with &amp; resolved last)', () => {
    expect(htmlToPlainText('<p><strong>Bold</strong> &amp; <em>it</em></p>')).toBe('Bold & it');
    expect(htmlToPlainText('&lt;tag&gt;&nbsp;end')).toBe('<tag> end');
    expect(htmlToPlainText('&amp;lt;')).toBe('&lt;');
  });

  it('returns an empty string for empty or content-free markup', () => {
    expect(htmlToPlainText('')).toBe('');
    expect(htmlToPlainText(undefined)).toBe('');
    expect(htmlToPlainText('<p><br></p>')).toBe('');
  });
});

describe('noteContentToPlainText', () => {
  const delta = (ops: unknown[]) => JSON.stringify({ ops });

  it('decodes a simple Delta document', () => {
    expect(noteContentToPlainText(delta([{ insert: 'テストテスト\n' }]))).toBe('テストテスト');
    expect(noteContentToPlainText(delta([{ insert: 'line1\nline2\n' }]))).toBe('line1\nline2');
  });

  it('drops inline formatting attributes but keeps the text', () => {
    expect(noteContentToPlainText(delta([
      { insert: 'bold', attributes: { bold: true } },
      { insert: ' and ' },
      { insert: 'red', attributes: { color: '#ff0000' } },
      { insert: '\n' },
    ]))).toBe('bold and red');
  });

  it('renders list lines with markers (block attributes live on the newline)', () => {
    expect(noteContentToPlainText(delta([
      { insert: 'item1' }, { insert: '\n', attributes: { list: 'bullet' } },
      { insert: 'done' }, { insert: '\n', attributes: { list: 'checked' } },
      { insert: 'todo' }, { insert: '\n', attributes: { list: 'unchecked' } },
    ]))).toBe('• item1\n☑ done\n☐ todo');
  });

  it('indents lines by their indent attribute', () => {
    expect(noteContentToPlainText(delta([
      { insert: 'child' }, { insert: '\n', attributes: { list: 'bullet', indent: 1 } },
    ]))).toBe('  • child');
  });

  it('renders the divider embed as a horizontal line', () => {
    expect(noteContentToPlainText(delta([
      { insert: 'above\n' },
      { insert: { divider: true } },
      { insert: 'below\n' },
    ]))).toBe('above\n──────────\nbelow');
  });

  it('falls back to HTML conversion for legacy non-Delta content', () => {
    expect(noteContentToPlainText('<p>Hello <strong>world</strong></p>')).toBe('Hello world');
    expect(noteContentToPlainText('plain text')).toBe('plain text');
    expect(noteContentToPlainText('')).toBe('');
    expect(noteContentToPlainText(undefined)).toBe('');
    // JSON that isn't a Delta (no ops array) is treated as literal text.
    expect(noteContentToPlainText('{"foo":1}')).toBe('{"foo":1}');
  });

  it('treats an empty Delta document as empty content', () => {
    expect(noteContentToPlainText(delta([{ insert: '\n' }]))).toBe('');
  });
});
