import {
  computeCriticalPath,
  gapWorkdays,
  sanitizeCpPredecessors,
  parseCpPredecessorsText,
  formatCpPredecessorsText,
} from './CriticalPath';
import { ChartRow, CpPredecessor, WBSData } from '../types/DataTypes';

const makeChartRow = (
  id: string,
  no: number,
  plannedStartDate: string,
  plannedEndDate: string,
  cpPredecessors?: CpPredecessor[]
): ChartRow => ({
  no,
  id,
  rowType: 'Chart',
  displayName: id,
  color: '',
  plannedStartDate,
  plannedEndDate,
  plannedDays: null,
  actualStartDate: '',
  actualEndDate: '',
  dependentId: '',
  dependency: '',
  progress: '',
  textColumn1: '',
  textColumn2: '',
  textColumn3: '',
  isIncludeHolidays: false,
  ...(cpPredecessors ? { cpPredecessors } : {}),
});

const toData = (rows: WBSData[]): { [id: string]: WBSData } => {
  const data: { [id: string]: WBSData } = {};
  rows.forEach(row => { data[row.id] = row; });
  return data;
};

// 曜日・祝日の影響を切り離すため、既定は「全日稼働」で検証する。
const NO_HOLIDAYS: string[] = [];
const ALL_WORKDAYS: number[] = [];
const WEEKENDS = [0, 6];

describe('gapWorkdays', () => {
  it('should return 0 when dates are equal', () => {
    expect(gapWorkdays('2024/01/10', '2024/01/10', NO_HOLIDAYS, ALL_WORKDAYS)).toBe(0);
  });

  it('should count days in (from, to] forward', () => {
    expect(gapWorkdays('2024/01/10', '2024/01/12', NO_HOLIDAYS, ALL_WORKDAYS)).toBe(2);
  });

  it('should return a negative count when to is before from', () => {
    expect(gapWorkdays('2024/01/12', '2024/01/10', NO_HOLIDAYS, ALL_WORKDAYS)).toBe(-2);
  });

  it('should skip weekends and holidays', () => {
    // 2024/01/05(金) → 2024/01/09(火)。1/6(土)・1/7(日)は週末、1/8(月)は祝日。
    expect(gapWorkdays('2024/01/05', '2024/01/09', ['2024/01/08'], WEEKENDS)).toBe(1);
  });
});

describe('sanitizeCpPredecessors', () => {
  it('should return an empty array for non-array values', () => {
    expect(sanitizeCpPredecessors(undefined, 'a')).toEqual([]);
    expect(sanitizeCpPredecessors('junk', 'a')).toEqual([]);
    expect(sanitizeCpPredecessors({ predecessorId: 'b' }, 'a')).toEqual([]);
  });

  it('should drop self references, duplicates and invalid entries', () => {
    const result = sanitizeCpPredecessors(
      [
        { predecessorId: 'b', lag: 2 },
        { predecessorId: 'b' },
        { predecessorId: 'a' },
        { predecessorId: '' },
        { lag: 1 },
        null,
        'junk',
      ],
      'a'
    );
    expect(result).toEqual([{ predecessorId: 'b', lag: 2 }]);
  });

  it('should normalize lag to a clamped integer and omit zero', () => {
    expect(sanitizeCpPredecessors([{ predecessorId: 'b', lag: 2.7 }], 'a')).toEqual([{ predecessorId: 'b', lag: 2 }]);
    expect(sanitizeCpPredecessors([{ predecessorId: 'b', lag: 100000 }], 'a')).toEqual([{ predecessorId: 'b', lag: 999 }]);
    expect(sanitizeCpPredecessors([{ predecessorId: 'b', lag: 0 }], 'a')).toEqual([{ predecessorId: 'b' }]);
    expect(sanitizeCpPredecessors([{ predecessorId: 'b', lag: 'x' }], 'a')).toEqual([{ predecessorId: 'b' }]);
  });
});

