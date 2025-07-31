// EventRowComponent.tsx
import React, { useState, memo, useEffect, useCallback, useReducer, useMemo, useRef } from 'react';
import { EventRow, EventData } from '../../types/DataTypes';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, updateEventRow, pushPastState, removePastState } from '../../reduxStoreAndSlices/store';
import { ChartBar } from './ChartBar';
import { GanttRow } from '../../styles/GanttStyles';
import { cdate } from 'cdate';
import ContextMenu from '../ContextMenu/ContextMenu';
import { useContextMenuOptions } from '../../hooks/useContextMenuOptions';
import { ColorInfo } from '../../reduxStoreAndSlices/colorSlice';

type Action =
  | { type: 'INIT'; payload: EventType[] }
  | { type: 'ADD_EVENT'; payload: EventType }
  | { type: 'UPDATE_START_DATE'; payload: { index: number; startDate: string | null } }
  | { type: 'UPDATE_END_DATE'; payload: { index: number; endDate: string | null } }
  | { type: 'UPDATE_EVENT_DATES'; payload: { index: number; startDate: string | null; endDate: string | null; } }
  | { type: 'UPDATE_DISPLAY_NAME'; payload: { index: number; displayName: string } };

type EventType = {
  startDate: string | null;
  endDate: string | null;
  isPlanned: boolean;
  eachDisplayName: string;
};

function eventsReducer(state: EventType[], action: Action): EventType[] {
  switch (action.type) {
    case 'INIT':
      return action.payload;
    case 'ADD_EVENT':
      return [...state, action.payload];
    case 'UPDATE_START_DATE':
      return state.map((event, index) =>
        index === action.payload.index
          ? { ...event, startDate: action.payload.startDate }
          : event
      );
    case 'UPDATE_END_DATE':
      return state.map((event, index) =>
        index === action.payload.index
          ? { ...event, endDate: action.payload.endDate }
          : event
      );
    case 'UPDATE_EVENT_DATES':
      return state.map((event, index) =>
        index === action.payload.index
          ? { ...event, startDate: action.payload.startDate, endDate: action.payload.endDate }
          : event
      );
    case 'UPDATE_DISPLAY_NAME':
      return state.map((event, index) =>
        index === action.payload.index
          ? { ...event, eachDisplayName: action.payload.displayName }
          : event
      );
    default:
      return state;
  }
}

interface EventRowProps {
  entry: EventRow;
  dateArray: ReturnType<typeof cdate>[];
  gridRef: React.RefObject<HTMLDivElement>;
  topPosition: number;
  setCanGridRefDrag: (canGridRefDrag: boolean) => void;
}

