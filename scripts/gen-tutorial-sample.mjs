// Generate the tutorial sample projects (ja/en) into public/samples/.
// The chart itself is the teaching material: separator rows are chapters and
// each task row's display name is an instruction to try. Both zips are built
// from the single BILINGUAL definition below so the two languages stay in sync.
//
// Output format follows ExportImportHandler.serializeToZip: a zip with one
// <fileId>.json entry holding the whole project state. IDs and fileIds are
// fixed (not random) so re-running the script is deterministic and produces
// no spurious git diffs.
//
// Usage: npm run generate-tutorial-sample
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const JSZip = require('jszip');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------------------
// Per-language fixed settings
// ---------------------------------------------------------------------------

const SETTINGS = {
  ja: {
    fileId: 'tutorial-ja',
    outFile: '[サンプル]チュートリアル：Ganttyの使い方.zip',
    title: '【サンプル】チュートリアル：Ganttyの使い方',
    dateFormat: 'yyyy/M/d',
    holidayFile: 'JP.txt',
    columnNames: {
      no: 'No', wbsNumber: 'WBS', displayName: '表示名', color: '色',
      plannedStartDate: '予始', plannedEndDate: '予終', plannedDays: '日',
      actualStartDate: '実始', actualEndDate: '実終', progress: '進捗',
      dependency: '依存関係', cpPredecessors: 'CP', textColumn1: 'Text1',
      textColumn2: 'Text2', textColumn3: 'Text3', isIncludeHolidays: '含休日',
    },
    tryAlias: '👆やってみよう',
    infoAlias: '📖説明',
    noteTitle: 'チュートリアルメモ',
    noteHtml: '<p>ここには議事録や補足情報を自由に書けます。メモはプロジェクトZIPと一緒に保存されます。</p><p>左のツリーで右クリックすると、メモの追加や削除ができます。</p>',
  },
  en: {
    fileId: 'tutorial-en',
    outFile: '[Sample]Tutorial - How to Use Gantty.zip',
    title: '【Sample】Tutorial - How to Use Gantty',
    dateFormat: 'M/d/yyyy',
    holidayFile: 'US.txt',
    columnNames: {
      no: 'No', wbsNumber: 'WBS', displayName: 'DisplayName', color: 'Color',
      plannedStartDate: 'PlanS', plannedEndDate: 'PlanE', plannedDays: 'Days',
      actualStartDate: 'ActS', actualEndDate: 'ActE', progress: 'Prog',
      dependency: 'Dep', cpPredecessors: 'CP', textColumn1: 'Text1',
      textColumn2: 'Text2', textColumn3: 'Text3', isIncludeHolidays: 'IncHol',
    },
    tryAlias: '👆Try it',
    infoAlias: '📖Info',
    noteTitle: 'Tutorial note',
    noteHtml: '<p>Write meeting minutes or any background information here. Notes are saved together with the project ZIP.</p><p>Right-click in the tree on the left to add or remove notes.</p>',
  },
};

const DATE_RANGE = { startDate: '2026-06-28', endDate: '2026-09-30' };
const CELL_WIDTH = 12;
const WBS_WIDTH = 740;

// ---------------------------------------------------------------------------
// Row definitions (chapters). Each row carries both languages; `name` is
// {ja, en}. `kind` is 'sep' | 'task' | 'event'.
//   start/end/days: planned bar (omit for name-only rows)
//   dep: dependency string, cp: array of row refs (by `ref`), progress: string
// ---------------------------------------------------------------------------

