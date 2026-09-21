// 複数バーの一括平行移動が、依存関係(Dep列)と正しく噛み合うことの回帰テスト。
//
// ルールは「選択行の移動量が勝つ」: 選択行どうしの依存再計算はスキップし、選択外の
// 依存行だけが移動後に追従する。全行が同じ日数だけ動くので、選択行どうしの相対関係は保たれる。
//
// 行ごとに setPlannedDate を撃つとこれが崩れる。updateDependentRows は dependentId を
// たどって **前工程side** にも伝播するため、最後に撃った行の依存計算が、先に確定させた
// 行の日付を引き戻してしまう(下の「逐次だと引き戻される」ケース)。
import { store, setEntireData, setPlannedDate, setPlannedDates, setActualDates, updateEventRows } from './store';
import { computeShiftedPlannedDates, computeShiftedActualDates, computeShiftedEventRows } from '../utils/BarDragShift';
import { ChartRow, EventRow, WBSData } from '../types/DataTypes';

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

// 2026/07/01(水)から1日ずつ4行。2行目以降は「1行上の翌日から」の依存(after,-1,1)。
const loadChainedRows = () => {
  const data: { [id: string]: WBSData } = {};
  for (let i = 0; i < 4; i++) {
    const day = String(i + 1).padStart(2, '0');
    data[`row${i}`] = makeChartRow(`row${i}`, i + 1, `2026/07/${day}`, `2026/07/${day}`, i > 0 ? 'after,-1,1' : '');
  }
  store.dispatch(setEntireData(data));
};

const planned = (id: string) => {
  const row = store.getState().wbsData.data[id] as ChartRow;
  return `${row.plannedStartDate}~${row.plannedEndDate}`;
};

const snapshotOf = (ids: string[]) => ids.map(id => {
  const row = store.getState().wbsData.data[id] as ChartRow;
  return {
    id,
    startDate: row.plannedStartDate,
    endDate: row.plannedEndDate,
    plannedDays: row.plannedDays,
    isIncludeHolidays: row.isIncludeHolidays,
  };
});

const shiftSelection = (ids: string[], gridSteps: number) => {
  const { holidays, regularDaysOff } = store.getState().wbsData;
  return computeShiftedPlannedDates(snapshotOf(ids), gridSteps, holidays, regularDaysOff);
};

describe('複数バーの一括移動と依存関係', () => {
  test('依存で繋がった行をまとめて選んでも、指定した移動量どおりに動く', () => {
    loadChainedRows();
    const shifted = shiftSelection(['row0', 'row1'], 3);
    expect(shifted.map(s => s.startDate)).toEqual(['2026/07/04', '2026/07/05']);

    store.dispatch(setPlannedDates(shifted));

    expect(planned('row0')).toBe('2026/07/04~2026/07/04');
    expect(planned('row1')).toBe('2026/07/05~2026/07/05');
  });

  test('逐次だと引き戻される移動が、一括なら保たれる', () => {
    // 行ごとに撃つと、最後の row1 の依存計算が row0 を 1稼働日前(金曜)へ引き戻す。
    loadChainedRows();
    const shifted = shiftSelection(['row0', 'row1'], 3);
    shifted.forEach(update => store.dispatch(setPlannedDate(update)));
    const sequential = ['row0', 'row1'].map(planned);

    loadChainedRows();
    store.dispatch(setPlannedDates(shiftSelection(['row0', 'row1'], 3)));
    const batched = ['row0', 'row1'].map(planned);

    expect(sequential).toEqual(['2026/07/03~2026/07/03', '2026/07/05~2026/07/05']);
    expect(batched).toEqual(['2026/07/04~2026/07/04', '2026/07/05~2026/07/05']);
  });

  test('選択行どうしの相対関係が移動後も保たれる', () => {
    loadChainedRows();
    const before = ['row0', 'row1', 'row2'].map(planned);
    store.dispatch(setPlannedDates(shiftSelection(['row0', 'row1', 'row2'], 7)));

    expect(before).toEqual(['2026/07/01~2026/07/01', '2026/07/02~2026/07/02', '2026/07/03~2026/07/03']);
    expect(['row0', 'row1', 'row2'].map(planned)).toEqual([
      '2026/07/08~2026/07/08', '2026/07/09~2026/07/09', '2026/07/10~2026/07/10',
    ]);
  });

  test('選択外の依存行は移動後に追従する', () => {
    loadChainedRows();
    store.dispatch(setPlannedDates(shiftSelection(['row0', 'row1'], 7)));

    expect(planned('row1')).toBe('2026/07/09~2026/07/09');
    // row2/row3 は選択外なので、依存の定義どおり row1 のうしろに並び直す
    expect(planned('row2')).toBe('2026/07/10~2026/07/10');
    expect(planned('row3')).toBe('2026/07/13~2026/07/13');
  });

  test('実績バーの一括移動は依存計算を挟まずそのままずれる', () => {
    loadChainedRows();
    store.dispatch(setActualDates(computeShiftedActualDates([
      { id: 'row0', startDate: '2026/07/01', endDate: '2026/07/02' },
      { id: 'row1', startDate: '2026/07/03', endDate: '2026/07/04' },
    ], 2)));

    const row0 = store.getState().wbsData.data['row0'] as ChartRow;
    const row1 = store.getState().wbsData.data['row1'] as ChartRow;
    expect([row0.actualStartDate, row0.actualEndDate]).toEqual(['2026/07/03', '2026/07/04']);
    expect([row1.actualStartDate, row1.actualEndDate]).toEqual(['2026/07/05', '2026/07/06']);
    // 実績を動かしても予定日は動かない
    expect(planned('row0')).toBe('2026/07/01~2026/07/01');
  });

  test('イベント行も同じ移動量で一括更新できる', () => {
    loadChainedRows();
    const data = { ...store.getState().wbsData.data };
    const eventRow: EventRow = {
      no: 5,
      id: 'event0',
      rowType: 'Event',
      displayName: 'Milestones',
      textColumn1: '',
      textColumn2: '',
      textColumn3: '',
      color: '',
      plannedStartDate: '',
      plannedEndDate: '',
      plannedDays: null,
      actualStartDate: '',
      actualEndDate: '',
      progress: '',
      eventData: [
        { startDate: '2026/07/10', endDate: '2026/07/10', isPlanned: true, eachDisplayName: 'kickoff' },
        { startDate: '2026/07/12', endDate: '2026/07/12', isPlanned: false, eachDisplayName: 'done' },
      ],
    };
    store.dispatch(setEntireData({ ...data, event0: eventRow }));

    const snapshot = [{
      id: 'event0',
      eventData: (store.getState().wbsData.data['event0'] as EventRow).eventData,
      movePlanned: true,
      moveActual: false,
    }];
    store.dispatch(updateEventRows(computeShiftedEventRows(snapshot, 3)));

    const updated = store.getState().wbsData.data['event0'] as EventRow;
    expect(updated.eventData[0].startDate).toBe('2026/07/13');
    // 予定イベントだけを選んでいるので、実績イベントは動かない
    expect(updated.eventData[1].startDate).toBe('2026/07/12');
  });
});
