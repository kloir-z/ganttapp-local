// useMultiBarDrag.ts
//
// 複数選択したチャートバーの一括平行移動。掴んだ行のコンポーネント(ChartRowComponent /
// EventRowComponent)から呼び、ドラッグの主導権をこちらに渡す。
//
// 単体ドラッグとの違い:
//   - 掴んだ行もローカル state に入らない。全選択行を Redux へ一括 dispatch し、各行は
//     entry.* の変化でバーが追従する(選択行ぶんのローカル state を増やさないため)。
//   - dispatch はセル境界をまたいだとき(gridSteps が変わったとき)だけなので、
//     マウス移動のたびに撃つことにはならない。
//   - undo は mousedown の pushPastState 1回だけ。動かさずに離したら取り消す。
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useStore } from 'react-redux';
import { cdate } from 'cdate';
import {
  RootState,
  pushPastState,
  removePastState,
  setPlannedDatesFromDrag,
  setActualDates,
  updateEventRows,
  updateSeparatorDates,
} from '../reduxStoreAndSlices/store';
import { isChartRow, isEventRow } from '../types/DataTypes';
import { BarType, barKeyOf, barTypeOfBarKey, rowIdOfBarKey } from '../reduxStoreAndSlices/uiFlagSlice';
import {
  ActualBarSnapshot,
  EventBarSnapshot,
  PlannedBarSnapshot,
  computeShiftedActualDates,
  computeShiftedEventRows,
  computeShiftedPlannedDates,
  toActualBarSnapshot,
} from '../utils/BarDragShift';

interface UseMultiBarDragParams {
  gridRef: React.RefObject<HTMLDivElement>;
  setCanGridRefDrag: (canGridRefDrag: boolean) => void;
}

interface DragSession {
  barType: BarType;
  /** 動かさずに離した(=クリック)ときに呼ぶ。選択の畳み直しは呼び出し側のルールに任せる。 */
  onClickWithoutMove: () => void;
  initialMouseX: number;
  planned: PlannedBarSnapshot[];
  actual: ActualBarSnapshot[];
  events: EventBarSnapshot[];
  holidays: string[];
  regularDaysOff: number[];
  cellWidth: number;
}

