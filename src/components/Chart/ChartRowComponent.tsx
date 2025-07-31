import React, { useState, memo, useEffect, useCallback, useRef, useMemo } from 'react';
import { ChartRow } from '../../types/DataTypes';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, setPlannedDate, setActualDate, pushPastState, removePastState, updateSeparatorDates } from '../../reduxStoreAndSlices/store';
import { addPlannedDays } from '../../utils/CommonUtils';
import { ChartBar } from './ChartBar';
import { GanttRow } from '../../styles/GanttStyles';
import { cdate } from 'cdate';
import ContextMenu from '../ContextMenu/ContextMenu';
import { useContextMenuOptions } from '../../hooks/useContextMenuOptions';
import { ColorInfo } from '../../reduxStoreAndSlices/colorSlice';

interface ChartRowProps {
  entry: ChartRow;
  dateArray: ReturnType<typeof cdate>[];
  gridRef: React.RefObject<HTMLDivElement>;
  topPosition: number;
  setCanGridRefDrag: (canGridRefDrag: boolean) => void;
}

const ChartRowComponent: React.FC<ChartRowProps> = memo(({ entry, dateArray, gridRef, topPosition, setCanGridRefDrag }) => {
  const dispatch = useDispatch();
  const calendarWidth = useSelector((state: RootState) => state.baseSettings.calendarWidth);
  const wbsWidth = useSelector((state: RootState) => state.baseSettings.wbsWidth);
  const cellWidth = useSelector((state: RootState) => state.baseSettings.cellWidth);
  const rowHeight = useSelector((state: RootState) => state.baseSettings.rowHeight);
  const currentColors = useSelector((state: RootState) => state.color.colors);
  const isViewingPast = useSelector((state: RootState) => state.history?.isViewingPast || false);
  const previewData = useSelector((state: RootState) => state.history?.previewData);
  const colors: { [id: number]: ColorInfo } = isViewingPast && previewData?.colors ? previewData.colors : currentColors;
  const currentFallbackColor = useSelector((state: RootState) => state.color.fallbackColor);
  const fallbackColor = isViewingPast && previewData?.fallbackColor ? previewData.fallbackColor : currentFallbackColor;


  const plannedChartBarColor = useMemo(() => {
    if (entry.color === '') { return fallbackColor; }
    const colorInfo = Object.values(colors).find(colorInfo =>
      colorInfo.alias.split(',').map(alias => alias.trim()).includes(entry.color)
    );
    return colorInfo ? colorInfo.color : fallbackColor;
  }, [entry.color, colors, fallbackColor]);
  const actualChartBarColor = useMemo(() => {
    const colorInfo = colors[999];
    return colorInfo ? colorInfo.color : '#0000003d';
  }, [colors]);
  const plannedDays = useMemo(() => { return entry.plannedDays }, [entry.plannedDays]);
  const isIncludeHolidays = useMemo(() => { return entry.isIncludeHolidays }, [entry.isIncludeHolidays]);
  const currentHolidays = useSelector((state: RootState) => state.wbsData.holidays);
  const holidays = isViewingPast && previewData?.holidays ? previewData.holidays : currentHolidays;
  const regularDaysOff = useSelector((state: RootState) => state.wbsData.regularDaysOff);
  const [localPlannedStartDate, setLocalPlannedStartDate] = useState(entry.plannedStartDate ? entry.plannedStartDate : null);
  const [localPlannedEndDate, setLocalPlannedEndDate] = useState(entry.plannedEndDate ? entry.plannedEndDate : null);
  const [localActualStartDate, setLocalActualStartDate] = useState(entry.actualStartDate ? entry.actualStartDate : null);
  const [localActualEndDate, setLocalActualEndDate] = useState(entry.actualEndDate ? entry.actualEndDate : null);
  const [currentDate, setCurrentDate] = useState<cdate.CDate | null>(null);
  const [isEditing, setIsEditing] = useState<'planned' | 'actual' | null>(null);
  const [isBarDragging, setIsBarDragging] = useState<'planned' | 'actual' | null>(null);
  const [isPlannedBarDragged, setIsPlannedBarDragged] = useState(false);
  const [isBarEndDragging, setIsBarEndDragging] = useState<'planned' | 'actual' | null>(null);
  const [isBarStartDragging, setIsBarStartDragging] = useState<'planned' | 'actual' | null>(null);
  const originalDateRef = useRef({ start: '', end: '' });
  const [initialMouseX, setInitialMouseX] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<'planned' | 'actual' | null>(null);
  const prevDateRef = useRef<ReturnType<typeof cdate> | string>();
  const ganttRowRef = useRef<HTMLDivElement>(null);

  const handleBarMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>, barType: 'planned' | 'actual') => {
    setIsBarDragging(barType);
    setCanGridRefDrag(false);
    dispatch(pushPastState());
    if (gridRef.current) {
      const gridStartX = ((gridRef.current.scrollLeft - wbsWidth) % cellWidth);
      const adjustedX = Math.floor((event.clientX + gridStartX - 1) / cellWidth) * cellWidth - gridStartX + 1;
      setInitialMouseX(adjustedX);
    }
    if (barType === 'planned') {
      originalDateRef.current.start = localPlannedStartDate ?? '';
      originalDateRef.current.end = localPlannedEndDate ?? '';
    } else { // barType === 'actual'
      originalDateRef.current.start = localActualStartDate ?? '';
      originalDateRef.current.end = localActualEndDate ?? '';
    }
  }, [cellWidth, dispatch, gridRef, localActualEndDate, localActualStartDate, localPlannedEndDate, localPlannedStartDate, setCanGridRefDrag, wbsWidth]);

  const handleBarEndMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>, barType: 'planned' | 'actual') => {
    setIsBarEndDragging(barType);
    setCanGridRefDrag(false);
    dispatch(pushPastState());

    if (gridRef.current) {
      const gridStartX = ((gridRef.current.scrollLeft - wbsWidth) % cellWidth);
      const adjustedX = Math.floor((event.clientX + gridStartX - 1) / cellWidth) * cellWidth - gridStartX + 1;
      setInitialMouseX(adjustedX);
    }
    if (barType === 'planned') {
      originalDateRef.current.end = localPlannedEndDate ?? '';
    } else { // barType === 'actual'
      originalDateRef.current.start = localActualStartDate ?? '';
      originalDateRef.current.end = localActualEndDate ?? '';
    }
  }, [cellWidth, dispatch, gridRef, localActualEndDate, localActualStartDate, localPlannedEndDate, setCanGridRefDrag, wbsWidth]);

  const handleBarStartMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>, barType: 'planned' | 'actual') => {
    setIsBarStartDragging(barType);
    setCanGridRefDrag(false);
    dispatch(pushPastState());

    if (gridRef.current) {
      const gridStartX = ((gridRef.current.scrollLeft - wbsWidth) % cellWidth);
      const adjustedX = Math.floor((event.clientX + gridStartX - 1) / cellWidth) * cellWidth - gridStartX + 1;
      setInitialMouseX(adjustedX);
    }
    if (barType === 'planned') {
      originalDateRef.current.start = localPlannedStartDate ?? '';
    } else { // barType === 'actual'
      originalDateRef.current.start = localActualStartDate ?? '';
      originalDateRef.current.end = localActualEndDate ?? '';
    }
  }, [cellWidth, dispatch, gridRef, localActualEndDate, localActualStartDate, localPlannedStartDate, setCanGridRefDrag, wbsWidth]);

  const calculateDateFromX = useCallback((x: number) => {
    const dateIndex = Math.floor(x / cellWidth);
    if (dateIndex < 0) {
      return dateArray[0].startOf('day');
    } else if (dateIndex >= dateArray.length) {
      return dateArray[dateArray.length - 1].startOf('day');
    }
    return dateArray[dateIndex].startOf('day');
  }, [cellWidth, dateArray]);

  const handleDoubleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    setCanGridRefDrag(false);
    dispatch(pushPastState());
    const rect = event.currentTarget.getBoundingClientRect();
    const relativeX = event.clientX - rect.left;
    const clickedDate = calculateDateFromX(relativeX);
    setCurrentDate(clickedDate);
    if (event.shiftKey) {
      setIsEditing('actual');
      setLocalActualStartDate(clickedDate.format('YYYY/MM/DD'))
      setLocalActualEndDate(clickedDate.format('YYYY/MM/DD'))
    } else {
      setIsEditing('planned')
      setLocalPlannedStartDate(clickedDate.format('YYYY/MM/DD'))
      setLocalPlannedEndDate(clickedDate.format('YYYY/MM/DD'))
    }
  }, [calculateDateFromX, dispatch, setCanGridRefDrag]);

  const handleMouseMoveEditing = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const update = () => {
      const gridRect = gridRef.current?.getBoundingClientRect();
      if (!gridRect || !currentDate) return;

      const scrollLeft = gridRef.current?.scrollLeft || 0;
      const relativeX = event.clientX - gridRect.left + scrollLeft - 1;
      const newDate = calculateDateFromX(relativeX);
      if (newDate != prevDateRef.current) {
        const isEndDate = newDate > currentDate;
        if (isEditing === 'actual') {
          setLocalActualStartDate(isEndDate ? currentDate.format('YYYY/MM/DD') : newDate.format('YYYY/MM/DD'));
          setLocalActualEndDate(isEndDate ? newDate.format('YYYY/MM/DD') : currentDate.format('YYYY/MM/DD'));
        } else if (isEditing === 'planned') {
          setLocalPlannedStartDate(isEndDate ? currentDate.format('YYYY/MM/DD') : newDate.format('YYYY/MM/DD'));
          setLocalPlannedEndDate(isEndDate ? newDate.format('YYYY/MM/DD') : currentDate.format('YYYY/MM/DD'));
        }
      }
      prevDateRef.current = newDate;
    };
    requestAnimationFrame(update);
  }, [calculateDateFromX, currentDate, gridRef, isEditing]);

  const handleMouseMoveBarDragging = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (initialMouseX !== null) {
      const currentMouseX = event.clientX;
      const deltaX = currentMouseX - initialMouseX;
      const gridSteps = Math.floor(deltaX / cellWidth);
      const newStartDateString = cdate(originalDateRef.current.start).add(gridSteps, 'days').format('YYYY/MM/DD');
      if (newStartDateString !== prevDateRef.current) {
        if (isBarDragging === 'planned') {
          setLocalPlannedStartDate(newStartDateString);
          const newEndDate = addPlannedDays(newStartDateString, plannedDays, holidays, isIncludeHolidays, true, regularDaysOff);
          setLocalPlannedEndDate(newEndDate);
          setIsPlannedBarDragged(true);
        } else if (isBarDragging === 'actual') {
          setLocalActualStartDate(newStartDateString);
          const newEndDateString = cdate(originalDateRef.current.end).add(gridSteps, 'days').format('YYYY/MM/DD');
          setLocalActualEndDate(newEndDateString);
        }
      }
      prevDateRef.current = newStartDateString;
    }
  }, [cellWidth, holidays, initialMouseX, isBarDragging, isIncludeHolidays, plannedDays, regularDaysOff]);

  const handleMouseMoveBarEndDragging = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (initialMouseX !== null) {
      const currentMouseX = event.clientX;
      const deltaX = currentMouseX - initialMouseX + cellWidth;
      const gridSteps = Math.floor(deltaX / cellWidth);
      const newEndDateString = cdate(originalDateRef.current.end).add(gridSteps, 'days').format('YYYY/MM/DD');
      if (newEndDateString !== prevDateRef.current) {
        if (isBarEndDragging === 'planned' && localPlannedStartDate) {
          const isEndDateBeforeStartDate = cdate(newEndDateString) < cdate(localPlannedStartDate);
          setLocalPlannedEndDate(isEndDateBeforeStartDate ? localPlannedStartDate : newEndDateString);
        } else if (isBarEndDragging === 'actual' && localActualStartDate) {
          const isEndDateBeforeStartDate = cdate(newEndDateString) < cdate(localActualStartDate);
          setLocalActualEndDate(isEndDateBeforeStartDate ? localActualStartDate : newEndDateString);
        }
      }
      prevDateRef.current = newEndDateString;
    }
  }, [cellWidth, initialMouseX, isBarEndDragging, localActualStartDate, localPlannedStartDate]);

  const handleMouseMoveBarStartDragging = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (initialMouseX !== null) {
      const currentMouseX = event.clientX;
      const deltaX = currentMouseX - initialMouseX - cellWidth;
      const gridSteps = Math.floor(deltaX / cellWidth);
      const newStartDateString = cdate(originalDateRef.current.start).add(gridSteps, 'days').format('YYYY/MM/DD');
      if (newStartDateString !== prevDateRef.current) {
        if (isBarStartDragging === 'planned' && localPlannedEndDate) {
          const isStartDateAfterEndDate = cdate(newStartDateString) > cdate(localPlannedEndDate);
          setLocalPlannedStartDate(isStartDateAfterEndDate ? localPlannedEndDate : newStartDateString);
        } else if (isBarStartDragging === 'actual' && localActualEndDate) {
          const isStartDateAfterEndDate = cdate(newStartDateString) > cdate(localActualEndDate);
          setLocalActualStartDate(isStartDateAfterEndDate ? localActualEndDate : newStartDateString);
        }
      }
      prevDateRef.current = newStartDateString;
    }
  }, [cellWidth, initialMouseX, isBarStartDragging, localActualEndDate, localPlannedEndDate]);

  useEffect(() => {
    if (!isEditing && !isBarDragging && !isBarEndDragging && !isBarStartDragging) {
      if (['planned', null].includes(isEditing) || ['planned', null].includes(isBarDragging) || ['planned', null].includes(isBarEndDragging) || ['planned', null].includes(isBarStartDragging)) {
        setLocalPlannedStartDate(entry.plannedStartDate ? entry.plannedStartDate : null);
        setLocalPlannedEndDate(entry.plannedEndDate ? entry.plannedEndDate : null);
      }
      if (['actual', null].includes(isEditing) || ['actual', null].includes(isBarDragging) || ['actual', null].includes(isBarEndDragging) || ['actual', null].includes(isBarStartDragging)) {
        setLocalActualStartDate(entry.actualStartDate ? entry.actualStartDate : null);
        setLocalActualEndDate(entry.actualEndDate ? entry.actualEndDate : null);
      }
    }
  }, [entry.plannedStartDate, entry.plannedEndDate, entry.actualStartDate, entry.actualEndDate, isEditing, isBarDragging, isBarEndDragging, isBarStartDragging]);

  const syncTimeoutRef = useRef<number | null>(null);
  const syncToStore = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    syncTimeoutRef.current = window.setTimeout(() => {
      if (isEditing || isBarDragging || isBarEndDragging || isBarStartDragging) {
        if (['planned', null].includes(isEditing) || ['planned', null].includes(isBarDragging) || ['planned', null].includes(isBarEndDragging) || ['planned', null].includes(isBarStartDragging)) {
          if (localPlannedStartDate && localPlannedEndDate) {
            dispatch(setPlannedDate({
              id: entry.id,
              startDate: localPlannedStartDate,
              endDate: localPlannedEndDate
            }));
          }
        }
        if (['actual', null].includes(isEditing) || ['actual', null].includes(isBarDragging) || ['actual', null].includes(isBarEndDragging) || ['actual', null].includes(isBarStartDragging)) {
          if (localActualStartDate && localActualEndDate) {
            dispatch(setActualDate({
              id: entry.id,
              startDate: localActualStartDate,
              endDate: localActualEndDate
            }));
          }
        }
      }
    }, 50);
  }, [isEditing, isBarDragging, isBarEndDragging, isBarStartDragging, localPlannedStartDate, localPlannedEndDate, localActualStartDate, localActualEndDate, dispatch, entry.id]);

  useEffect(() => {
    syncToStore();
  }, [localPlannedStartDate, localPlannedEndDate, localActualStartDate, localActualEndDate, syncToStore]);

  const handleMouseUp = useCallback(() => {
    const isPlannedDrag = isBarDragging === 'planned' || isBarStartDragging === 'planned' || isBarEndDragging === 'planned';
    const isActualDrag = isBarDragging === 'actual' || isBarStartDragging === 'actual' || isBarEndDragging === 'actual';
    let shouldremovePastState = false;
    if (isPlannedDrag) {
      const originalPlannedStartDate = originalDateRef.current.start ? originalDateRef.current.start : null;
      const originalPlannedEndDate = originalDateRef.current.end ? originalDateRef.current.end : null;
      const localPlannedStartDateStr = localPlannedStartDate ? localPlannedStartDate : null;
      const localPlannedEndDateStr = localPlannedEndDate ? localPlannedEndDate : null;
      shouldremovePastState = (originalPlannedStartDate === localPlannedStartDateStr && originalPlannedEndDate === localPlannedEndDateStr);
    } else if (isActualDrag) {
      const originalActualStartDate = originalDateRef.current.start ? originalDateRef.current.start : null;
      const originalActualEndDate = originalDateRef.current.end ? originalDateRef.current.end : null;
      const localActualStartDateStr = localActualStartDate ? localActualStartDate : null;
      const localActualEndDateStr = localActualEndDate ? localActualEndDate : null;
      shouldremovePastState = (originalActualStartDate === localActualStartDateStr && originalActualEndDate === localActualEndDateStr);
    }
    if (shouldremovePastState) {
      dispatch(removePastState(1));
    }
    syncToStore();
    setIsEditing(null);
    setIsBarDragging(null);
    setIsPlannedBarDragged(false);
    setIsBarEndDragging(null);
    setIsBarStartDragging(null);
    setInitialMouseX(null);
    setCanGridRefDrag(true);
    dispatch(updateSeparatorDates());
  }, [dispatch, isBarDragging, isBarEndDragging, isBarStartDragging, localActualEndDate, localActualStartDate, localPlannedEndDate, localPlannedStartDate, setCanGridRefDrag, syncToStore]);

  const handleBarRightClick = useCallback((event: React.MouseEvent<HTMLDivElement>, barType: 'planned' | 'actual' | null) => {
    event.stopPropagation();
    setContextMenu(barType);
  }, []);

  const handleDeleteBar = useCallback(() => {
    if (contextMenu !== null) {
      dispatch(pushPastState());

      if (contextMenu === 'planned') {
        setLocalPlannedStartDate(null);
        setLocalPlannedEndDate(null);
        dispatch(setPlannedDate({ id: entry.id, startDate: '', endDate: '' }));
        dispatch(updateSeparatorDates());
      } else if (contextMenu === 'actual') {
        setLocalActualStartDate(null);
        setLocalActualEndDate(null);
        dispatch(setActualDate({ id: entry.id, startDate: '', endDate: '' }));
      }
    }
  }, [contextMenu, dispatch, entry.id]);

  const menuOptions = useContextMenuOptions({
    entry,
    onDeleteBar: handleDeleteBar,
    contextMenu
  });

  return (
    <GanttRow style={{ position: 'absolute', top: `${topPosition}px`, width: `${calendarWidth}px`, height: `${rowHeight}px` }} onDoubleClick={handleDoubleClick} onContextMenu={(e) => handleBarRightClick(e, null)} ref={ganttRowRef}>
      {(isEditing || isBarDragging || isBarEndDragging || isBarStartDragging) && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: 'calc(100vh - 12px)', zIndex: 9999, cursor: 'pointer' }}
          onMouseMove={isEditing ? handleMouseMoveEditing : isBarDragging ? handleMouseMoveBarDragging : isBarEndDragging ? handleMouseMoveBarEndDragging : handleMouseMoveBarStartDragging}
          onMouseUp={handleMouseUp}
        />
      )}
      {localPlannedStartDate && localPlannedEndDate && (
        <ChartBar
          startDate={localPlannedStartDate}
          endDate={localPlannedEndDate}
          dateArray={dateArray}
          isActual={false}
          entryId={entry.id}
          chartBarColor={plannedChartBarColor}
          isBarDragged={isPlannedBarDragged}
          isBarDragging={Boolean(isEditing === "planned" || isBarDragging === "planned" || isBarEndDragging === "planned" || isBarStartDragging === "planned")}
          onBarMouseDown={(e) => handleBarMouseDown(e, 'planned')}
          onBarEndMouseDown={(e) => handleBarEndMouseDown(e, 'planned')}
          onBarStartMouseDown={(e) => handleBarStartMouseDown(e, 'planned')}
          onContextMenu={(e) => handleBarRightClick(e, 'planned')}
        />
      )}
      {localActualStartDate && localActualEndDate && (
        <ChartBar
          startDate={localActualStartDate}
          endDate={localActualEndDate}
          dateArray={dateArray}
          isActual={true}
          entryId={entry.id}
          chartBarColor={actualChartBarColor}
          isBarDragging={Boolean(isEditing === "actual" || isBarDragging === "actual" || isBarEndDragging === "actual" || isBarStartDragging === "actual")}
          onBarMouseDown={(e) => handleBarMouseDown(e, 'actual')}
          onBarEndMouseDown={(e) => handleBarEndMouseDown(e, 'actual')}
          onBarStartMouseDown={(e) => handleBarStartMouseDown(e, 'actual')}
          onContextMenu={(e) => handleBarRightClick(e, 'actual')}
        />
      )}
      <ContextMenu
        targetRef={ganttRowRef}
        items={menuOptions}
      />
    </GanttRow >
  );
});

export default ChartRowComponent;