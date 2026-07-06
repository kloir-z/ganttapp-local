// GanttExcelExport.ts
// Builds an .xlsx workbook that reproduces the on-screen Gantt chart as closely
// as the spreadsheet model allows: the left WBS table followed by a one-column-
// per-day grid where planned/actual bars, weekends and holidays are rendered as
// solid cell fills. Bars are layered exactly like the live chart (planned bar,
// then the semi-transparent actual bar on top), so per-cell colors are computed
// by alpha-compositing each layer over the day's background.
import { Workbook, Column } from 'exceljs';
import JSZip from 'jszip';
import { cdate } from 'cdate';
import { TFunction } from 'i18next';
import {
  WBSData,
  ChartRow,
  EventRow,
  DateFormatType,
  RegularDaysOffSettingsType,
  HolidayColor,
  isChartRow,
  isEventRow,
  isSeparatorRow,
} from '../types/DataTypes';
import { ColorInfo } from '../reduxStoreAndSlices/colorSlice';
import { ExtendedColumn } from '../reduxStoreAndSlices/store';
import { generateDates, isHoliday } from './CommonUtils';
import { formatCpPredecessorsText } from './CriticalPath';
import { collectVisibleRows, computeWbsNumbers } from './wbsNumber';
import { standardizeLongDateFormat, standardizeShortDateFormat } from '../components/Table/utils/wbsHelpers';

export interface BuildGanttWorkbookParams {
  data: { [id: string]: WBSData };
  columns: ExtendedColumn[];
  colors: { [id: number]: ColorInfo };
  fallbackColor: string;
  dateRange: { startDate: string; endDate: string };
  holidays: string[];
  holidayColor: HolidayColor;
  regularDaysOffSetting: RegularDaysOffSettingsType;
  dateFormat: DateFormatType;
  showYear: boolean;
  title: string;
  cellWidth: number;
  t: TFunction;
}

type RGB = { r: number; g: number; b: number };
type RGBA = RGB & { a: number };

const WHITE: RGB = { r: 255, g: 255, b: 255 };
// Separator rows fill the whole row (table + chart) with this light blue so the
// section divider reads seamlessly, exactly like the live chart (#ddedff). When a
// separator is collapsed, the chart overlays a gray band across its date span.
const SEPARATOR_BG = '#ddedff';
const SEPARATOR_COLLAPSED_BAND = '#bfbfbf5d';
// A cleaner-looking font than Excel's default; falls back gracefully if absent.
const FONT = 'Meiryo';

// Parse a CSS color into RGBA. Supports both the hex forms (#rgb / #rgba /
// #rrggbb / #rrggbbaa) and the rgb()/rgba() forms the in-app color picker saves
// (e.g. "rgba(112, 236, 255, 0.32)"). Returns null for empty/unrecognized input.
const parseColor = (input: string | undefined | null): RGBA | null => {
  if (!input) return null;
  const s = input.trim();
  const rgbMatch = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i);
  if (rgbMatch) {
    const r = Number(rgbMatch[1]);
    const g = Number(rgbMatch[2]);
    const b = Number(rgbMatch[3]);
    const a = rgbMatch[4] !== undefined ? Number(rgbMatch[4]) : 1;
    if ([r, g, b, a].some((v) => Number.isNaN(v))) return null;
    return { r, g, b, a };
  }
  let h = s.replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  else if (h.length === 4) h = h.split('').map((c) => c + c).join('');
  if (h.length === 6) h += 'ff';
  if (h.length !== 8 || !/^[0-9a-fA-F]{8}$/.test(h)) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = parseInt(h.slice(6, 8), 16) / 255;
  if ([r, g, b].some((v) => Number.isNaN(v)) || Number.isNaN(a)) return null;
  return { r, g, b, a };
};

// Composite a (possibly translucent) foreground over an opaque background.
const composite = (bg: RGB, fg: RGBA | null): RGB => {
  if (!fg || fg.a <= 0) return bg;
  return {
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
  };
};

const toHex2 = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
// exceljs wants opaque ARGB strings (e.g. 'FFRRGGBB').
const toARGB = (rgb: RGB) => `FF${toHex2(rgb.r)}${toHex2(rgb.g)}${toHex2(rgb.b)}`.toUpperCase();

