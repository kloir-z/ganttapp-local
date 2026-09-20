import { cdate } from 'cdate';
import { computeAnnotationGeometry, rowBarDates, BRACKET_GAP, BRACKET_WIDTH, LEADER_LENGTH } from './ChartAnnotationGeometry';
import { ChartRow, SeparatorRow, WBSData, ChartAnnotation } from '../types/DataTypes';

const CELL = 10;
const ROW_H = 20;

const chartRow = (overrides: Partial<ChartRow>): ChartRow => ({
  no: 1, id: 'r1', rowType: 'Chart', displayName: 'Task', color: '',
  plannedStartDate: '2024/06/03', plannedEndDate: '2024/06/07',
  plannedDays: 5, actualStartDate: '', actualEndDate: '',
  dependentId: '', dependency: '', progress: '', textColumn1: '', textColumn2: '',
  textColumn3: '', isIncludeHolidays: false, ...overrides,
});

const sepRow = (overrides: Partial<SeparatorRow>): SeparatorRow => ({
  no: 1, id: 's1', rowType: 'Separator', displayName: 'Phase', isCollapsed: false,
  level: 0, minStartDate: '', maxEndDate: '', ...overrides,
});

const annotation = (overrides: Partial<ChartAnnotation> = {}): ChartAnnotation => ({
  id: 'a1', startRowId: 'r1', endRowId: 'r3', text: 'memo', offsetX: 0, offsetY: 0, ...overrides,
});

// 2024/06/01 から 30 日分
const dateArray = Array.from({ length: 30 }, (_, i) => cdate('2024/06/01').add(i, 'day'));
const dateKeys = dateArray.map(d => d.format('YYYY-MM-DD'));
const dateIndex: { [key: string]: number } = {};
dateKeys.forEach((k, i) => { dateIndex[k] = i; });
const toKey = (dateStr: string) => {
  if (!dateStr) return '';
  const parsed = cdate(dateStr);
  return isNaN(+parsed.toDate()) ? '' : parsed.format('YYYY-MM-DD');
};

const compute = (a: ChartAnnotation, filteredData: [string, WBSData][]) =>
  computeAnnotationGeometry({ annotation: a, filteredData, dateIndex, dateKeys, toKey, cellWidth: CELL, rowHeight: ROW_H });

describe('computeAnnotationGeometry', () => {
  const threeRows: [string, WBSData][] = [
    ['r1', chartRow({ id: 'r1', plannedStartDate: '2024/06/03', plannedEndDate: '2024/06/07' })],
    ['r2', chartRow({ id: 'r2', plannedStartDate: '2024/06/05', plannedEndDate: '2024/06/12' })],
    ['r3', chartRow({ id: 'r3', plannedStartDate: '2024/06/04', plannedEndDate: '2024/06/09' })],
  ];

  it('括弧は対象行全体を覆い、いちばん右に伸びたバーの先に置かれる', () => {
    const g = compute(annotation(), threeRows)!;
    expect(g.rowStart).toBe(0);
    expect(g.rowEnd).toBe(2);
    expect(g.bracketY).toBe(0);
    expect(g.bracketHeight).toBe(3 * ROW_H);
    // いちばん右は r2 の 06/12(インデックス11)なので右端は (11+1)*10 = 120
    expect(g.bracketX).toBe(120 + BRACKET_GAP);
    expect(g.leaderX).toBe(120 + BRACKET_GAP + BRACKET_WIDTH);
    expect(g.leaderY).toBe(3 * ROW_H / 2);
    expect(g.cardX).toBe(g.leaderX + LEADER_LENGTH);
  });

  it('対象行それぞれのバー矩形を強調用に返す', () => {
    const g = compute(annotation(), threeRows)!;
    expect(g.bars).toHaveLength(3);
    // r1: 06/03(index 2)から 06/07(index 6)= 5日分
    expect(g.bars[0]).toEqual({ x: 20, y: 0, width: 50, height: ROW_H });
    expect(g.bars[1]).toEqual({ x: 40, y: ROW_H, width: 80, height: ROW_H });
  });

  it('端点の行が並べ替わっていても表示順で範囲を取り直す', () => {
    // endRowId の方が上にある場合でも min/max で解決する
    const g = compute(annotation({ startRowId: 'r3', endRowId: 'r1' }), threeRows)!;
    expect(g.rowStart).toBe(0);
    expect(g.rowEnd).toBe(2);
  });

  it('片方の端点が消えたら残った行だけに縮退する', () => {
    const g = compute(annotation({ startRowId: 'gone' }), threeRows)!;
    expect(g.rowStart).toBe(2);
    expect(g.rowEnd).toBe(2);
    expect(g.bars).toHaveLength(1);
  });

  it('両方の端点が無ければ描画しない', () => {
    expect(compute(annotation({ startRowId: 'x', endRowId: 'y' }), threeRows)).toBeNull();
  });

  it('手動オフセットはカード位置にだけ効き、括弧や引き出し線の始点は動かない', () => {
    const base = compute(annotation(), threeRows)!;
    const moved = compute(annotation({ offsetX: 40, offsetY: -15 }), threeRows)!;
    expect(moved.bracketX).toBe(base.bracketX);
    expect(moved.leaderX).toBe(base.leaderX);
    expect(moved.leaderY).toBe(base.leaderY);
    expect(moved.cardX).toBe(base.cardX + 40);
    expect(moved.cardCenterY).toBe(base.cardCenterY - 15);
  });

  it('表示期間をまたぐバーは端でクランプし、完全に範囲外のバーは無視する', () => {
    const rows: [string, WBSData][] = [
      ['r1', chartRow({ id: 'r1', plannedStartDate: '2024/05/20', plannedEndDate: '2024/06/03' })],
      ['r2', chartRow({ id: 'r2', plannedStartDate: '2024/08/01', plannedEndDate: '2024/08/10' })],
    ];
    const g = compute(annotation({ startRowId: 'r1', endRowId: 'r2' }), rows)!;
    // r1 は左端でクランプされて 06/01〜06/03 の 3 日分、r2 は範囲外なので落ちる
    expect(g.bars).toHaveLength(1);
    expect(g.bars[0]).toEqual({ x: 0, y: 0, width: 30, height: ROW_H });
    // 行範囲自体は 2 行のまま(バーが無い行も括弧の対象)
    expect(g.rowEnd).toBe(1);
  });

  it('バーを持つ行が1つも無ければ括弧はチャート左端に寄る', () => {
    const rows: [string, WBSData][] = [
      ['r1', chartRow({ id: 'r1', plannedStartDate: '', plannedEndDate: '' })],
    ];
    const g = compute(annotation({ startRowId: 'r1', endRowId: 'r1' }), rows)!;
    expect(g.bars).toHaveLength(0);
    expect(g.bracketX).toBe(BRACKET_GAP);
  });
});

describe('rowBarDates', () => {
  it('チャート行は計画バーの範囲を返す', () => {
    expect(rowBarDates(chartRow({}))).toEqual({ start: '2024/06/03', end: '2024/06/07' });
  });

  it('計画日が未入力のチャート行は範囲なし', () => {
    expect(rowBarDates(chartRow({ plannedStartDate: '', plannedEndDate: '' }))).toBeNull();
  });

  it('セパレータ行は集計済みの範囲を使う', () => {
    expect(rowBarDates(sepRow({ minStartDate: '2024/06/03', maxEndDate: '2024/06/20' })))
      .toEqual({ start: '2024/06/03', end: '2024/06/20' });
  });
});
