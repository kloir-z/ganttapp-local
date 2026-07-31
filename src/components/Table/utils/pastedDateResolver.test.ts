// 年を省略した日付の貼り付け(例 "7/5")を、周辺の日付から補って解釈できることのテスト。
import { getResolvedDateText, resolvePastedDateTexts } from './pastedDateResolver';
import { DateFormatType } from '../../../types/DataTypes';

const CURRENT_YEAR = 2026;

type Dates = { [rowId: string]: { [columnId: string]: string } };

const buildContext = (rowOrder: string[], dates: Dates, dateFormat: DateFormatType = 'yyyy/MM/dd') => ({
  rowOrder,
  getDate: (rowId: string, columnId: string) => dates[rowId]?.[columnId] ?? '',
  dateFormat,
  currentYear: CURRENT_YEAR,
});

const resolveOne = (
  cell: { rowId: string; columnId: string; text: string },
  rowOrder: string[],
  dates: Dates,
  dateFormat: DateFormatType = 'yyyy/MM/dd'
) => {
  const resolved = resolvePastedDateTexts([cell], buildContext(rowOrder, dates, dateFormat));
  return getResolvedDateText(resolved, cell.rowId, cell.columnId);
};

describe('resolvePastedDateTexts', () => {
  test('年が書かれていればその年を優先する', () => {
    const result = resolveOne(
      { rowId: 'row1', columnId: 'plannedStartDate', text: '2030/7/5' },
      ['row0', 'row1'],
      { row0: { plannedStartDate: '2026/01/05' } }
    );
    expect(result).toBe('2030/07/05');
  });

  test('年が無いときは同じ列の近い行(上)の年を借りる', () => {
    const result = resolveOne(
      { rowId: 'row1', columnId: 'plannedStartDate', text: '7/5' },
      ['row0', 'row1', 'row2'],
      { row0: { plannedStartDate: '2027/01/05' } }
    );
    expect(result).toBe('2027/07/05');
  });

  test('上に日付が無ければ下の行の年を借りる', () => {
    const result = resolveOne(
      { rowId: 'row0', columnId: 'plannedStartDate', text: '7/5' },
      ['row0', 'row1', 'row2'],
      { row2: { plannedStartDate: '2028/03/01' } }
    );
    expect(result).toBe('2028/07/05');
  });

  test('手がかりが無ければ今年で補完する', () => {
    const result = resolveOne(
      { rowId: 'row0', columnId: 'plannedStartDate', text: '7/5' },
      ['row0'],
      {}
    );
    expect(result).toBe('2026/07/05');
  });

  test('終了日は同じ行の開始日の年を最優先する', () => {
    const result = resolveOne(
      { rowId: 'row1', columnId: 'plannedEndDate', text: '7/20' },
      ['row0', 'row1'],
      {
        row0: { plannedStartDate: '2020/01/05', plannedEndDate: '2020/01/10' },
        row1: { plannedStartDate: '2027/07/01' },
      }
    );
    expect(result).toBe('2027/07/20');
  });

  test('年を省略した終了日が開始日より前になるときは翌年とみなす', () => {
    const result = resolveOne(
      { rowId: 'row0', columnId: 'plannedEndDate', text: '1/10' },
      ['row0'],
      { row0: { plannedStartDate: '2026/11/05' } }
    );
    expect(result).toBe('2027/01/10');
  });

  test('年が書かれた終了日は開始日より前でも繰り上げない', () => {
    const result = resolveOne(
      { rowId: 'row0', columnId: 'plannedEndDate', text: '2026/1/10' },
      ['row0'],
      { row0: { plannedStartDate: '2026/11/05' } }
    );
    expect(result).toBe('2026/01/10');
  });

  test('同じ貼り付けで先に解決した上の行を手がかりにする', () => {
    const resolved = resolvePastedDateTexts(
      [
        { rowId: 'row1', columnId: 'plannedStartDate', text: '8/1' },
        { rowId: 'row2', columnId: 'plannedStartDate', text: '9/1' },
      ],
      buildContext(['row0', 'row1', 'row2'], { row0: { plannedStartDate: '2029/01/05' } })
    );
    expect(getResolvedDateText(resolved, 'row1', 'plannedStartDate')).toBe('2029/08/01');
    expect(getResolvedDateText(resolved, 'row2', 'plannedStartDate')).toBe('2029/09/01');
  });

  test('同じ行の開始日と終了日を同時に貼ると開始日の年で終了日も解決する', () => {
    const resolved = resolvePastedDateTexts(
      [
        { rowId: 'row0', columnId: 'plannedEndDate', text: '1/10' },
        { rowId: 'row0', columnId: 'plannedStartDate', text: '2027/12/20' },
      ],
      buildContext(['row0'], { row0: { plannedStartDate: '2020/01/01', plannedEndDate: '2020/01/02' } })
    );
    expect(getResolvedDateText(resolved, 'row0', 'plannedStartDate')).toBe('2027/12/20');
    expect(getResolvedDateText(resolved, 'row0', 'plannedEndDate')).toBe('2028/01/10');
  });

  test('日/月の書式では省略入力も日/月として解釈する', () => {
    const result = resolveOne(
      { rowId: 'row0', columnId: 'plannedStartDate', text: '5/7' },
      ['row0'],
      { row0: { plannedEndDate: '2027/07/10' } },
      'dd/MM/yyyy'
    );
    expect(result).toBe('2027/07/05');
  });

  test('空文字は消去としてそのまま返す', () => {
    const result = resolveOne(
      { rowId: 'row0', columnId: 'plannedStartDate', text: '' },
      ['row0'],
      { row0: { plannedStartDate: '2026/01/05' } }
    );
    expect(result).toBe('');
  });

  test('日付として解釈できない文字列は元のまま返す(既存の検証に委ねる)', () => {
    const result = resolveOne(
      { rowId: 'row0', columnId: 'plannedStartDate', text: 'あとで' },
      ['row0'],
      {}
    );
    expect(result).toBe('あとで');
  });

  test('実績日は同じ列の近い行の年を借りる', () => {
    const result = resolveOne(
      { rowId: 'row1', columnId: 'actualStartDate', text: '3/4' },
      ['row0', 'row1'],
      { row0: { actualStartDate: '2025/12/01' } }
    );
    expect(result).toBe('2025/03/04');
  });
});