describe('computeCriticalPath', () => {
  it('should return an empty result when no links exist', () => {
    const data = toData([
      makeChartRow('a', 1, '2024/01/01', '2024/01/03'),
      makeChartRow('b', 2, '2024/01/04', '2024/01/06'),
    ]);
    const result = computeCriticalPath(data, NO_HOLIDAYS, ALL_WORKDAYS);
    expect(result.criticalIds.size).toBe(0);
    expect(result.hasCycle).toBe(false);
  });

  it('should mark every task of a tight chain as critical', () => {
    const data = toData([
      makeChartRow('a', 1, '2024/01/01', '2024/01/03'),
      makeChartRow('b', 2, '2024/01/04', '2024/01/06', [{ predecessorId: 'a' }]),
      makeChartRow('c', 3, '2024/01/07', '2024/01/09', [{ predecessorId: 'b' }]),
    ]);
    const result = computeCriticalPath(data, NO_HOLIDAYS, ALL_WORKDAYS);
    expect(result.criticalIds).toEqual(new Set(['a', 'b', 'c']));
    expect(result.floatByTaskId).toEqual({ a: 0, b: 0, c: 0 });
    expect(result.hasCycle).toBe(false);
  });

  it('should give float to a branch that ends earlier', () => {
    // a → b(1/4-1/10, プロジェクト終端) と a → c(1/4-1/6, 4日早く終わる)。
    const data = toData([
      makeChartRow('a', 1, '2024/01/01', '2024/01/03'),
      makeChartRow('b', 2, '2024/01/04', '2024/01/10', [{ predecessorId: 'a' }]),
      makeChartRow('c', 3, '2024/01/04', '2024/01/06', [{ predecessorId: 'a' }]),
    ]);
    const result = computeCriticalPath(data, NO_HOLIDAYS, ALL_WORKDAYS);
    expect(result.criticalIds).toEqual(new Set(['a', 'b']));
    expect(result.floatByTaskId['c']).toBe(4);
  });

  it('should give float to a predecessor whose successor starts late', () => {
    // a 終了 1/2、b 開始 1/5(2日の空き)→ a のフロートは 2。
    const data = toData([
      makeChartRow('a', 1, '2024/01/01', '2024/01/02'),
      makeChartRow('b', 2, '2024/01/05', '2024/01/06', [{ predecessorId: 'a' }]),
    ]);
    const result = computeCriticalPath(data, NO_HOLIDAYS, ALL_WORKDAYS);
    expect(result.criticalIds).toEqual(new Set(['b']));
    expect(result.floatByTaskId['a']).toBe(2);
  });

  it('should consume the gap with a positive lag', () => {
    // 上と同じ日付だが lag 2 なら空きが必要分になり a もクリティカル。
    const data = toData([
      makeChartRow('a', 1, '2024/01/01', '2024/01/02'),
      makeChartRow('b', 2, '2024/01/05', '2024/01/06', [{ predecessorId: 'a', lag: 2 }]),
    ]);
    const result = computeCriticalPath(data, NO_HOLIDAYS, ALL_WORKDAYS);
    expect(result.criticalIds).toEqual(new Set(['a', 'b']));
  });

  it('should treat overlapping tasks (negative slack) as critical', () => {
    const data = toData([
      makeChartRow('a', 1, '2024/01/01', '2024/01/05'),
      makeChartRow('b', 2, '2024/01/03', '2024/01/10', [{ predecessorId: 'a' }]),
    ]);
    const result = computeCriticalPath(data, NO_HOLIDAYS, ALL_WORKDAYS);
    expect(result.criticalIds).toEqual(new Set(['a', 'b']));
    expect(result.floatByTaskId['a']).toBeLessThan(0);
  });

  it('should mark a mid-chain task critical when it defines the project end', () => {
    // a → b だが a 自身がプロジェクト最遅終了(b は先に終わる)。
    const data = toData([
      makeChartRow('a', 1, '2024/01/01', '2024/01/10'),
      makeChartRow('b', 2, '2024/01/02', '2024/01/05', [{ predecessorId: 'a' }]),
    ]);
    const result = computeCriticalPath(data, NO_HOLIDAYS, ALL_WORKDAYS);
    expect(result.criticalIds.has('a')).toBe(true);
  });

  it('should skip weekends and holidays when measuring float', () => {
    // a 終了 金1/5、b 開始 火1/9。週末(1/6,1/7)と祝日(1/8)を除けば翌稼働日開始なので密着。
    const data = toData([
      makeChartRow('a', 1, '2024/01/01', '2024/01/05'),
      makeChartRow('b', 2, '2024/01/09', '2024/01/12', [{ predecessorId: 'a' }]),
    ]);
    const result = computeCriticalPath(data, ['2024/01/08'], WEEKENDS);
    expect(result.criticalIds).toEqual(new Set(['a', 'b']));
  });

  it('should ignore links to rows without valid planned dates', () => {
    const data = toData([
      makeChartRow('a', 1, '', ''),
      makeChartRow('b', 2, '2024/01/04', '2024/01/06', [{ predecessorId: 'a' }]),
    ]);
    const result = computeCriticalPath(data, NO_HOLIDAYS, ALL_WORKDAYS);
    expect(result.criticalIds.size).toBe(0);
  });

  it('should report cycles and exclude cyclic tasks without looping forever', () => {
    const data = toData([
      makeChartRow('a', 1, '2024/01/01', '2024/01/03', [{ predecessorId: 'b' }]),
      makeChartRow('b', 2, '2024/01/04', '2024/01/06', [{ predecessorId: 'a' }]),
      makeChartRow('c', 3, '2024/01/01', '2024/01/10'),
      makeChartRow('d', 4, '2024/01/11', '2024/01/12', [{ predecessorId: 'c' }]),
    ]);
    const result = computeCriticalPath(data, NO_HOLIDAYS, ALL_WORKDAYS);
    expect(result.hasCycle).toBe(true);
    expect(result.criticalIds.has('a')).toBe(false);
    expect(result.criticalIds.has('b')).toBe(false);
    // 循環と無関係な部分は通常どおり判定される。
    expect(result.criticalIds).toEqual(new Set(['c', 'd']));
  });

  it('should union multiple chains tying for the project end', () => {
    const data = toData([
      makeChartRow('a', 1, '2024/01/01', '2024/01/05'),
      makeChartRow('b', 2, '2024/01/06', '2024/01/10', [{ predecessorId: 'a' }]),
      makeChartRow('c', 3, '2024/01/01', '2024/01/05'),
      makeChartRow('d', 4, '2024/01/06', '2024/01/10', [{ predecessorId: 'c' }]),
    ]);
    const result = computeCriticalPath(data, NO_HOLIDAYS, ALL_WORKDAYS);
    expect(result.criticalIds).toEqual(new Set(['a', 'b', 'c', 'd']));
  });
});