const ROWS = [
  { kind: 'sep', name: { ja: '1. バーを動かしてみよう', en: '1. Try Moving Bars' } },
  {
    kind: 'task', color: 'try', start: '2026/07/06', end: '2026/07/10', days: 5,
    name: {
      ja: '← このバーを左右にドラッグしてみよう',
      en: '← Drag this bar left and right',
    },
  },
  {
    kind: 'task', color: 'try', start: '2026/07/06', end: '2026/07/08', days: 3,
    name: {
      ja: '← バーの右端をドラッグして期間を変えてみよう',
      en: '← Drag the right edge of this bar to resize it',
    },
  },
  {
    kind: 'task', color: 'try',
    name: {
      ja: 'この行の空きエリアをダブルクリックして新しいバーを描こう',
      en: 'Double-click an empty area in this row to draw a new bar',
    },
  },
  {
    kind: 'task', color: 'try', start: '2026/07/07', end: '2026/07/09', days: 3,
    name: {
      ja: 'Shift+ダブルクリックで実績バーを重ねて描こう',
      en: 'Shift + double-click to draw an actual bar on top',
    },
  },
  { kind: 'sep', name: { ja: '2. 表を編集してみよう', en: '2. Try Editing the Table' } },
  {
    kind: 'task', color: 'try', start: '2026/07/13', end: '2026/07/14', days: 2,
    name: {
      ja: '日数セルに 5 と入力してみよう(終了日が自動で伸びる)',
      en: 'Type 5 into the Days cell (the end date extends automatically)',
    },
  },
  {
    kind: 'task', color: 'try', start: '2026/07/13', end: '2026/07/17', days: 5,
    name: {
      ja: '進捗セルに 50 と入力してみよう(バーに進捗が表示される)',
      en: 'Type 50 into the Prog cell (progress appears on the bar)',
    },
  },
  {
    kind: 'task', color: 'info', start: '2026/07/15', end: '2026/07/17', days: 3,
    name: {
      ja: '行を右クリックすると行の追加・コピー・削除ができる',
      en: 'Right-click a row to add, copy or delete rows',
    },
  },
  {
    kind: 'task', color: 'info',
    name: {
      ja: 'セクション見出し(セパレータ行)は左の三角クリックで折りたためる',
      en: 'Section headers (separator rows) collapse via the triangle on the left',
    },
  },
  { kind: 'sep', name: { ja: '3. 依存関係 — バーを連動させる', en: '3. Dependencies — Chain Bars Together' } },
  {
    kind: 'task', color: 'try', start: '2026/07/21', end: '2026/07/22', days: 2,
    name: {
      ja: '← このバーを動かすと…',
      en: '← Move this bar and...',
    },
  },
  {
    kind: 'task', color: 'info', start: '2026/07/23', end: '2026/07/24', days: 2, dep: 'after,-1,1',
    name: {
      ja: '← この行がついてくる(依存関係: after,-1,1)',
      en: '← ...this one follows (dependency: after,-1,1)',
    },
  },
  {
    kind: 'task', color: 'info', start: '2026/07/27', end: '2026/07/28', days: 2, dep: 'after,-1,1',
    name: {
      ja: '← さらに連鎖する(依存関係セルの編集でGUI設定も開く)',
      en: '← It chains further (editing the cell opens a helper popover)',
    },
  },
  { kind: 'sep', name: { ja: '4. クリティカルパス', en: '4. Critical Path' } },
  {
    kind: 'task', ref: 'cpA', color: 'info', start: '2026/08/03', end: '2026/08/05', days: 3,
    name: {
      ja: '設計(CPチェーンの起点)',
      en: 'Design (start of the CP chain)',
    },
  },
  {
    kind: 'task', ref: 'cpB', color: 'info', start: '2026/08/06', end: '2026/08/12', days: 4, cp: ['cpA'],
    name: {
      ja: '実装(CP列に先行タスクの行番号が入っている)',
      en: 'Build (the CP column points at its predecessor row)',
    },
  },
  {
    kind: 'task', ref: 'cpD', color: 'info', start: '2026/08/06', end: '2026/08/07', days: 2, cp: ['cpA'],
    name: {
      ja: '並行作業(余裕あり=クリティカルではない)',
      en: 'Parallel task (has float — not critical)',
    },
  },
  {
    kind: 'task', ref: 'cpC', color: 'info', start: '2026/08/13', end: '2026/08/14', days: 2, cp: ['cpB', 'cpD'],
    name: {
      ja: 'テスト(合流。この鎖がクリティカルパスになる)',
      en: 'Test (a merge — this chain becomes the critical path)',
    },
  },
  {
    kind: 'task', color: 'try',
    name: {
      ja: '設定 > クリティカルパスを表示 をONにしてみよう',
      en: 'Turn on Setting > Show Critical Path',
    },
  },
  { kind: 'sep', name: { ja: '5. イベント行 — 1行に複数のバー', en: '5. Event Rows — Multiple Bars in One Row' } },
  {
    kind: 'event', color: 'info',
    events: [
      { name: { ja: 'キックオフ', en: 'Kickoff' }, start: '2026/08/17', end: '2026/08/17' },
      { name: { ja: '中間レビュー', en: 'Mid review' }, start: '2026/08/24', end: '2026/08/25' },
      { name: { ja: '最終レビュー', en: 'Final review' }, start: '2026/08/31', end: '2026/08/31' },
    ],
    name: {
      ja: 'レビュー会(イベント行)',
      en: 'Review meetings (event row)',
    },
  },
  {
    kind: 'task', color: 'try',
    name: {
      ja: 'イベント行はダブルクリックで何個でもバーを置ける',
      en: 'Double-click an event row to add as many bars as you like',
    },
  },
  { kind: 'sep', name: { ja: '6. 保存・エクスポート・その他', en: '6. Saving, Exporting & More' } },
  {
    kind: 'task', color: 'info',
    name: {
      ja: 'ファイル > プロジェクトZIPファイルをダウンロード で保存(自動保存はない)',
      en: 'File > Download Project ZIP to save (there is no autosave)',
    },
  },
  {
    kind: 'task', color: 'info',
    name: {
      ja: 'ファイル > エクスポート から PDF / Excel / 単体HTML を出力できる',
      en: 'File > Export offers PDF / Excel / standalone HTML',
    },
  },
  {
    kind: 'task', color: 'try',
    name: {
      ja: 'トップバーのメモ帳を開いてみよう(このプロジェクトにはメモ入り)',
      en: 'Open Notes in the top bar (this project has a note inside)',
    },
  },
  {
    kind: 'task', color: 'info',
    name: {
      ja: '困ったらトップバーのヘルプでいつでも使い方を確認できる',
      en: 'Stuck? Click Help in the top bar for the full guide',
    },
  },
];

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

