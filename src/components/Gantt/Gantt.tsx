// Gantt.tsx
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, undo, redo } from '../../reduxStoreAndSlices/store';
import { setWbsWidth, setMaxWbsWidth, setScrollPosition } from '../../reduxStoreAndSlices/baseSettingsSlice';
import { isChartRow, isEventRow, isSeparatorRow, WBSData } from '../../types/DataTypes';
import Calendar from '../Chart/Calendar';
import GridVertical from '../Chart/GridVertical';
import ChartRowComponent from '../Chart/ChartRowComponent';
import EventRowComponent from '../Chart/EventRowComponent';
import SeparatorRowComponent from '../Chart/SeparatorRowComponent';
import ResizeBar from '../WbsWidthResizer';
import WBSInfo from '../Table/WBSInfo';
import SeparatorRowLabelComponent from '../Table/SeparatorRowLabel';
import { generateDates } from '../../utils/CommonUtils';
import { useTranslation } from 'react-i18next';
import ErrorMessage from '../MessageInfo';
import { setActiveModal } from '../../reduxStoreAndSlices/uiFlagSlice';
import CustomRowCountDialogContainer from '../ContextMenu/CustomRowCountDialogContainer';
import { useLocation } from 'react-router-dom';
import TopBarLocal from '../Topbar/TopBarLocal';