// Resolve a chart/event row's planned bar color the same way the chart does:
// blank color -> fallback; otherwise match the alias against the color palette.
const resolvePlannedColor = (
  entryColor: string,
  colors: { [id: number]: ColorInfo },
  fallbackColor: string,
): string => {
  if (entryColor === '') return fallbackColor;
  const colorInfo = Object.values(colors).find((info) =>
    info.alias.split(',').map((alias) => alias.trim()).includes(entryColor),
  );
  return colorInfo ? colorInfo.color : fallbackColor;
};

const toKey = (dateStr: string | undefined | null): string => {
  if (!dateStr) return '';
  try {
    return cdate(dateStr).format('YYYYMMDD');
  } catch {
    return '';
  }
};

// Map a stored WBS column id to its display text for a given row.
const cellTextFor = (
  columnId: string,
  row: WBSData,
  dateFormat: DateFormatType,
  showYear: boolean,
  data?: { [id: string]: WBSData },
): string => {
  const formatDate = (v: string) =>
    (showYear ? standardizeLongDateFormat(v, dateFormat) : standardizeShortDateFormat(v, dateFormat)) || '';
  switch (columnId) {
    case 'no':
      return row.no != null ? String(row.no) : '';
    case 'displayName':
      return row.displayName || '';
    default:
      break;
  }
  if (isChartRow(row) || isEventRow(row)) {
    const r: ChartRow | EventRow = row;
    switch (columnId) {
      case 'color':
        return r.color || '';
      case 'plannedStartDate':
        return formatDate(r.plannedStartDate);
      case 'plannedEndDate':
        return formatDate(r.plannedEndDate);
      case 'plannedDays':
        return r.plannedDays != null ? String(r.plannedDays) : '';
      case 'actualStartDate':
        return formatDate(r.actualStartDate);
      case 'actualEndDate':
        return formatDate(r.actualEndDate);
      case 'progress':
        return r.progress || '';
      case 'dependency':
        return isChartRow(row) ? row.dependency || '' : '';
      case 'cpPredecessors':
        // クリティカルパス先行列: 画面と同じく現在の行番号表記で出力する。
        return isChartRow(row) && data ? formatCpPredecessorsText(row, data) : '';
      case 'textColumn1':
        return r.textColumn1 || '';
      case 'textColumn2':
        return r.textColumn2 || '';
      case 'textColumn3':
        return r.textColumn3 || '';
      case 'isIncludeHolidays':
        return isChartRow(row) && row.isIncludeHolidays ? '✓' : '';
      default:
        return '';
    }
  }
  return '';
};

// Filter the data into render order, honoring collapsed separators exactly like
// the chart's filteredData does.
// Crop trailing empty date columns: keep up to one month past the last content
// date (mirrors the PDF export's exportDateColumns crop).
const croppedDateCount = (
  dateArray: ReturnType<typeof cdate>[],
  data: { [id: string]: WBSData },
): number => {
  let maxKey = '';
  Object.values(data).forEach((row) => {
    if (isChartRow(row) || isEventRow(row)) {
      [row.plannedEndDate, row.actualEndDate].forEach((d) => {
        const k = toKey(d);
        if (k > maxKey) maxKey = k;
      });
      if (isEventRow(row)) {
        row.eventData?.forEach((e) => {
          const k = toKey(e.endDate);
          if (k > maxKey) maxKey = k;
        });
      }
    } else if (isSeparatorRow(row)) {
      const k = toKey(row.maxEndDate);
      if (k > maxKey) maxKey = k;
    }
  });
  if (!maxKey) return dateArray.length;
  const cropKey = cdate(
    `${maxKey.slice(0, 4)}/${maxKey.slice(4, 6)}/${maxKey.slice(6, 8)}`,
  ).add(1, 'month').format('YYYYMMDD');
  const cropIdx = dateArray.findIndex((d) => d.format('YYYYMMDD') >= cropKey);
  return cropIdx === -1 ? dateArray.length : cropIdx + 1;
};

