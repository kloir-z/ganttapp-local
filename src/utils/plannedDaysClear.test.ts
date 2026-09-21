// 予定日を消したら所要日数も消えること(列に 0 が居座らないこと)のテスト。
//
// 以前は開始・終了が空でも calculatePlannedDays が 0 を返していたため、
// バーを削除しても「日」列に 0 が残り、二度と消せない値になっていた。
import { calculatePlannedDays } from './CommonUtils';
import { store, setEntireData, setPlannedDate, setPlannedDates } from '../reduxStoreAndSlices/store';
import { ChartRow, WBSData } from '../types/DataTypes';

const regularDaysOff = [0, 6];

const makeRow = (): { [id: string]: WBSData } => ({
  row0: {
    no: 1, id: 'row0', rowType: 'Chart', displayName: 'Task', color: '',
    plannedStartDate: '2026/07/01', plannedEndDate: '2026/07/03', plannedDays: 3,
    actualStartDate: '', actualEndDate: '', dependentId: '', dependency: '',
    progress: '', textColumn1: '', textColumn2: '', textColumn3: '', isIncludeHolidays: true,
  } as ChartRow,
});

const plannedDaysOf = () => (store.getState().wbsData.data['row0'] as ChartRow).plannedDays;

describe('calculatePlannedDays', () => {
  it('開始・終了が揃っていれば稼働日数を返す', () => {
    expect(calculatePlannedDays('2026/07/01', '2026/07/03', [], false, regularDaysOff)).toBe(3);
  });

  it('どちらかが空なら null(列を空にする)', () => {
    expect(calculatePlannedDays('', '', [], false, regularDaysOff)).toBeNull();
    expect(calculatePlannedDays('2026/07/01', '', [], false, regularDaysOff)).toBeNull();
    expect(calculatePlannedDays('', '2026/07/03', [], false, regularDaysOff)).toBeNull();
  });

  it('日付として解釈できない文字列でも null', () => {
    expect(calculatePlannedDays('あ', 'い', [], false, regularDaysOff)).toBeNull();
  });

  it('終了が開始より前なら 0(日付は入っているので空にはしない)', () => {
    expect(calculatePlannedDays('2026/07/03', '2026/07/01', [], false, regularDaysOff)).toBe(0);
  });
});

describe('予定日を消したときの所要日数', () => {
  it('バーを削除(予定日を両方空に)すると日数も消える', () => {
    store.dispatch(setEntireData(makeRow()));
    expect(plannedDaysOf()).toBe(3);

    store.dispatch(setPlannedDate({ id: 'row0', startDate: '', endDate: '' }));
    expect(plannedDaysOf()).toBeNull();
  });

  it('日付セルを空にしたときも日数が消える', () => {
    store.dispatch(setEntireData(makeRow()));
    store.dispatch(setPlannedDates([{ id: 'row0', startDate: '', endDate: '' }]));
    expect(plannedDaysOf()).toBeNull();
  });

  it('片方だけ空にしても日数は残らない', () => {
    store.dispatch(setEntireData(makeRow()));
    store.dispatch(setPlannedDates([{ id: 'row0', startDate: '2026/07/01', endDate: '' }]));
    expect(plannedDaysOf()).toBeNull();
  });
});