const EventRowComponent: React.FC<EventRowProps> = memo(({ entry, dateArray, gridRef, topPosition, setCanGridRefDrag }) => {
  const dispatch = useDispatch();
  const calendarWidth = useSelector((state: RootState) => state.baseSettings.calendarWidth);
  const wbsWidth = useSelector((state: RootState) => state.baseSettings.wbsWidth);
  const cellWidth = useSelector((state: RootState) => state.baseSettings.cellWidth);
  const rowHeight = useSelector((state: RootState) => state.baseSettings.rowHeight);
  const currentColors = useSelector((state: RootState) => state.color.colors);
  const isViewingPast = useSelector((state: RootState) => state.history?.isViewingPast || false);
  const previewData = useSelector((state: RootState) => state.history?.previewData);
  const colors: { [id: number]: ColorInfo } = isViewingPast && previewData?.colors ? previewData.colors : currentColors;
  const plannedChartBarColor = useMemo(() => {
    if (entry.color === '') { return '#76ff7051'; }
    const colorInfo = Object.values(colors).find(colorInfo =>
      colorInfo.alias.split(',').map(alias => alias.trim()).includes(entry.color)
    );
    return colorInfo ? colorInfo.color : '#76ff7051';
  }, [entry.color, colors]);
  const actualChartBarColor = useMemo(() => {
    const colorInfo = colors[999];
    return colorInfo ? colorInfo.color : '#0000003d';
  }, [colors]);
  const init = (initialEventData: EventData[]) => initialEventData.map(event => ({
    ...event,
    startDate: event.startDate ? event.startDate : null,
    endDate: event.endDate ? event.endDate : null,
    isPlanned: event.isPlanned,
    eachDisplayName: event.eachDisplayName
  }));
  const [localEvents, localDispatch] = useReducer(eventsReducer, entry.eventData, init);
  const [currentDate, setCurrentDate] = useState<cdate.CDate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isBarDragging, setIsBarDragging] = useState(false);
  const [isBarDragged, setIsBarDragged] = useState(false);
  const [isBarEndDragging, setIsBarEndDragging] = useState(false);
  const [isBarStartDragging, setIsBarStartDragging] = useState(false);
  const [originalStartDate, setOriginalStartDate] = useState<string | null>(null);
  const [originalEndDate, setOriginalEndDate] = useState<string | null>(null);
  const [initialMouseX, setInitialMouseX] = useState<number | null>(null);
  const [activeEventIndex, setActiveEventIndex] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<number | null>(null);
  const ganttRowRef = useRef<HTMLDivElement>(null);

  const handleBarMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>, index: number) => {
    dispatch(pushPastState());
    setIsBarDragging(true);
    setCanGridRefDrag(false);
    if (gridRef.current) {
      const gridStartX = ((gridRef.current.scrollLeft - wbsWidth) % cellWidth);
      const adjustedX = Math.floor((event.clientX + gridStartX - 1) / cellWidth) * cellWidth - gridStartX + 1;
      setInitialMouseX(adjustedX);
    }
    setOriginalStartDate(localEvents[index].startDate);
    setOriginalEndDate(localEvents[index].endDate);
    setActiveEventIndex(index);
  }, [cellWidth, dispatch, gridRef, localEvents, setCanGridRefDrag, wbsWidth]);

  const handleBarEndMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>, index: number) => {
    dispatch(pushPastState());
    setIsBarEndDragging(true);
    setCanGridRefDrag(false);
    if (gridRef.current) {
      const gridStartX = ((gridRef.current.scrollLeft - wbsWidth) % cellWidth);
      const adjustedX = Math.floor((event.clientX + gridStartX - 1) / cellWidth) * cellWidth - gridStartX + 1;
      setInitialMouseX(adjustedX);
    }
    setOriginalStartDate(localEvents[index].startDate);
    setOriginalEndDate(localEvents[index].endDate);
    setActiveEventIndex(index);
  }, [cellWidth, dispatch, gridRef, localEvents, setCanGridRefDrag, wbsWidth]);

  const handleBarStartMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>, index: number) => {
    dispatch(pushPastState());
    setIsBarStartDragging(true);
    setCanGridRefDrag(false);
    if (gridRef.current) {
      const gridStartX = ((gridRef.current.scrollLeft - wbsWidth) % cellWidth);
      const adjustedX = Math.floor((event.clientX + gridStartX - 1) / cellWidth) * cellWidth - gridStartX + 1;
      setInitialMouseX(adjustedX);
    }
    setOriginalStartDate(localEvents[index].startDate);
    setOriginalEndDate(localEvents[index].endDate);
    setActiveEventIndex(index);
  }, [cellWidth, dispatch, gridRef, localEvents, setCanGridRefDrag, wbsWidth]);

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
    dispatch(pushPastState());
    setCanGridRefDrag(false);
    const rect = event.currentTarget.getBoundingClientRect();
    const relativeX = event.clientX - rect.left;
    const clickedDate = calculateDateFromX(relativeX);
    setIsEditing(true);
    setCurrentDate(clickedDate);
    const isShiftKeyDown = event.shiftKey;
    const newEvent = {
      startDate: clickedDate.format('YYYY/MM/DD'),
      endDate: clickedDate.format('YYYY/MM/DD'),
      isPlanned: !isShiftKeyDown,
      eachDisplayName: ""
    };
    localDispatch({ type: 'ADD_EVENT', payload: newEvent });
    setActiveEventIndex(localEvents.length);
  }, [calculateDateFromX, dispatch, localEvents.length, setCanGridRefDrag]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if ((isBarDragging || isBarEndDragging || isBarStartDragging) && initialMouseX !== null && activeEventIndex !== null) {
      const currentMouseX = event.clientX;
      let deltaX
      if (isBarDragging) {
        deltaX = currentMouseX - initialMouseX;
      } else if (isBarEndDragging) {
        deltaX = currentMouseX - initialMouseX + cellWidth;
      } else { // (isBarStartDragging)
        deltaX = currentMouseX - initialMouseX - cellWidth;
      }
      const gridSteps = Math.floor(deltaX / cellWidth);

      let newStartDateCdate = originalStartDate ? cdate(originalStartDate) : null;
      let newEndDateCdate = originalEndDate ? cdate(originalEndDate) : null;

      if (isBarDragging && newStartDateCdate && newEndDateCdate) {
        newStartDateCdate = newStartDateCdate.add(gridSteps, 'days');
        newEndDateCdate = newEndDateCdate.add(gridSteps, 'days');
        setIsBarDragged(true);
      } else if (isBarEndDragging && newEndDateCdate && newStartDateCdate) {
        newEndDateCdate = newEndDateCdate.add(gridSteps, 'days');
        if (+newEndDateCdate < +newStartDateCdate) {
          newEndDateCdate = newStartDateCdate;
        }
      } else if (isBarStartDragging && newStartDateCdate && newEndDateCdate) {
        newStartDateCdate = newStartDateCdate.add(gridSteps, 'days');
        if (+newStartDateCdate > +newEndDateCdate) {
          newStartDateCdate = newEndDateCdate;
        }
      }

      localDispatch({
        type: 'UPDATE_EVENT_DATES',
        payload: {
          index: activeEventIndex,
          startDate: newStartDateCdate ? newStartDateCdate.format('YYYY/MM/DD') : null,
          endDate: newEndDateCdate ? newEndDateCdate.format('YYYY/MM/DD') : null
        }
      });
    } else if (isEditing) {
      const gridRect = gridRef.current?.getBoundingClientRect();
      if (!gridRect || !currentDate || activeEventIndex === null) return;

      const scrollLeft = gridRef.current?.scrollLeft || 0;
      const relativeX = event.clientX - gridRect.left + scrollLeft - 1;
      const newDateCdate = calculateDateFromX(relativeX);

      const isEndDate = +newDateCdate > + currentDate;
      const newStartDateCdate = isEndDate ? currentDate : newDateCdate;
      const newEndDateCdate = isEndDate ? newDateCdate : currentDate;
      localDispatch({
        type: 'UPDATE_EVENT_DATES',
        payload: {
          index: activeEventIndex,
          startDate: newStartDateCdate.format('YYYY/MM/DD'),
          endDate: newEndDateCdate.format('YYYY/MM/DD')
        }
      });
    }
  }, [isBarDragging, isBarEndDragging, isBarStartDragging, initialMouseX, activeEventIndex, isEditing, cellWidth, originalStartDate, originalEndDate, gridRef, currentDate, calculateDateFromX]);

  useEffect(() => {
    if (!isEditing && !isBarDragging && !isBarEndDragging && !isBarStartDragging) {
      const initializedEvents = entry.eventData.map(event => ({
        ...event,
        startDate: event.startDate ? event.startDate : null,
        endDate: event.endDate ? event.endDate : null,
      }));
      localDispatch({ type: 'INIT', payload: initializedEvents });
    }
  }, [entry.eventData, isEditing, isBarDragging, isBarEndDragging, isBarStartDragging, dispatch]);

  const syncToStore = useCallback(() => {
    if (isEditing || isBarDragging || isBarEndDragging || isBarStartDragging) {
      const updatedEventData = localEvents.map(event => ({
        ...event,
        startDate: event.startDate ? event.startDate : "",
        endDate: event.endDate ? event.endDate : ""
      }));

      const updatedEventRow = {
        ...entry,
        eventData: updatedEventData
      };

      dispatch(updateEventRow({ id: entry.id, updatedEventRow }));
    }
  }, [isEditing, isBarDragging, isBarEndDragging, isBarStartDragging, localEvents, entry, dispatch]);

  const handleMouseUp = () => {
    let shouldremovePastState = false;
    if (activeEventIndex !== null) {
      if (activeEventIndex !== null && localEvents[activeEventIndex]) {
        const event = localEvents[activeEventIndex];
        const originalStartDateString = originalStartDate ? originalStartDate : null;
        const eventStartDateString = event.startDate ? event.startDate : null;
        const originalEndDateString = originalEndDate ? originalEndDate : null;
        const eventEndDateString = event.endDate ? event.endDate : null;
        shouldremovePastState = (originalStartDateString === eventStartDateString && originalEndDateString === eventEndDateString);
        if (shouldremovePastState) {
          dispatch(removePastState(1));
        }
      }
    }
    syncToStore();
    setIsEditing(false);
    setIsBarDragging(false);
    setIsBarDragged(false);
    setIsBarEndDragging(false);
    setIsBarStartDragging(false);
    setInitialMouseX(null);
    setCanGridRefDrag(true);
  };

  const handleBarRightClick = useCallback((event: React.MouseEvent<HTMLDivElement>, index: number | null) => {
    event.stopPropagation();
    setContextMenu(index);
  }, []);

  const handleDeleteBar = useCallback(() => {
    if (contextMenu !== null) {
      const updatedEventData = localEvents.filter((_, index) => index !== contextMenu).map(event => ({
        ...event,
        startDate: event.startDate ? event.startDate : "",
        endDate: event.endDate ? event.endDate : ""
      }));
      const updatedEventRow = {
        ...entry,
        eventData: updatedEventData
      };
      dispatch(updateEventRow({ id: entry.id, updatedEventRow }));
    }
  }, [contextMenu, localEvents, entry, dispatch]);

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
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
      )}
      {localEvents.map((event, index) => (
        <ChartBar
          key={index}
          startDate={event.startDate ? event.startDate : null}
          endDate={event.endDate ? event.endDate : null}
          dateArray={dateArray}
          isActual={!event.isPlanned}
          entryId={entry.id}
          eventIndex={index}
          isBarDragging={activeEventIndex === index ? (isBarDragging || isBarStartDragging || isBarEndDragging) : false}
          chartBarColor={event.isPlanned ? plannedChartBarColor : actualChartBarColor}
          isBarDragged={isBarDragged}
          onBarMouseDown={(e) => handleBarMouseDown(e, index)}
          onBarEndMouseDown={(e) => handleBarEndMouseDown(e, index)}
          onBarStartMouseDown={(e) => handleBarStartMouseDown(e, index)}
          onContextMenu={(e) => handleBarRightClick(e, index)}
        />
      ))}
      <ContextMenu
        targetRef={ganttRowRef}
        items={menuOptions}
      />
    </GanttRow>
  );
});

export default EventRowComponent;