export const useMultiBarDrag = ({ gridRef, setCanGridRefDrag }: UseMultiBarDragParams) => {
  const dispatch = useDispatch();
  const store = useStore<RootState>();
  const [isMultiDragging, setIsMultiDragging] = useState(false);
  const sessionRef = useRef<DragSession | null>(null);
  const gridStepsRef = useRef(0);

  /**
   * 一括ドラッグを開始できるなら開始して true を返す。掴んだ行が選択に入っていない、
   * 選択が1行以下、履歴プレビュー中などの場合は false を返し、呼び出し側は
   * 従来どおりの単体ドラッグへ進む。
   */
  const tryBeginMultiDrag = useCallback((
    event: React.MouseEvent<HTMLDivElement>,
    rowId: string,
    barType: BarType,
    onClickWithoutMove: () => void
  ): boolean => {
    if (event.button !== 0) return false;
    const state = store.getState();
    if (state.history?.isViewingPast) return false;

    // 掴んだバーと同じ種別の選択だけを動かす。予定バーのドラッグで実績バーは動かない。
    const selectedBarKeys = state.uiFlags.selectedBarKeys;
    if (!selectedBarKeys.includes(barKeyOf(rowId, barType))) return false;
    const targetRowIds = selectedBarKeys
      .filter(key => barTypeOfBarKey(key) === barType)
      .map(rowIdOfBarKey);
    if (targetRowIds.length < 2) return false;

    const { data, holidays, regularDaysOff } = state.wbsData;
    const { cellWidth, wbsWidth, extendActualBarToToday } = state.baseSettings;
    const todayString = cdate().format('YYYY/MM/DD');

    const planned: PlannedBarSnapshot[] = [];
    const actual: ActualBarSnapshot[] = [];
    const events: EventBarSnapshot[] = [];
    targetRowIds.forEach(selectedId => {
      const row = data[selectedId];
      if (isChartRow(row)) {
        if (barType === 'planned') {
          planned.push({
            id: selectedId,
            startDate: row.plannedStartDate ?? '',
            endDate: row.plannedEndDate ?? '',
            plannedDays: row.plannedDays ?? null,
            isIncludeHolidays: row.isIncludeHolidays,
          });
        } else {
          const snapshot = toActualBarSnapshot(
            selectedId, row.actualStartDate ?? '', row.actualEndDate ?? '', extendActualBarToToday, todayString
          );
          if (snapshot) actual.push(snapshot);
        }
      } else if (isEventRow(row)) {
        events.push({ id: selectedId, eventData: row.eventData });
      }
    });
    if (planned.length === 0 && actual.length === 0 && events.length === 0) return false;

    // 掴んだ位置をセルの左端にスナップする(単体ドラッグと同じ式)
    let initialMouseX = event.clientX;
    if (gridRef.current) {
      const gridStartX = ((gridRef.current.scrollLeft - wbsWidth) % cellWidth);
      initialMouseX = Math.floor((event.clientX + gridStartX - 1) / cellWidth) * cellWidth - gridStartX + 1;
    }

    sessionRef.current = { barType, onClickWithoutMove, initialMouseX, planned, actual, events, holidays, regularDaysOff, cellWidth };
    gridStepsRef.current = 0;
    dispatch(pushPastState());
    setCanGridRefDrag(false);
    setIsMultiDragging(true);
    return true;
  }, [dispatch, gridRef, setCanGridRefDrag, store]);

  const applyGridSteps = useCallback((gridSteps: number) => {
    const session = sessionRef.current;
    if (!session) return;
    const { barType, planned, actual, events, holidays, regularDaysOff } = session;

    if (barType === 'planned' && planned.length > 0) {
      // 依存を優先して並べ直す版へ渡す。連鎖の上流で掴んだ行が起点になり、
      // 前工程は引っ張られ、後続は定義どおりの位置へ並ぶ(reducer 側のコメント参照)。
      dispatch(setPlannedDatesFromDrag(computeShiftedPlannedDates(planned, gridSteps, holidays, regularDaysOff)));
    }
    if (barType === 'actual' && actual.length > 0) {
      dispatch(setActualDates(computeShiftedActualDates(actual, gridSteps)));
    }
    if (events.length > 0) {
      const shifted = computeShiftedEventRows(events, gridSteps, barType === 'planned');
      if (shifted.length > 0) {
        dispatch(updateEventRows(shifted));
      }
    }
  }, [dispatch]);

  const finishDrag = useCallback(() => {
    const session = sessionRef.current;
    sessionRef.current = null;
    setIsMultiDragging(false);
    setCanGridRefDrag(true);
    if (!session) return;
    // 一度も動かさずに離したドラッグは、undo 履歴に残さない(単体ドラッグと同じ)。
    // 動かしていないなら操作としてはクリックなので、選択の扱いは呼び出し側へ渡す。
    if (gridStepsRef.current === 0) {
      dispatch(removePastState(1));
      session.onClickWithoutMove();
    }
    dispatch(updateSeparatorDates());
  }, [dispatch, setCanGridRefDrag]);

  useEffect(() => {
    if (!isMultiDragging) return;

    const handleMouseMove = (event: MouseEvent) => {
      const session = sessionRef.current;
      if (!session) return;
      const gridSteps = Math.floor((event.clientX - session.initialMouseX) / session.cellWidth);
      if (gridSteps === gridStepsRef.current) return;
      gridStepsRef.current = gridSteps;
      applyGridSteps(gridSteps);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', finishDrag);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', finishDrag);
    };
  }, [isMultiDragging, applyGridSteps, finishDrag]);

  return { isMultiDragging, tryBeginMultiDrag };
};
