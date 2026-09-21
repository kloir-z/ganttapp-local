// 複数バーの一括平行移動の日付計算(純関数)のテスト。
//
// 単体ドラッグと同じルールであること — 予定バーは稼働日数を保ち、実績バーはカレンダー日数で
// そのままずれる — を固定する。
import {
  computeShiftedPlannedDates,
  computeShiftedActualDates,
  computeShiftedEventRows,
  toActualBarSnapshot,
  PlannedBarSnapshot,
} from './BarDragShift';
import { EventData } from '../types/DataTypes';

// 土日が定休(0=日, 6=土)
const regularDaysOff = [0, 6];
const holidays: string[] = [];

const planned = (id: string, startDate: string, endDate: string, plannedDays: number, isIncludeHolidays = false): PlannedBarSnapshot =>
  ({ id, startDate, endDate, plannedDays, isIncludeHolidays });

describe('computeShiftedPlannedDates', () => {
  it('選択した全行が同じカレンダー日数だけ開始日をずらす', () => {
    // 2026/07/06(月)〜07/08(水) と 07/13(月)〜07/14(火)
    const result = computeShiftedPlannedDates([
      planned('a', '2026/07/06', '2026/07/08', 3),
      planned('b', '2026/07/13', '2026/07/14', 2),
    ], 2, holidays, regularDaysOff);

    expect(result.map(r => r.startDate)).toEqual(['2026/07/08', '2026/07/15']);
  });

  it('稼働日数を保つので、週末をまたぐ行だけ終了日が余計に伸びる', () => {
    // 07/06(月)開始・稼働3日 → 07/08(水)。+3日ずらすと 07/09(木)開始で
    // 07/11(土)・07/12(日)を飛ばして 07/13(月)終了になる。
    const result = computeShiftedPlannedDates([
      planned('a', '2026/07/06', '2026/07/08', 3),
    ], 3, holidays, regularDaysOff);

    expect(result[0]).toEqual({ id: 'a', startDate: '2026/07/09', endDate: '2026/07/13' });
  });

  it('休日を含む設定の行はカレンダー日数どおりに伸びる', () => {
    const result = computeShiftedPlannedDates([
      planned('a', '2026/07/06', '2026/07/08', 3, true),
    ], 3, holidays, regularDaysOff);

    expect(result[0]).toEqual({ id: 'a', startDate: '2026/07/09', endDate: '2026/07/11' });
  });

  it('負の移動量(左方向のドラッグ)も同じように扱う', () => {
    const result = computeShiftedPlannedDates([
      planned('a', '2026/07/08', '2026/07/10', 3),
    ], -2, holidays, regularDaysOff);

    expect(result[0].startDate).toBe('2026/07/06');
  });

  it('日付が欠けている行はスキップする', () => {
    const result = computeShiftedPlannedDates([
      planned('a', '', '', 0),
      planned('b', '2026/07/06', '2026/07/06', 1),
    ], 1, holidays, regularDaysOff);

    expect(result.map(r => r.id)).toEqual(['b']);
  });

  it('plannedDays が未算出でも元のカレンダー長を保って移動する', () => {
    const result = computeShiftedPlannedDates([
      { id: 'a', startDate: '2026/07/06', endDate: '2026/07/10', plannedDays: null, isIncludeHolidays: false },
    ], 1, holidays, regularDaysOff);

    expect(result[0]).toEqual({ id: 'a', startDate: '2026/07/07', endDate: '2026/07/11' });
  });
});

describe('computeShiftedActualDates', () => {
  it('開始日・終了日をそのままカレンダー日数ぶんずらす(休日は飛ばさない)', () => {
    const result = computeShiftedActualDates([
      { id: 'a', startDate: '2026/07/06', endDate: '2026/07/08' },
    ], 3);

    expect(result[0]).toEqual({ id: 'a', startDate: '2026/07/09', endDate: '2026/07/11' });
  });

  it('日付が欠けている行はスキップする', () => {
    const result = computeShiftedActualDates([
      { id: 'a', startDate: '2026/07/06', endDate: '' },
    ], 1);

    expect(result).toEqual([]);
  });
});

describe('toActualBarSnapshot', () => {
  it('終了日が未入力の行は、当日まで伸ばした見えている終了日を基準にする', () => {
    const snapshot = toActualBarSnapshot('a', '2026/07/06', '', true, '2026/07/10');
    expect(snapshot).toEqual({ id: 'a', startDate: '2026/07/06', endDate: '2026/07/10' });
  });

  it('伸ばす設定がOFFなら、終了日未入力の行は移動対象にしない', () => {
    expect(toActualBarSnapshot('a', '2026/07/06', '', false, '2026/07/10')).toBeNull();
  });

  it('入力済みの終了日はそのまま使う', () => {
    const snapshot = toActualBarSnapshot('a', '2026/07/06', '2026/07/07', true, '2026/07/10');
    expect(snapshot?.endDate).toBe('2026/07/07');
  });
});

describe('computeShiftedEventRows', () => {
  const eventData: EventData[] = [
    { startDate: '2026/07/06', endDate: '2026/07/07', isPlanned: true, eachDisplayName: 'kickoff' },
    { startDate: '2026/07/08', endDate: '2026/07/08', isPlanned: false, eachDisplayName: 'done' },
    { startDate: '2026/07/20', endDate: '2026/07/21', isPlanned: true, eachDisplayName: 'review' },
  ];

  it('選択している種別のイベントだけ動かす(同じ行の同種は全部動く)', () => {
    const result = computeShiftedEventRows([{ id: 'e1', eventData, movePlanned: true, moveActual: false }], 2);

    expect(result[0].eventData).toEqual([
      { startDate: '2026/07/08', endDate: '2026/07/09', isPlanned: true, eachDisplayName: 'kickoff' },
      { startDate: '2026/07/08', endDate: '2026/07/08', isPlanned: false, eachDisplayName: 'done' },
      { startDate: '2026/07/22', endDate: '2026/07/23', isPlanned: true, eachDisplayName: 'review' },
    ]);
  });

  it('実績だけ選んでいるときは isPlanned=false のイベントだけ動く', () => {
    const result = computeShiftedEventRows([{ id: 'e1', eventData, movePlanned: false, moveActual: true }], 2);

    expect(result[0].eventData[0].startDate).toBe('2026/07/06');
    expect(result[0].eventData[1].startDate).toBe('2026/07/10');
  });

  it('予定と実績の両方を選んでいれば両方動く', () => {
    const result = computeShiftedEventRows([{ id: 'e1', eventData, movePlanned: true, moveActual: true }], 2);

    expect(result[0].eventData.map(event => event.startDate)).toEqual([
      '2026/07/08', '2026/07/10', '2026/07/22',
    ]);
  });

  it('動くイベントが1つも無い行は結果に含めない', () => {
    const onlyPlanned: EventData[] = [{ startDate: '2026/07/06', endDate: '2026/07/07', isPlanned: true, eachDisplayName: '' }];
    expect(computeShiftedEventRows([{ id: 'e1', eventData: onlyPlanned, movePlanned: false, moveActual: true }], 2)).toEqual([]);
  });
});