const buildColumns = (names) => [
  { columnId: 'no', columnName: names.no, width: 37, resizable: false, visible: true },
  { columnId: 'wbsNumber', columnName: names.wbsNumber, width: 50, resizable: true, reorderable: false, visible: false },
  { columnId: 'displayName', columnName: names.displayName, width: 300, resizable: true, reorderable: true, visible: true },
  { columnId: 'color', columnName: names.color, width: 55, resizable: true, reorderable: true, visible: true },
  { columnId: 'plannedStartDate', columnName: names.plannedStartDate, width: 58, resizable: true, reorderable: true, visible: true },
  { columnId: 'plannedEndDate', columnName: names.plannedEndDate, width: 58, resizable: true, reorderable: true, visible: true },
  { columnId: 'plannedDays', columnName: names.plannedDays, width: 40, resizable: true, reorderable: true, visible: true },
  { columnId: 'actualStartDate', columnName: names.actualStartDate, width: 50, resizable: true, reorderable: true, visible: false },
  { columnId: 'actualEndDate', columnName: names.actualEndDate, width: 50, resizable: true, reorderable: true, visible: false },
  { columnId: 'progress', columnName: names.progress, width: 45, resizable: true, reorderable: true, visible: true },
  { columnId: 'dependency', columnName: names.dependency, width: 80, resizable: true, reorderable: true, visible: true },
  { columnId: 'cpPredecessors', columnName: names.cpPredecessors, width: 60, resizable: true, reorderable: true, visible: true },
  { columnId: 'textColumn1', columnName: names.textColumn1, width: 50, resizable: true, reorderable: true, visible: false },
  { columnId: 'textColumn2', columnName: names.textColumn2, width: 50, resizable: true, reorderable: true, visible: false },
  { columnId: 'textColumn3', columnName: names.textColumn3, width: 50, resizable: true, reorderable: true, visible: false },
  { columnId: 'isIncludeHolidays', columnName: names.isIncludeHolidays, width: 50, resizable: true, reorderable: true, visible: false },
];

const buildColors = (s) => ({
  1: { alias: s.tryAlias, color: '#70ecff51' },
  2: { alias: s.infoAlias, color: '#fffe7051' },
  3: { alias: '', color: '#8a70ff51' },
  4: { alias: '', color: '#ff70ea51' },
  5: { alias: '', color: '#ff707051' },
  6: { alias: '', color: '#76ff7051' },
  7: { alias: '', color: '#70b0ff51' },
  8: { alias: '', color: '#76ff7051' },
  9: { alias: '', color: '#76ff7051' },
  10: { alias: '', color: '#76ff7051' },
  999: { alias: '', color: '#0000003d' },
});

