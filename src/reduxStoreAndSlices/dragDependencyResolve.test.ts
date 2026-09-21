// バーのドラッグで予定日を確定したとき、依存関係が自動で解き直されることのテスト。
//
// ルール(2026-09-21 決定):
//   - 依存の定義が「正」。動かしたあとは、従属行が必ず定義どおりの位置に並ぶ。
//   - 連鎖の途中を掴んだ場合、前工程は引っ張られて一緒に動く(従来からの振る舞い)。
//   - 連鎖の中で複数行を掴んでも、正になるのは一番上流で動かした行だけ。
//
// ドラッグはカレンダー日数でずらすのに依存は稼働日で計算されるため、週末をまたぐ位置へ
// 動かすと「置いた位置」と「定義どおりの位置」がずれる。その差をどちらに寄せるかが
// setPlannedDates(貼り付け用・置いた位置が正) との違い。
import { store, setEntireData, setPlannedDates, setPlannedDatesFromDrag } from './store';
import { computeShiftedPlannedDates } from '../utils/BarDragShift';
import { ChartRow, WBSData } from '../types/DataTypes';

const makeChartRow = (i: number, start: string, end: string, plannedDays: number, dependency = ''): ChartRow => ({
  no: i + 1,
  id: `row${i}`,
  rowType: 'Chart',
  displayName: `Task ${i}`,
  color: '',
  plannedStartDate: start,
  plannedEndDate: end,
  plannedDays,
  actualStartDate: '',
  actualEndDate: '',
  dependentId: '',
  dependency,
  progress: '',
  textColumn1: '',
  textColumn2: '',
  textColumn3: '',
  isIncludeHolidays: false,
});

// row0 → row1 → row2 を「1行上の翌稼働日から」で連鎖させる。row3 は独立。
// 2026/07/04(土)・07/05(日) が週末。
const loadChain = () => {
  const data: { [id: string]: WBSData } = {
    row0: makeChartRow(0, '2026/07/01', '2026/07/02', 2),
    row1: makeChartRow(1, '2026/07/03', '2026/07/06', 2, 'after,-1,1'),
    row2: makeChartRow(2, '2026/07/07', '2026/07/08', 2, 'after,-1,1'),
    row3: makeChartRow(3, '2026/07/20', '2026/07/21', 2),
  };
  store.dispatch(setEntireData(data));
};

const planned = (id: string) => {
  const row = store.getState().wbsData.data[id] as ChartRow;
  return `${row.plannedStartDate}~${row.plannedEndDate}`;
};

const shift = (ids: string[], gridSteps: number) => {
  const { holidays, regularDaysOff, data } = store.getState().wbsData;
  const snapshots = ids.map(id => {
    const row = data[id] as ChartRow;
    return {
      id,
      startDate: row.plannedStartDate,
      endDate: row.plannedEndDate,
      plannedDays: row.plannedDays,
      isIncludeHolidays: row.isIncludeHolidays,
    };
  });
  return computeShiftedPlannedDates(snapshots, gridSteps, holidays, regularDaysOff);
};

describe('ドラッグ後の依存関係の自動解決', () => {
  it('連鎖の先頭を動かすと、後続が定義どおりに並び直す', () => {
    loadChain();
    store.dispatch(setPlannedDatesFromDrag(shift(['row0'], 7)));

    expect(planned('row0')).toBe('2026/07/08~2026/07/09');
    // row0 の終了翌稼働日から、稼働2日ぶん
    expect(planned('row1')).toBe('2026/07/10~2026/07/13');
    expect(planned('row2')).toBe('2026/07/14~2026/07/15');
    // 連鎖の外は動かない
    expect(planned('row3')).toBe('2026/07/20~2026/07/21');
  });

  it('連鎖の途中を動かすと、前工程は引っ張られ、後続は並び直す', () => {
    loadChain();
    store.dispatch(setPlannedDatesFromDrag(shift(['row1'], 7)));

    // 前工程が一緒に動く(従来からの振る舞い)
    expect(planned('row0')).toBe('2026/07/08~2026/07/09');
    expect(planned('row1')).toBe('2026/07/10~2026/07/13');
    // 後続は定義どおりの位置へ
    expect(planned('row2')).toBe('2026/07/14~2026/07/15');
  });

  it('連鎖のどのバーを掴んでも、同じ移動量なら同じ結果になる', () => {
    loadChain();
    store.dispatch(setPlannedDatesFromDrag(shift(['row0'], 7)));
    const fromHead = ['row0', 'row1', 'row2'].map(planned);

    loadChain();
    store.dispatch(setPlannedDatesFromDrag(shift(['row1'], 7)));
    expect(['row0', 'row1', 'row2'].map(planned)).toEqual(fromHead);
  });

  it('連鎖の複数行をまとめて動かしても、定義と食い違う行が残らない', () => {
    // 週末をまたぐ位置へ +3日。置いた位置をそのまま正にすると row2 がずれる。
    loadChain();
    store.dispatch(setPlannedDatesFromDrag(shift(['row1', 'row2'], 3)));

    // row1 の終了翌稼働日から row2 が始まる = 定義どおり
    expect(planned('row1')).toBe('2026/07/06~2026/07/07');
    expect(planned('row2')).toBe('2026/07/08~2026/07/09');
  });

  it('貼り付け用の setPlannedDates は従来どおり「置いた値」を残す', () => {
    // 同じ入力でも、貼り付け経路では定義との食い違いを許す(貼った並びを潰さないため)
    loadChain();
    const updates = shift(['row1', 'row2'], 3);
    store.dispatch(setPlannedDates(updates));

    expect(planned('row1')).toBe(`${updates[0].startDate}~${updates[0].endDate}`);
    expect(planned('row2')).toBe(`${updates[1].startDate}~${updates[1].endDate}`);
  });

  it('依存を持たない行は、置いた位置のまま動く', () => {
    loadChain();
    store.dispatch(setPlannedDatesFromDrag(shift(['row3'], 5)));

    expect(planned('row3')).toBe('2026/07/25~2026/07/28');
    expect(planned('row0')).toBe('2026/07/01~2026/07/02');
  });

  it('連鎖の行と独立した行を混ぜて動かしても、独立した行は置いた位置のまま', () => {
    loadChain();
    const updates = shift(['row1', 'row3'], 3);
    store.dispatch(setPlannedDatesFromDrag(updates));

    const row3Update = updates.find(update => update.id === 'row3');
    expect(planned('row3')).toBe(`${row3Update?.startDate}~${row3Update?.endDate}`);
    // 連鎖側は定義どおりに並ぶ
    const row1End = (store.getState().wbsData.data['row1'] as ChartRow).plannedEndDate;
    const row2Start = (store.getState().wbsData.data['row2'] as ChartRow).plannedStartDate;
    expect(row2Start > row1End).toBe(true);
  });

  it('同じ移動量を繰り返し渡しても結果がぶれない(ドラッグ中の連続 dispatch)', () => {
    loadChain();
    // ドラッグ中はセル境界をまたぐたびに、開始時のスナップショット + 移動量で撃ち直す
    const updates = shift(['row1'], 3);
    store.dispatch(setPlannedDatesFromDrag(updates));
    const once = ['row0', 'row1', 'row2'].map(planned);
    store.dispatch(setPlannedDatesFromDrag(updates));
    store.dispatch(setPlannedDatesFromDrag(updates));
    expect(['row0', 'row1', 'row2'].map(planned)).toEqual(once);
  });
});