export const buildGanttWorkbook = async (params: BuildGanttWorkbookParams): Promise<Workbook> => {
  const {
    data, columns, colors, fallbackColor, dateRange, holidays, holidayColor,
    regularDaysOffSetting, dateFormat, showYear, title, cellWidth, t,
  } = params;

  // Drop the on-screen 'No' column (Excel's own row numbers replace it). Always
  // emit the mechanical WBS-number column up front, even when it's hidden on
  // screen — it carries the hierarchy ("1" / "1-1" / "1-1-1").
  const dataColumns = columns.filter(
    (c) => c.visible !== false && c.columnId !== 'no' && c.columnId !== 'wbsNumber',
  );
  const wbsNumberCol = columns.find((c) => c.columnId === 'wbsNumber');
  const wbsColumns: { columnId: string; columnName: string; width: number }[] = [
    { columnId: 'wbsNumber', columnName: wbsNumberCol?.columnName || 'WBS', width: wbsNumberCol?.width || 50 },
    ...dataColumns.map((c) => ({ columnId: c.columnId, columnName: c.columnName, width: c.width || 50 })),
  ];
  const rows = collectVisibleRows(data);
  const wbsNumbers = computeWbsNumbers(rows);
  const fullDates = generateDates(dateRange.startDate, dateRange.endDate);
  const dateCount = croppedDateCount(fullDates, data);
  const dates = fullDates.slice(0, dateCount);

  // Below this cell width the chart stops showing daily dates and switches to
  // week-of-month numbers; the export mirrors that exactly.
  const narrow = cellWidth <= 8;

  // Precompute per-day metadata (key, background fill, header text).
  const dayInfos = dates.map((d) => {
    const dayOfWeek = d.get('day');
    const setting = Object.values(regularDaysOffSetting).find((s) => s.days.includes(dayOfWeek));
    const offSetting = setting ?? (isHoliday(d, holidays) ? holidayColor : null);
    // Match the chart: narrow widths use the lighter subColor for day-off shading.
    const offColor = offSetting ? (narrow ? offSetting.subColor : offSetting.color) : null;
    const bg = composite(WHITE, parseColor(offColor));

    // Header text mirrors Calendar.tsx: day-of-month normally; once narrow, only
    // Sundays / month starts show a week-of-month number and the rest go blank.
    const dateNum = d.get('date');
    let headerText = String(dateNum);
    if (narrow) {
      const isMonthStart = dateNum === 1;
      const firstDayOfMonth = cdate(`${d.format('YYYY-MM')}-01`);
      const firstDayOfWeek = firstDayOfMonth.get('day');
      const lastDayOfMonth = firstDayOfMonth.add(1, 'month').add(-1, 'day');
      const lastDayOfWeek = lastDayOfMonth.get('day');
      const skipFirstWeek = firstDayOfWeek >= 4 && firstDayOfWeek <= 6;
      const daysSinceFirstSunday = (dateNum - 1) + firstDayOfWeek;
      const weekNumber = Math.floor(daysSinceFirstSunday / 7) + (skipFirstWeek ? 0 : 1);
      if (lastDayOfWeek >= 0 && lastDayOfWeek <= 2 && dateNum > (lastDayOfMonth.get('date') - lastDayOfWeek - 1)) {
        headerText = '';
      } else if ((isMonthStart && !skipFirstWeek) || dayOfWeek === 0) {
        headerText = weekNumber > 0 ? `${weekNumber}` : '';
      } else {
        headerText = '';
      }
    }

    return {
      key: d.format('YYYYMMDD'),
      date: dateNum,
      dayOfWeek,
      // cdate's get('M') is 0-indexed; format('M') gives the human 1-12 month.
      month: Number(d.format('M')),
      year: Number(d.format('YYYY')),
      bg,
      headerText,
    };
  });

  const wb = new Workbook();
  wb.creator = 'Gantty';
  const ws = wb.addWorksheet(title ? title.slice(0, 28) : 'Gantt', {
    // Hide Excel's default gridlines (they read darker than the chart's faint
    // day lines); every visible line below is drawn explicitly instead.
    views: [{ state: 'frozen', xSplit: wbsColumns.length, ySplit: 2, showGridLines: false }],
  });

  const wbsColCount = wbsColumns.length;

  // Column widths: WBS columns scale from their px width; date columns track the
  // chart's cell width (≈ px / 7) so narrowing the chart narrows the export too.
  const dateColWidth = Math.max(0.6, cellWidth / 7);
  const wsColumns: Partial<Column>[] = [];
  wbsColumns.forEach((c) => {
    wsColumns.push({ width: Math.max(3, c.width / 6.5) });
  });
  for (let i = 0; i < dates.length; i += 1) {
    wsColumns.push({ width: dateColWidth });
  }
  ws.columns = wsColumns;

  // --- Header rows (row 1: month band, row 2: column names + day numbers) ---
  const headerRow1 = ws.getRow(1);
  const headerRow2 = ws.getRow(2);
  headerRow1.height = 16;
  headerRow2.height = 16;

  wbsColumns.forEach((c, idx) => {
    const cell = headerRow2.getCell(idx + 1);
    cell.value = t(c.columnName);
    cell.font = { name: FONT, bold: true, size: 10, color: { argb: 'FF333333' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDF1F5' } };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } } };
  });

  // Month band: merge consecutive same-month day cells in row 1 and label them.
  let monthStart = 0;
  const flushMonth = (endIdx: number) => {
    const startCol = wbsColCount + monthStart + 1;
    const endCol = wbsColCount + endIdx + 1;
    const info = dayInfos[monthStart];
    const cell = headerRow1.getCell(startCol);
    cell.value = `${info.year}/${info.month}`;
    cell.font = { name: FONT, bold: true, size: 10, color: { argb: 'FF333333' } };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDF1F5' } };
    if (endCol > startCol) ws.mergeCells(1, startCol, 1, endCol);
  };
  dayInfos.forEach((info, idx) => {
    if (idx === 0) return;
    if (info.month !== dayInfos[idx - 1].month || info.year !== dayInfos[idx - 1].year) {
      flushMonth(idx - 1);
      monthStart = idx;
    }
  });
  if (dayInfos.length > 0) flushMonth(dayInfos.length - 1);

  // Day-of-month numbers in row 2. Stored as text (not numbers) so a value too
  // wide for the narrow column clips instead of rendering as "####".
  dayInfos.forEach((info, idx) => {
    const cell = headerRow2.getCell(wbsColCount + idx + 1);
    if (info.headerText) cell.value = info.headerText;
    cell.font = { name: FONT, size: 8, color: { argb: 'FF555555' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    if (info.bg.r !== 255 || info.bg.g !== 255 || info.bg.b !== 255) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: toARGB(info.bg) } };
    }
  });

  const actualColor = parseColor(colors[999]?.color) ?? parseColor('#0000003d');
  const thinGray = { style: 'thin' as const, color: { argb: 'FFE0E0E0' } };
  // Near-invisible hairline drawn on every chart cell so filled and unfilled cells
  // render at the same height — Excel draws a solid fill 1px taller than a cell that
  // only shows the default gridline, which otherwise makes day-off/bar cells look
  // misaligned against plain weekday cells.
  const chartHLine = { style: 'hair' as const, color: { argb: 'FFE0E0E0' } };

  // Faint per-day vertical grid line, mirroring GridVertical.tsx: the web draws
  // translucent black hairlines that lighten as the chart narrows, and on very
  // narrow widths only Sundays get a line. Excel borders are opaque, so these are
  // composited-over-white approximations — nudged a touch darker than the web's
  // values so the gridlines stay legible against Excel's white sheet.
  const dayLineColor = (dayOfWeek: number): string | null => {
    if (cellWidth > 8) return 'FFE6E6E6';          // wide: every day
    if (cellWidth > 5.5) return 'FFEEEEEE';        // medium: every day (lighter)
    return dayOfWeek === 0 ? 'FFE6E6E6' : null;    // narrow: Sundays only, weekdays none
  };

  // --- Data rows ---
  rows.forEach((row, rIdx) => {
    const excelRow = ws.getRow(rIdx + 3);
    excelRow.height = 15;
    const isSep = isSeparatorRow(row);

    // The WBS number (e.g. "1-1-1") doubles as the hierarchy depth signal: the
    // count of dashes is the indent level. Empty placeholder rows get a blank
    // number, so they read as level 0 (and are skipped for color fills below).
    const wbsNo = wbsNumbers[rIdx] || '';
    const depth = wbsNo === '' ? 0 : wbsNo.split('-').length - 1;

    // WBS columns.
    wbsColumns.forEach((c, cIdx) => {
      const cell = excelRow.getCell(cIdx + 1);
      const isWbsNo = c.columnId === 'wbsNumber';
      // Keep the WBS number and display name on separator rows; blank the rest.
      const keepOnSep = isWbsNo || c.columnId === 'displayName';
      cell.value = isWbsNo
        ? wbsNo
        : isSep && !keepOnSep
          ? ''
          : cellTextFor(c.columnId, row, dateFormat, showYear, data);
      // Size 9 matches the chart-side bar/separator labels so the two panes read
      // at one consistent type size.
      cell.font = { name: FONT, size: 9, bold: isSep };
      // Indent the task name to its hierarchy depth (level 1 = flush left), using
      // Excel's native cell indent so the outline reads like a real WBS.
      const indent = c.columnId === 'displayName' ? depth : 0;
      cell.alignment = {
        horizontal: c.columnId === 'displayName' ? 'left' : 'center',
        vertical: 'middle',
        ...(indent > 0 ? { indent } : {}),
      };
      cell.border = { right: thinGray, bottom: thinGray };
      if (isSep) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEDFF' } };
      } else if (c.columnId === 'color' && wbsNo !== '' && (isChartRow(row) || isEventRow(row))) {
        // Paint the color cell with the planned bar color, like the swatch — but
        // skip wholly-empty rows so blank placeholders stay uncolored.
        const planned = parseColor(resolvePlannedColor((row as ChartRow).color, colors, fallbackColor));
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: toARGB(composite(WHITE, planned)) } };
      }
    });

    // Date grid: compute each day's composited fill.
    let plannedColor: RGBA | null = null;
    let pStart = '';
    let pEnd = '';
    let aStart = '';
    let aEnd = '';
    let sepStart = '';
    let sepEnd = '';
    const eventRanges: { start: string; end: string; planned: boolean }[] = [];

    if (isChartRow(row)) {
      plannedColor = parseColor(resolvePlannedColor(row.color, colors, fallbackColor));
      pStart = toKey(row.plannedStartDate);
      pEnd = toKey(row.plannedEndDate);
      aStart = toKey(row.actualStartDate);
      aEnd = toKey(row.actualEndDate);
    } else if (isEventRow(row)) {
      plannedColor = parseColor(resolvePlannedColor(row.color, colors, fallbackColor));
      pStart = toKey(row.plannedStartDate);
      pEnd = toKey(row.plannedEndDate);
      aStart = toKey(row.actualStartDate);
      aEnd = toKey(row.actualEndDate);
      (row.eventData || []).forEach((e) => {
        eventRanges.push({ start: toKey(e.startDate), end: toKey(e.endDate), planned: e.isPlanned });
      });
    } else if (isSeparatorRow(row)) {
      sepStart = toKey(row.minStartDate);
      sepEnd = toKey(row.maxEndDate);
    }
    const sepCollapsed = isSeparatorRow(row) ? row.isCollapsed : false;
    const sepBg = composite(WHITE, parseColor(SEPARATOR_BG));
    const collapsedBand = parseColor(SEPARATOR_COLLAPSED_BAND);

    dayInfos.forEach((info, dIdx) => {
      let rgb = info.bg;
      const inRange = (s: string, e: string) => s !== '' && e !== '' && info.key >= s && info.key <= e;

      // Track whether a bar/separator band actually covers this cell, so we can
      // keep the faint vertical line off it — an opaque Excel border drawn across
      // a bar would visually slice it into daily segments.
      let barPainted = false;
      if (isSep) {
        // The whole separator row is light blue (opaque), covering weekend shading
        // so the band connects seamlessly with the table side.
        rgb = sepBg;
        if (sepCollapsed && inRange(sepStart, sepEnd)) rgb = composite(rgb, collapsedBand);
        barPainted = true;
      } else {
        if (inRange(pStart, pEnd)) { rgb = composite(rgb, plannedColor); barPainted = true; }
        eventRanges.forEach((er) => {
          if (inRange(er.start, er.end)) { rgb = composite(rgb, er.planned ? plannedColor : actualColor); barPainted = true; }
        });
        if (inRange(aStart, aEnd)) { rgb = composite(rgb, actualColor); barPainted = true; }
      }

      const cell = excelRow.getCell(wbsColCount + dIdx + 1);
      const isPainted = rgb.r !== 255 || rgb.g !== 255 || rgb.b !== 255;
      if (isPainted) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: toARGB(rgb) } };
      }
      // Faint day line only on cells with no bar over them; month-start columns are
      // drawn later by the darker monthLine pass, so leave them to it.
      const lineArgb = barPainted || info.date === 1 ? null : dayLineColor(info.dayOfWeek);
      cell.border = {
        ...(cell.border || {}),
        bottom: chartHLine,
        ...(lineArgb ? { left: { style: 'hair' as const, color: { argb: lineArgb } } } : {}),
      };
    });

    // Label the planned bar with the task name, like the chart's bar label. The
    // text is written into the bar's first cell and overflows across the (empty)
    // colored cells to its right, mirroring the on-bar label.
    if (isChartRow(row) && plannedColor && row.displayName) {
      const firstIdx = dayInfos.findIndex((info) => info.key >= pStart && info.key <= pEnd && pStart !== '');
      if (firstIdx !== -1) {
        const labelCell = excelRow.getCell(wbsColCount + firstIdx + 1);
        labelCell.value = row.displayName;
        labelCell.font = { name: FONT, size: 9, color: { argb: 'FF000000' } };
        labelCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: false, indent: 0 };
      }
    }

    // Echo the separator name onto the chart side too (the live chart shows it at
    // the left of the band). Kept understated in gray so it doesn't compete with
    // the table-side name. It overflows right across the light-blue band.
    if (isSep && row.displayName) {
      const chartLabel = excelRow.getCell(wbsColCount + 1);
      chartLabel.value = row.displayName;
      chartLabel.font = { name: FONT, size: 9, italic: true, color: { argb: 'FF8A8A8A' } };
      chartLabel.alignment = { horizontal: 'left', vertical: 'middle', wrapText: false };
    }
  });

  const lastRow = rows.length + 2;

  // Light right border on the last WBS column to visually separate the panes.
  if (wbsColCount > 0) {
    for (let r = 1; r <= lastRow; r += 1) {
      const cell = ws.getRow(r).getCell(wbsColCount);
      const existing = cell.border || {};
      cell.border = { ...existing, right: { style: 'medium', color: { argb: 'FFAAAAAA' } } };
    }
  }

  // Faint vertical line on the first day of each month, like the chart's grid.
  const monthLine = { style: 'thin' as const, color: { argb: 'FFB0B0B0' } };
  dayInfos.forEach((info, idx) => {
    if (info.date !== 1) return;
    const col = wbsColCount + idx + 1;
    for (let r = 1; r <= lastRow; r += 1) {
      const cell = ws.getRow(r).getCell(col);
      cell.border = { ...(cell.border || {}), left: monthLine };
    }
  });

  return wb;
};