function Gantt() {
  const activeModal = useSelector((state: RootState) => state.uiFlags.activeModal);
  const { t } = useTranslation();
  const dispatch = useDispatch();
  
  // Historical data for preview functionality
  const isViewingPast = useSelector((state: RootState) => state.history?.isViewingPast || false);
  const previewData = useSelector((state: RootState) => state.history?.previewData);
  
  // Always get current data
  const currentData = useSelector((state: RootState) => state.wbsData.data);
  const currentColumns = useSelector((state: RootState) => state.wbsData.columns);
  const currentDateRange = useSelector((state: RootState) => state.baseSettings.dateRange);
  const currentCellWidth = useSelector((state: RootState) => state.baseSettings.cellWidth);
  const currentWbsWidth = useSelector((state: RootState) => state.baseSettings.wbsWidth);
  
  // Get data based on viewing mode
  const data = isViewingPast && previewData?.data ? previewData.data : currentData;
  const columns = isViewingPast && previewData?.columns ? previewData.columns : currentColumns;
  const dateRange = isViewingPast && previewData?.dateRange ? previewData.dateRange : currentDateRange;
  const cellWidth = isViewingPast && previewData?.cellWidth ? previewData.cellWidth : currentCellWidth;
  const wbsWidth = isViewingPast && previewData?.wbsWidth ? previewData.wbsWidth : currentWbsWidth;
  
  // These still come from current state as they don't affect data display
  const maxWbsWidth = useSelector((state: RootState) => state.baseSettings.maxWbsWidth);
  const rowHeight = useSelector((state: RootState) => state.baseSettings.rowHeight);
  const isContextMenuOpen = useSelector((state: RootState) => state.uiFlags.isContextMenuOpen);
  const scrollPosition = useSelector((state: RootState) => state.baseSettings.scrollPosition);
  const [isGridRefDragging, setIsGridRefDragging] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [canGridRefDrag, setCanGridRefDrag] = useState(true);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [gridHeight, setGridHeight] = useState<number>(0);
  const [indicatorPosition, setIndicatorPosition] = useState({ x: 0, y: 0 });
  const [visibleRange, setVisibleRange] = useState({ startIndex: 0, endIndex: 200 });
  const topbarHeight = 28;
  const wbsRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const dragTimeoutRef = useRef<number | null>(null);
  const prevIndicatorRef = useRef({ x: 0, y: 0 });
  const prevCellWidthRef = useRef(cellWidth);
  const dateArray = useMemo(() => generateDates(dateRange.startDate, dateRange.endDate), [dateRange]);
  const renderRowsInterval = 30;
  const visibleRows = useMemo(() => Math.ceil(gridHeight / rowHeight), [gridHeight, rowHeight]);
  const totalRows = useMemo(() => Object.keys(data).length, [data]);
  const location = useLocation();
  const isLocalMode = location.pathname.startsWith('/local');

  const filteredData = useMemo(() => {
    const result: [string, WBSData][] = [];
    const collapseStack: number[] = [];
    Object.entries(data).forEach(([key, entry]) => {
      if (isSeparatorRow(entry)) {
        while (collapseStack.length > 0 && collapseStack[collapseStack.length - 1] >= (entry.level || 0)) {
          collapseStack.pop();
        }
        if (collapseStack.length > 0) {
          return;
        }
        result.push([key, entry]);
        if (entry.isCollapsed) {
          collapseStack.push(entry.level || 0);
        }
      } else {
        if (collapseStack.length > 0) {
          return;
        }
        result.push([key, entry]);
      }
    });
    return result;
  }, [data]);

  const calculateAndSetIndicatorPosition = useCallback((event: MouseEvent) => {
    if (isContextMenuOpen) return;
    if (!gridRef.current) return;
    const gridStartX = (gridRef.current.scrollLeft - wbsWidth) % cellWidth;
    const adjustedX = Math.floor((event.clientX + gridStartX - 1) / cellWidth) * cellWidth - gridStartX + 1;
    let adjustedY = indicatorPosition.y;
    if (canGridRefDrag) {
      const gridStartY = (gridRef.current.scrollTop % rowHeight) + topbarHeight + 7;
      adjustedY = Math.floor((event.clientY + gridStartY + 1) / rowHeight) * rowHeight - gridStartY;
    }
    if (prevIndicatorRef.current.x !== adjustedX || prevIndicatorRef.current.y !== adjustedY) {
      setIndicatorPosition({ x: adjustedX, y: adjustedY });
      prevIndicatorRef.current = { x: adjustedX, y: adjustedY };
    }
  }, [canGridRefDrag, cellWidth, indicatorPosition.y, isContextMenuOpen, rowHeight, wbsWidth]);

  const handleMouseDown = useCallback((event: MouseEvent) => {
    if (event.button === 0) {
      setIsMouseDown(true);
      if (canGridRefDrag && gridRef.current) {
        setStartX(event.clientX + gridRef.current.scrollLeft);
        setStartY(event.clientY + gridRef.current.scrollTop);
      }
    }
  }, [canGridRefDrag]);

  const handleMouseUp = useCallback((event: MouseEvent) => {
    setIsMouseDown(false);
    calculateAndSetIndicatorPosition(event)
  }, [calculateAndSetIndicatorPosition]);

  const updateVisibleRange = useCallback(() => {
    if (!gridRef.current) return;
    const startIndex = Math.max(Math.floor(gridRef.current.scrollTop / rowHeight) - renderRowsInterval, 0);
    const endIndex = Math.min(totalRows - 1, startIndex + visibleRows + (renderRowsInterval * 2));
    if (Math.abs(startIndex - visibleRange.startIndex) >= renderRowsInterval || (startIndex == 0 && visibleRange.startIndex != 0)) {
      setVisibleRange({ startIndex, endIndex });
    }
  }, [rowHeight, visibleRows, totalRows, visibleRange.startIndex]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!gridRef.current) return;

    if (canGridRefDrag && isMouseDown) {
      const newScrollLeft = startX - event.clientX;
      const newScrollTop = startY - event.clientY;
      gridRef.current.scrollLeft = newScrollLeft;
      gridRef.current.scrollTop = newScrollTop;
      calculateAndSetIndicatorPosition(event)
    } else if (!isGridRefDragging) {
      calculateAndSetIndicatorPosition(event)
    } else if (isGridRefDragging && !isMouseDown) {
      setIsGridRefDragging(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canGridRefDrag, cellWidth, isGridRefDragging, isMouseDown, startX, startY, wbsWidth, isContextMenuOpen]);

  const resetDragTimeout = useCallback(() => {
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
    }
    dragTimeoutRef.current = window.setTimeout(() => {
      if (dragTimeoutRef.current !== null) {
        clearTimeout(dragTimeoutRef.current);
      } else if (!isMouseDown) {
        setIsGridRefDragging(false);
      }
    }, 80) as unknown as number;
  }, [isMouseDown]);

  const handleVerticalScroll = useCallback((sourceRef: React.RefObject<HTMLDivElement>, targetRef: React.RefObject<HTMLDivElement>) => {
    if (!isGridRefDragging) {
      setIsGridRefDragging(true);
    }
    if (sourceRef.current && targetRef.current) {
      targetRef.current.scrollTop = sourceRef.current.scrollTop;
      if (isMouseDown) {
        resetDragTimeout();
      }
      updateVisibleRange();
    }
    if (sourceRef === gridRef && sourceRef.current) {
      dispatch(setScrollPosition({
        scrollLeft: sourceRef.current.scrollLeft,
        scrollTop: sourceRef.current.scrollTop
      }));
    }
  }, [dispatch, isGridRefDragging, isMouseDown, resetDragTimeout, updateVisibleRange]);

  const handleHorizontalScroll = useCallback((sourceRef: React.RefObject<HTMLDivElement>, targetRef: React.RefObject<HTMLDivElement>) => {
    if (!isGridRefDragging) {
      setIsGridRefDragging(true);
    }
    if (sourceRef.current && targetRef.current) {
      targetRef.current.scrollLeft = sourceRef.current.scrollLeft;
      if (isMouseDown) {
        resetDragTimeout();
      }
    }
    if (sourceRef === gridRef && sourceRef.current) {
      dispatch(setScrollPosition({
        scrollLeft: sourceRef.current.scrollLeft,
        scrollTop: sourceRef.current.scrollTop
      }));
    }
  }, [dispatch, isGridRefDragging, isMouseDown, resetDragTimeout]);

  useEffect(() => {
    const isChromiumBased = /Chrome/.test(navigator.userAgent) || /Chromium/.test(navigator.userAgent);
    if (!isChromiumBased) {
      alert(t('Browser Compatibility Alert'));
    }
  }, [t]);

  useEffect(() => {
    if (cellWidth !== prevCellWidthRef.current && gridRef.current) {
      const mouseX = prevIndicatorRef.current.x;
      const relativeMouseX = mouseX - gridRef.current.getBoundingClientRect().left + gridRef.current.scrollLeft;
      const scale = cellWidth / prevCellWidthRef.current;
      const newScrollLeft = (relativeMouseX * scale) - (mouseX - gridRef.current.getBoundingClientRect().left);
      gridRef.current.scrollLeft = newScrollLeft;
      prevCellWidthRef.current = cellWidth;
      if (!isGridRefDragging) {
        setIsGridRefDragging(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cellWidth]);

  useEffect(() => {
    const totalWidth = columns.reduce((sum, column) => {
      const columnWidth = column.width !== undefined ? column.width : 150;
      return column.visible ? sum + columnWidth : sum;
    }, 0);
    if (columns.length > 0) {
      const widthDifference = Math.abs(maxWbsWidth - wbsWidth);

      if (wbsWidth > totalWidth || widthDifference <= 20) {
        dispatch(setWbsWidth(totalWidth));
      }
    }
    dispatch(setMaxWbsWidth(totalWidth));
  }, [columns, dispatch, maxWbsWidth, wbsWidth]);

  useEffect(() => {
    const wbsElement = wbsRef.current;
    const calendarElement = calendarRef.current;
    const gridElement = gridRef.current;
    const wbsHandleVertical = () => {
      handleVerticalScroll(wbsRef, gridRef);
    };
    const gridHandleVertical = () => {
      handleVerticalScroll(gridRef, wbsRef);
    };
    const wbsHandleWheel = (event: WheelEvent) => {
      if (wbsRef.current) {
        if (event.shiftKey) {
          const newScrollLeft = wbsRef.current.scrollLeft + event.deltaY;
          wbsRef.current.scrollLeft = newScrollLeft;
          event.preventDefault();
        } else if (event.ctrlKey) {
          /* empty */
        } else {
          const newScrollTop = wbsRef.current.scrollTop + event.deltaY;
          const newScrollLeft = wbsRef.current.scrollLeft + event.deltaX;
          wbsRef.current.scrollTop = newScrollTop;
          wbsRef.current.scrollLeft = newScrollLeft;
          event.preventDefault();
        }
      }
    };
    const gridHandleWheel = (event: WheelEvent) => {
      if (gridRef.current) {
        if (event.shiftKey) {
          const newScrollLeft = gridRef.current.scrollLeft + event.deltaY;
          gridRef.current.scrollLeft = newScrollLeft;
          event.preventDefault();
        } else if (event.ctrlKey) {
          /* empty */
        } else {
          const newScrollTop = gridRef.current.scrollTop + event.deltaY;
          const newScrollLeft = gridRef.current.scrollLeft + event.deltaX;
          gridRef.current.scrollTop = newScrollTop;
          gridRef.current.scrollLeft = newScrollLeft;
          event.preventDefault();
        }
      }
    };
    if (wbsElement && gridElement) {
      wbsElement.addEventListener('wheel', wbsHandleWheel, { passive: false });
      gridElement.addEventListener('wheel', gridHandleWheel, { passive: false });
      wbsElement.addEventListener('scroll', wbsHandleVertical);
      gridElement.addEventListener('scroll', gridHandleVertical);
    }
    const gridHandleHorizontal = () => {
      handleHorizontalScroll(gridRef, calendarRef)
    };
    if (calendarElement && gridElement) {
      gridElement.addEventListener('scroll', gridHandleHorizontal);
    }
    return () => {
      if (wbsElement && gridElement) {
        wbsElement.removeEventListener('wheel', wbsHandleWheel);
        gridElement.removeEventListener('wheel', gridHandleWheel);
        wbsElement.removeEventListener('scroll', wbsHandleVertical);
        gridElement.removeEventListener('scroll', gridHandleVertical);
      }
      if (gridElement) {
        gridElement.removeEventListener('scroll', gridHandleHorizontal);
      }
    };
  }, [handleHorizontalScroll, handleVerticalScroll, isGridRefDragging]);

  useEffect(() => {
    return () => {
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const calculateGridHeight = () => {
      const rowCount = filteredData.length;
      const maxGridHeight = window.innerHeight - (rowHeight * 2) - topbarHeight;
      const dynamicGridHeight = rowCount * rowHeight;
      return dynamicGridHeight < maxGridHeight ? dynamicGridHeight : maxGridHeight;
    };
    const updateGridHeight = () => {
      setGridHeight(calculateGridHeight());
    };
    window.addEventListener('resize', updateGridHeight);
    updateGridHeight();
    return () => window.removeEventListener('resize', updateGridHeight);
  }, [filteredData, rowHeight]);

  useEffect(() => {
    updateVisibleRange();
  }, [gridHeight, updateVisibleRange]);

  useEffect(() => {
    if (gridRef.current && calendarRef.current && wbsRef.current) {
      const timer = setTimeout(() => {
        if (gridRef.current && calendarRef.current && wbsRef.current) {
          const safeScrollLeft = Math.max(0, Math.min(scrollPosition.scrollLeft || 0, gridRef.current.scrollWidth - gridRef.current.clientWidth));
          const safeScrollTop = Math.max(0, Math.min(scrollPosition.scrollTop || 0, gridRef.current.scrollHeight - gridRef.current.clientHeight));
          
          gridRef.current.scrollLeft = safeScrollLeft;
          gridRef.current.scrollTop = safeScrollTop;
          calendarRef.current.scrollLeft = safeScrollLeft;
          wbsRef.current.scrollTop = safeScrollTop;
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [scrollPosition]);

  useEffect(() => {
    const gridElement = gridRef.current;
    if (gridElement) {
      gridElement.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        gridElement.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [handleMouseDown, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && activeModal !== null) {
        event.preventDefault();
        dispatch(setActiveModal(null));
      } else if (!activeModal && !isViewingPast) {
        if ((event.ctrlKey || event.metaKey)) {
          switch (event.key) {
            case 'z':
              event.preventDefault();
              dispatch(undo());
              break;
            case 'y':
              event.preventDefault();
              dispatch(redo());
              break;
            default:
              break;
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [dispatch, activeModal, isViewingPast]);

  return (
    <div style={{ position: 'fixed' }}>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: '0px', left: '0px', width: '100svw', height: `${topbarHeight}px`, overflow: 'hidden', backgroundColor: '#ececec' }}>
          {isLocalMode ? <TopBarLocal /> : <TopBarLocal />}
        </div>
        <div style={{ position: 'absolute', top: `${topbarHeight}px`, left: `${wbsWidth}px`, width: `calc(100vw - ${wbsWidth}px)`, height: `calc(100vh - ${topbarHeight}px`, overflow: 'hidden', borderLeft: '1px solid #00000066', scrollBehavior: 'auto' }} ref={calendarRef}>
          <Calendar dateArray={dateArray} />
          <GridVertical dateArray={dateArray} gridHeight={gridHeight} />
        </div>
        <div style={{ position: 'absolute', top: `${topbarHeight + rowHeight}px`, width: `${wbsWidth + 5}px`, height: `calc(100vh - ${rowHeight + topbarHeight}px)`, overflowX: 'scroll', overflowY: 'hidden', scrollBehavior: 'auto' }} ref={wbsRef}>
          {filteredData.map(([key, entry], filteredIndex) => {
            if (gridRef.current && isSeparatorRow(entry) && filteredIndex >= visibleRange.startIndex && filteredIndex <= visibleRange.endIndex) {
              const topPosition = (filteredIndex * rowHeight) + rowHeight;
              return (
                <SeparatorRowLabelComponent
                  key={key}
                  entry={entry}
                  topPosition={topPosition}
                />
              );
            } else {
              return null;
            }
          })}
          <WBSInfo />
        </div>

        <ResizeBar setIsGridRefDragging={setIsGridRefDragging} />

        <div style={{ position: 'absolute', top: `${topbarHeight + (rowHeight * 2)}px`, left: `${wbsWidth}px`, width: `calc(100vw - ${wbsWidth}px)`, height: `calc(100vh - ${topbarHeight + rowHeight * 2}px)`, overflow: 'scroll', borderLeft: '1px solid transparent', scrollBehavior: 'auto' }} ref={gridRef}>
          <div style={{ height: `${(filteredData.length * rowHeight) - topbarHeight}px`, width: `${(dateArray.length * cellWidth)}px` }}>
            {filteredData.map(([key, entry], filteredIndex) => {
              if (gridRef.current) {
                if (filteredIndex >= visibleRange.startIndex && filteredIndex <= visibleRange.endIndex) {
                  const topPosition = filteredIndex * rowHeight;
                  if (isChartRow(entry)) {
                    return (
                      <ChartRowComponent
                        key={key}
                        entry={entry}
                        dateArray={dateArray}
                        gridRef={gridRef}
                        setCanGridRefDrag={setCanGridRefDrag}
                        topPosition={topPosition}
                      />
                    );
                  } else if (isSeparatorRow(entry)) {
                    return (
                      <SeparatorRowComponent
                        key={key}
                        entry={entry}
                        topPosition={topPosition}
                        dateArray={dateArray}
                      />
                    );
                  } else if (isEventRow(entry)) {
                    return (
                      <EventRowComponent
                        key={key}
                        entry={entry}
                        dateArray={dateArray}
                        gridRef={gridRef}
                        setCanGridRefDrag={setCanGridRefDrag}
                        topPosition={topPosition}
                      />
                    );
                  }
                }
                return null;
              }
            })}
          </div>
        </div>
      </div>

      {!activeModal && !isGridRefDragging && (
        <>
          {(indicatorPosition.y > 51 && window.innerHeight - indicatorPosition.y > 36) && (
            <div
              className="horizontal-indicator"
              style={{
                width: '100vw',
                height: '0.6px',
                backgroundColor: 'rgba(59, 42, 255, 0.609)',
                position: 'absolute',
                left: 0,
                top: `${indicatorPosition.y + rowHeight - 1}px`,
                pointerEvents: 'none',
                zIndex: '20'
              }}
            ></div>
          )}
          {!isContextMenuOpen && (indicatorPosition.x > wbsWidth) && (cellWidth > 5) && (
            <div
              className="vertical-indicator"
              style={{
                height: `${gridHeight + rowHeight}px`,
                width: `${cellWidth + 1}px`,
                backgroundColor: 'rgba(124, 124, 124, 0.09)',
                position: 'absolute',
                left: indicatorPosition.x + 'px',
                top: `${rowHeight + topbarHeight}px`,
                pointerEvents: 'none',
                zIndex: '20'
              }}
            ></div>
          )}
        </>
      )}
      <CustomRowCountDialogContainer />
      <ErrorMessage />
    </div>
  );
}

export default Gantt