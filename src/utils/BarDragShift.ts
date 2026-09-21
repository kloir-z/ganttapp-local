// BarDragShift.ts
//
// 複数選択したチャートバーをまとめて平行移動するときの、日付計算だけを切り出した純関数群。
// ドラッグ中のマウス移動量(gridSteps = セル幅単位のカレンダー日数)と、ドラッグ開始時に
// 取っておいた「元の日付」から、各行の新しい日付を求める。
//
// 累積ずれを避けるため、どの関数も「現在の日付」ではなく **ドラッグ開始時のスナップショット**
// を入力に取る。呼び出し側(useMultiBarDrag)は mousedown 時に 1 回だけスナップショットを取り、
// mousemove のたびに original + gridSteps を渡し直す。
import { cdate } from 'cdate';
import { addPlannedDays, resolveActualEndDate } from './CommonUtils';
import { EventData } from '../types/DataTypes';

export interface PlannedBarSnapshot {
  id: string;
  startDate: string;
  endDate: string;
  plannedDays: number | null;
  isIncludeHolidays: boolean;
}

export interface ActualBarSnapshot {
  id: string;
  startDate: string;
  /** 実績終了日。未入力で「当日まで伸ばして描いている」行は、その見えている終了日を入れる。 */
  endDate: string;
}

export interface EventBarSnapshot {
  id: string;
  eventData: EventData[];
  /** この行で動かすイベントの種別。選択しているバーだけを動かすための指定。 */
  movePlanned: boolean;
  moveActual: boolean;
}

export interface ShiftedDates {
  id: string;
  startDate: string;
  endDate: string;
}

const shiftDate = (dateString: string, days: number): string =>
  cdate(dateString).add(days, 'days').format('YYYY/MM/DD');

/**
 * 予定バーの平行移動。単体ドラッグ(ChartRowComponent)と同じルールで、開始日を
 * カレンダー日数ぶんずらしてから、稼働日数(plannedDays)を保つように終了日を引き直す。
 * そのため行ごとにカレンダー上の長さは変わりうる。
 */
export const computeShiftedPlannedDates = (
  snapshots: PlannedBarSnapshot[],
  gridSteps: number,
  holidays: string[],
  regularDaysOff: number[]
): ShiftedDates[] => {
  const results: ShiftedDates[] = [];
  snapshots.forEach(({ id, startDate, endDate, plannedDays, isIncludeHolidays }) => {
    if (!startDate || !endDate) return;
    const newStartDate = shiftDate(startDate, gridSteps);
    const newEndDate = addPlannedDays(newStartDate, plannedDays, holidays, isIncludeHolidays, true, regularDaysOff);
    // plannedDays が未算出などで終了日を引けなかった行は、元の長さをカレンダー日数で保つ
    results.push({ id, startDate: newStartDate, endDate: newEndDate || shiftDate(endDate, gridSteps) });
  });
  return results;
};

/**
 * 実績バーの平行移動。開始日・終了日をそのままカレンダー日数ぶんずらす(休日は飛ばさない)。
 * 終了日が未入力だった行は、呼び出し側が resolveActualEndDate で解決した見えている終了日を
 * snapshot に入れてくるので、ここで動かした時点で終了日が確定する — 単体ドラッグと同じ挙動。
 */
export const computeShiftedActualDates = (
  snapshots: ActualBarSnapshot[],
  gridSteps: number
): ShiftedDates[] => {
  const results: ShiftedDates[] = [];
  snapshots.forEach(({ id, startDate, endDate }) => {
    if (!startDate || !endDate) return;
    results.push({
      id,
      startDate: shiftDate(startDate, gridSteps),
      endDate: shiftDate(endDate, gridSteps),
    });
  });
  return results;
};

/**
 * イベント行の平行移動。選択しているバーの種別(予定/実績)のイベントだけを動かす。
 * 同じ行の同じ種別のイベントが複数あれば、それらはまとめて動く。
 */
export const computeShiftedEventRows = (
  snapshots: EventBarSnapshot[],
  gridSteps: number
): { id: string; eventData: EventData[] }[] => {
  const results: { id: string; eventData: EventData[] }[] = [];
  snapshots.forEach(({ id, eventData, movePlanned, moveActual }) => {
    let changed = false;
    const shifted = eventData.map(event => {
      const shouldMove = event.isPlanned ? movePlanned : moveActual;
      if (!shouldMove || !event.startDate || !event.endDate) {
        return event;
      }
      changed = true;
      return {
        ...event,
        startDate: shiftDate(event.startDate, gridSteps),
        endDate: shiftDate(event.endDate, gridSteps),
      };
    });
    if (changed) {
      results.push({ id, eventData: shifted });
    }
  });
  return results;
};

/**
 * 実績バーのスナップショットを作るときの共通処理。終了日が未入力の行は、画面に見えている
 * 終了日(当日まで伸ばした状態)を基準にする。
 */
export const toActualBarSnapshot = (
  id: string,
  startDate: string,
  endDate: string,
  extendActualBarToToday: boolean,
  todayString: string
): ActualBarSnapshot | null => {
  const resolvedEndDate = resolveActualEndDate(startDate, endDate, extendActualBarToToday, todayString);
  if (!startDate || !resolvedEndDate) return null;
  return { id, startDate, endDate: resolvedEndDate };
};