describe('parseCpPredecessorsText', () => {
  const data = toData([
    makeChartRow('a', 1, '2024/01/01', '2024/01/03'),
    makeChartRow('b', 2, '2024/01/04', '2024/01/06'),
    makeChartRow('c', 3, '2024/01/07', '2024/01/09'),
  ]);

  it('should parse row numbers with optional lag', () => {
    expect(parseCpPredecessorsText('1, 2+2 3-1', data, 'x')).toEqual([
      { predecessorId: 'a' },
      { predecessorId: 'b', lag: 2 },
      { predecessorId: 'c', lag: -1 },
    ]);
  });

  it('should ignore unknown numbers, self references, duplicates and junk', () => {
    expect(parseCpPredecessorsText('99, 1, 1, abc, 2', data, 'b')).toEqual([
      { predecessorId: 'a' },
    ]);
  });

  it('should return an empty array for empty input', () => {
    expect(parseCpPredecessorsText('', data, 'a')).toEqual([]);
  });
});

describe('formatCpPredecessorsText', () => {
  it('should render current row numbers with lag suffixes', () => {
    const a = makeChartRow('a', 5, '2024/01/01', '2024/01/03');
    const b = makeChartRow('b', 7, '2024/01/04', '2024/01/06');
    const s = makeChartRow('s', 9, '2024/01/08', '2024/01/09', [
      { predecessorId: 'a' },
      { predecessorId: 'b', lag: 2 },
      { predecessorId: 'gone', lag: 1 },
    ]);
    const data = toData([a, b, s]);
    expect(formatCpPredecessorsText(s, data)).toBe('5, 7+2');
  });
});
