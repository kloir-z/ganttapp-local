// 選択モードの矩形選択の当たり判定(純関数)のテスト。
// 仮想化でマウントされていない行も拾えるよう、判定はデータだけで行う。
import { collectRowsInMarquee, normalizeMarquee, selectableBarRanges } from './BarMarqueeSelection';
import { ChartRow, EventRow, SeparatorRow, WBSData } from '../types/DataTypes';

const CELL_WIDTH = 20;
const ROW_HEIGHT = 21;

// 2026/07/01 から 10日ぶんの列
const dateKeys: string[] = [];
const dateIndex: { [key: string]: number } = {};
for (let i = 0; i < 10; i += 1) {
  const key = `2026-07-${String(i + 1).padStart(2, '0')}`;
  dateIndex[key] = i;
  dateKeys.push(key);
}
const toKey = (dateStr: string) => (dateStr ? dateStr.replace(/\//g, '-') : '');

const chartRow = (id: string, planned?: [string, string], actual?: [string, string]): ChartRow => ({
  no: 1, id, rowType: 'Chart', displayName: id, color: '',
  plannedStartDate: planned?.[0] ?? '', plannedEndDate: planned?.[1] ?? '', plannedDays: null,
  actualStartDate: actual?.[0] ?? '', actualEndDate: actual?.[1] ?? '',
  dependentId: '', dependency: '', progress: '',
  textColumn1: '', textColumn2: '', textColumn3: '', isIncludeHolidays: false,
});

const eventRow = (id: string, events: [string, string][]): EventRow => ({
  no: 1, id, rowType: 'Event', displayName: id, color: '',
  plannedStartDate: '', plannedEndDate: '', plannedDays: null,
  actualStartDate: '', actualEndDate: '', progress: '',
  textColumn1: '', textColumn2: '', textColumn3: '',
  eventData: events.map(([startDate, endDate]) => ({ startDate, endDate, isPlanned: true, eachDisplayName: '' })),
});

const separatorRow = (id: string): SeparatorRow => ({
  no: 1, id, rowType: 'Separator', displayName: id, isCollapsed: false, level: 0,
  minStartDate: '2026/07/01', maxEndDate: '2026/07/10',
} as SeparatorRow);

const collect = (filteredData: [string, WBSData][], rect: { x: number; y: number; width: number; height: number }, extend = false) =>
  collectRowsInMarquee({
    filteredData, dateIndex, dateKeys, toKey, rect,
    cellWidth: CELL_WIDTH, rowHeight: ROW_HEIGHT,
    extendActualBarToToday: extend, todayString: '2026/07/08',
  });

describe('collectRowsInMarquee', () => {
  // row0: 07/01〜07/02 (x 0〜40), row1: 07/04〜07/05 (x 60〜100), row2: 07/08〜07/09 (x 140〜180)
  const rows: [string, WBSData][] = [
    ['row0', chartRow('row0', ['2026/07/01', '2026/07/02'])],
    ['row1', chartRow('row1', ['2026/07/04', '2026/07/05'])],
    ['row2', chartRow('row2', ['2026/07/08', '2026/07/09'])],
  ];

  it('矩形に重なったバーの行だけを表示順で返す', () => {
    // y 0〜63 は全行、x 30〜110 は row0 の右端と row1 に重なる
    expect(collect(rows, { x: 30, y: 0, width: 80, height: 63 })).toEqual(['row0', 'row1']);
  });

  it('縦方向に外れた行は含めない', () => {
    // 2行目(y 21〜42)だけを通る帯
    expect(collect(rows, { x: 0, y: 22, width: 200, height: 10 })).toEqual(['row1']);
  });

  it('バーのない隙間をなぞっても何も選ばれない', () => {
    // x 45〜55 は row0 の右端(40)と row1 の左端(60)の間
    expect(collect(rows, { x: 45, y: 0, width: 10, height: 63 })).toEqual([]);
  });

  it('端が1pxでも重なれば拾う', () => {
    // row0 のバーは x 0〜40。x 39〜40 に掛ける。
    expect(collect(rows, { x: 39, y: 0, width: 1, height: 21 })).toEqual(['row0']);
    // x 40 以降は次の列なので row0 には当たらない
    expect(collect(rows, { x: 40, y: 0, width: 1, height: 21 })).toEqual([]);
  });

  it('実績バーだけの行も拾う', () => {
    const withActual: [string, WBSData][] = [['row0', chartRow('row0', undefined, ['2026/07/04', '2026/07/05'])]];
    expect(collect(withActual, { x: 60, y: 0, width: 20, height: 21 })).toEqual(['row0']);
  });

  it('実績終了日が未入力でも、当日まで伸ばして描いているぶんは拾う', () => {
    const ongoing: [string, WBSData][] = [['row0', chartRow('row0', undefined, ['2026/07/04', ''])]];
    // 当日 07/08 まで伸びているので x 140〜160 に掛かる
    expect(collect(ongoing, { x: 140, y: 0, width: 20, height: 21 }, true)).toEqual(['row0']);
    // 伸ばす設定が OFF なら終了日が無いバーは描かれないので拾わない
    expect(collect(ongoing, { x: 140, y: 0, width: 20, height: 21 }, false)).toEqual([]);
  });

  it('イベント行はイベント単位で判定する', () => {
    const events: [string, WBSData][] = [['event0', eventRow('event0', [['2026/07/01', '2026/07/01'], ['2026/07/09', '2026/07/09']])]];
    // 2つのイベントの間(x 40〜150)には当たらない
    expect(collect(events, { x: 40, y: 0, width: 100, height: 21 })).toEqual([]);
    // 後ろのイベント(x 160〜180)には当たる
    expect(collect(events, { x: 165, y: 0, width: 5, height: 21 })).toEqual(['event0']);
  });

  it('セパレータ行は一括移動できないので選択しない', () => {
    const withSeparator: [string, WBSData][] = [['sep0', separatorRow('sep0')]];
    expect(collect(withSeparator, { x: 0, y: 0, width: 200, height: 21 })).toEqual([]);
  });

  it('表示期間をまたぐバーは端でクランプして判定する', () => {
    const spanning: [string, WBSData][] = [['row0', chartRow('row0', ['2026/06/20', '2026/07/03'])]];
    expect(collect(spanning, { x: 0, y: 0, width: 10, height: 21 })).toEqual(['row0']);
  });

  it('表示期間の外にしかないバーは拾わない', () => {
    const outside: [string, WBSData][] = [['row0', chartRow('row0', ['2026/08/01', '2026/08/02'])]];
    expect(collect(outside, { x: 0, y: 0, width: 400, height: 21 })).toEqual([]);
  });

  it('幅や高さが 0 の矩形(クリックしただけ)では何も選ばない', () => {
    expect(collect(rows, { x: 0, y: 0, width: 0, height: 63 })).toEqual([]);
  });
});

describe('selectableBarRanges', () => {
  it('予定・実績の両方を別々の範囲として返す', () => {
    const row = chartRow('row0', ['2026/07/01', '2026/07/02'], ['2026/07/03', '2026/07/04']);
    expect(selectableBarRanges(row, false, '2026/07/08')).toEqual([
      { start: '2026/07/01', end: '2026/07/02' },
      { start: '2026/07/03', end: '2026/07/04' },
    ]);
  });
});

describe('normalizeMarquee', () => {
  it('右下へのドラッグ', () => {
    expect(normalizeMarquee({ x: 10, y: 20 }, { x: 40, y: 60 })).toEqual({ x: 10, y: 20, width: 30, height: 40 });
  });

  it('左上へのドラッグでも正の幅・高さになる', () => {
    expect(normalizeMarquee({ x: 40, y: 60 }, { x: 10, y: 20 })).toEqual({ x: 10, y: 20, width: 30, height: 40 });
  });
});
