// 依存関係(Dep列)のある行へ複数行ぶんの予定日をまとめて貼り付けたときの回帰テスト。
//
// 行ごとに setPlannedDate を dispatch していたときは、後の行の依存計算が
// 先に貼り付けた行の日付を再計算して上書きし、貼り付けた並びが同じ値に潰れていた
// (「最初だけ塊で、その後は同じ値が繰り返し貼り付く」症状)。
import { store, setEntireData, setPlannedDates } from './store';
import { ChartRow, WBSData } from '../types/DataTypes';

const makeChartRow = (id: string, no: number, start: string, end: string, dependency = ''): ChartRow => ({
  no,
  id,
  rowType: 'Chart',
  displayName: `Task ${no}`,
  color: '',
  plannedStartDate: start,
  plannedEndDate: end,
  plannedDays: null,
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

// 1行上に依存する行を dependency に持たせたデータを作る
const buildData = (dependency: string, dependentRowIndexes: number[]): { [id: string]: WBSData } => {
  const data: { [id: string]: WBSData } = {};
  for (let i = 0; i < 8; i++) {
    const day = String(i + 1).padStart(2, '0');
    data[`row${i}`] = makeChartRow(
      `row${i}`, i + 1, `2026/07/${day}`, `2026/07/${day}`,
      dependentRowIndexes.includes(i) ? dependency : ''
    );
  }
  return data;
};

const planned = (id: string) => {
  const row = store.getState().wbsData.data[id] as ChartRow;
  return `${row.plannedStartDate}~${row.plannedEndDate}`;
};

describe('setPlannedDates (複数行の予定日をまとめて確定)', () => {
  test('依存関係のない行では貼り付けた日付がそのまま入る', () => {
    store.dispatch(setEntireData(buildData('after,1,0', [])));
    store.dispatch(setPlannedDates([
      { id: 'row2', startDate: '2026/08/01', endDate: '2026/08/02' },
      { id: 'row3', startDate: '2026/08/03', endDate: '2026/08/04' },
      { id: 'row4', startDate: '2026/08/01', endDate: '2026/08/02' },
      { id: 'row5', startDate: '2026/08/03', endDate: '2026/08/04' },
    ]));

    expect(planned('row2')).toBe('2026/08/01~2026/08/02');
    expect(planned('row3')).toBe('2026/08/03~2026/08/04');
    expect(planned('row4')).toBe('2026/08/01~2026/08/02');
    expect(planned('row5')).toBe('2026/08/03~2026/08/04');
  });

  test('"after" 依存のある行でも貼り付けた日付が依存計算で上書きされない', () => {
    store.dispatch(setEntireData(buildData('after,1,0', [2, 3, 4, 5])));
    store.dispatch(setPlannedDates([
      { id: 'row2', startDate: '2026/08/01', endDate: '2026/08/02' },
      { id: 'row3', startDate: '2026/08/03', endDate: '2026/08/04' },
      { id: 'row4', startDate: '2026/08/01', endDate: '2026/08/02' },
      { id: 'row5', startDate: '2026/08/03', endDate: '2026/08/04' },
    ]));

    expect(planned('row2')).toBe('2026/08/01~2026/08/02');
    expect(planned('row3')).toBe('2026/08/03~2026/08/04');
    expect(planned('row4')).toBe('2026/08/01~2026/08/02');
    expect(planned('row5')).toBe('2026/08/03~2026/08/04');
  });

  test('"sameas" 依存のある行でも貼り付けた日付が保持される', () => {
    store.dispatch(setEntireData(buildData('sameas,1,0', [2, 3, 4, 5])));
    store.dispatch(setPlannedDates([
      { id: 'row2', startDate: '2026/08/01', endDate: '2026/08/02' },
      { id: 'row3', startDate: '2026/08/05', endDate: '2026/08/06' },
      { id: 'row4', startDate: '2026/08/01', endDate: '2026/08/02' },
      { id: 'row5', startDate: '2026/08/05', endDate: '2026/08/06' },
    ]));

    expect(planned('row2')).toBe('2026/08/01~2026/08/02');
    expect(planned('row3')).toBe('2026/08/05~2026/08/06');
    expect(planned('row4')).toBe('2026/08/01~2026/08/02');
    expect(planned('row5')).toBe('2026/08/05~2026/08/06');
  });

  test('貼り付け範囲の外にある依存行へは依存計算が伝播する', () => {
    // row6 だけが依存行。貼り付けは row2〜row5 なので row6 は再計算される。
    store.dispatch(setEntireData(buildData('sameas,1,0', [6])));
    store.dispatch(setPlannedDates([
      { id: 'row4', startDate: '2026/08/01', endDate: '2026/08/02' },
      { id: 'row5', startDate: '2026/08/05', endDate: '2026/08/06' },
    ]));

    expect(planned('row5')).toBe('2026/08/05~2026/08/06');
    // 依存行(範囲外)は貼り付け前の値のままではなく、直前の行に追従して動く
    expect(planned('row6')).not.toBe('2026/07/07~2026/07/07');
  });
});