// 1-based column index -> spreadsheet letter (1 -> A, 27 -> AA).
const colLetter = (n: number): string => {
  let s = '';
  let num = n;
  while (num > 0) {
    const rem = (num - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    num = Math.floor((num - 1) / 26);
  }
  return s || 'A';
};

// Build the workbook and serialize it to xlsx bytes, then inject an <ignoredErrors>
// block into the sheet XML. exceljs (4.x) has no API for this, so we patch the zip
// directly. This suppresses Excel's green-triangle warnings for the cells we
// intentionally store as text: numeric strings (WBS no., days, progress, day
// headers) and short date strings Excel reads as two-digit-year dates.
export const buildGanttXlsxBuffer = async (params: BuildGanttWorkbookParams): Promise<Uint8Array> => {
  const wb = await buildGanttWorkbook(params);
  const ws = wb.worksheets[0];
  const lastCol = colLetter(Math.max(1, ws.columnCount));
  const lastRow = Math.max(1, ws.rowCount);
  const sqref = `A1:${lastCol}${lastRow}`;
  const ignored = `<ignoredErrors><ignoredError sqref="${sqref}" numberStoredAsText="1" twoDigitTextYear="1"/></ignoredErrors>`;

  const raw = await wb.xlsx.writeBuffer();
  const zip = await JSZip.loadAsync(raw as ArrayBuffer);
  const sheetPaths = Object.keys(zip.files).filter((p) => /^xl\/worksheets\/sheet\d+\.xml$/.test(p));
  for (const path of sheetPaths) {
    const file = zip.file(path);
    if (!file) continue;
    let xml = await file.async('string');
    if (!xml.includes('<ignoredErrors')) {
      // <ignoredErrors> must be the last child group before </worksheet> in our
      // output (no drawing/tableParts are emitted), so this placement is valid.
      xml = xml.replace('</worksheet>', `${ignored}</worksheet>`);
      zip.file(path, xml);
    }
  }
  return zip.generateAsync({ type: 'uint8array' });
};