const buildData = (lang, s) => {
  const data = {};
  const idByRef = {};
  // First pass: assign stable ids so cp references can point at them.
  ROWS.forEach((row, index) => {
    const id = `tutorial-${lang}-${String(index + 1).padStart(2, '0')}`;
    if (row.ref) idByRef[row.ref] = id;
    row._id = id;
  });
  ROWS.forEach((row, index) => {
    const id = row._id;
    const no = index + 1;
    const displayName = row.name[lang];
    if (row.kind === 'sep') {
      data[id] = {
        no, id, rowType: 'Separator', displayName,
        isCollapsed: false, minStartDate: '', maxEndDate: '', level: 0,
      };
    } else if (row.kind === 'event') {
      data[id] = {
        no, id, rowType: 'Event', displayName,
        color: row.color === 'try' ? s.tryAlias : s.infoAlias,
        plannedStartDate: '', plannedEndDate: '', plannedDays: null,
        actualStartDate: '', actualEndDate: '', progress: '',
        textColumn1: '', textColumn2: '', textColumn3: '',
        eventData: row.events.map((ev) => ({
          isPlanned: true,
          eachDisplayName: ev.name[lang],
          startDate: ev.start,
          endDate: ev.end,
        })),
      };
    } else {
      data[id] = {
        no, id, rowType: 'Chart', displayName,
        color: row.color === 'try' ? s.tryAlias : s.infoAlias,
        plannedStartDate: row.start ?? '',
        plannedEndDate: row.end ?? '',
        plannedDays: row.days ?? null,
        actualStartDate: '', actualEndDate: '',
        dependentId: '', dependency: row.dep ?? '',
        progress: '',
        textColumn1: '', textColumn2: '', textColumn3: '',
        isIncludeHolidays: false,
        ...(row.cp ? { cpPredecessors: row.cp.map((ref) => ({ predecessorId: idByRef[ref] })) } : {}),
      };
    }
  });
  ROWS.forEach((row) => delete row._id);
  return data;
};

const buildProject = (lang) => {
  const s = SETTINGS[lang];
  const holidayInput = fs.readFileSync(
    path.join(root, 'public', 'i18n', 'holidays', s.holidayFile), 'utf8');
  const dayCount = Math.round(
    (Date.parse(DATE_RANGE.endDate) - Date.parse(DATE_RANGE.startDate)) / 86400000) + 1;
  return {
    version: 1,
    colors: buildColors(s),
    dateRange: DATE_RANGE,
    columns: buildColumns(s.columnNames),
    data: buildData(lang, s),
    holidayInput,
    holidayColor: { color: 'rgba(238, 238, 238, 1)', subColor: 'rgba(238,238,238,0.5)' },
    regularDaysOffSetting: {
      1: { color: '#d9e6ff', subColor: '#d9e6ff80', days: [] },
      2: { color: '#ffdcdc', subColor: '#ffdcdc80', days: [] },
      3: { color: 'rgba(238, 238, 238, 1)', subColor: 'rgba(238,238,238,0.5)', days: [0, 6] },
    },
    wbsWidth: WBS_WIDTH,
    calendarWidth: dayCount * CELL_WIDTH,
    cellWidth: CELL_WIDTH,
    title: s.title,
    showYear: false,
    dateFormat: s.dateFormat,
    treeData: [{ key: 'tutorial-note-1', title: s.noteTitle }],
    noteData: { 'tutorial-note-1': s.noteHtml },
    rowNoteData: {},
    language: lang,
    scrollPosition: { scrollLeft: 0, scrollTop: 0 },
    selectedNodeKey: 'tutorial-note-1',
  };
};

// ---------------------------------------------------------------------------
// Emit
// ---------------------------------------------------------------------------

for (const lang of ['ja', 'en']) {
  const s = SETTINGS[lang];
  const project = buildProject(lang);
  const zip = new JSZip();
  zip.file(`${s.fileId}.json`, JSON.stringify(project, null, 2),
    { compression: 'DEFLATE', compressionOptions: { level: 9 } });
  const buf = await zip.generateAsync({ type: 'nodebuffer' });
  const outPath = path.join(root, 'public', 'samples', s.outFile);
  fs.writeFileSync(outPath, buf);
  console.log(`written: ${outPath} (${buf.length} bytes, ${Object.keys(project.data).length} rows)`);
}
