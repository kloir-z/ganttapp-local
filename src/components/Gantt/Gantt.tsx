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
import CpArrowsOverlay from '../Chart/CpArrowsOverlay';
import ResizeBar from '../WbsWidthResizer';
import WBSInfo from '../Table/WBSInfo';
import SeparatorRowLabelComponent from '../Table/SeparatorRowLabel';
import { generateDates } from '../../utils/CommonUtils';
import { cdate } from 'cdate';
import CircularProgress from '@mui/material/CircularProgress';
import { useTranslation } from 'react-i18next';
import ErrorMessage from '../MessageInfo';
import { setActiveModal } from '../../reduxStoreAndSlices/uiFlagSlice';
import CustomRowCountDialogContainer from '../ContextMenu/CustomRowCountDialogContainer';
import ChartDependencyBuilder from '../Chart/ChartDependencyBuilder';
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
  const isExporting = useSelector((state: RootState) => state.uiFlags.isExporting);
  const isDependencyEditing = useSelector((state: RootState) => state.uiFlags.isDependencyEditing);
  const scrollPosition = useSelector((state: RootState) => state.baseSettings.scrollPosition);
  const [isGridRefDragging, setIsGridRefDragging] = useState(false);
  // Drag-scroll bookkeeping is kept in refs (not state) so the window mousemove
  // listener always reads the current values synchronously. With state, the
  // mousedown -> re-render -> listener-reattach delay (worse while the dependency
  // builder is open and re-renders are heavy) made the first mousemoves read a
  // stale isMouseDown=false and silently drop the drag.
  const isMouseDownRef = useRef(false);
  const canGridRefDragRef = useRef(true);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const setCanGridRefDrag = useCallback((value: boolean) => { canGridRefDragRef.current = value; }, []);
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

  // When exporting, render every row (bypass virtualization) and size the panes to
  // the full chart so html2canvas can capture the whole thing in one shot.
  const effectiveRange = isExporting
    ? { startIndex: 0, endIndex: filteredData.length - 1 }
    : visibleRange;

  // For export, crop the date axis to one month after the last day that actually
  // has content (a bar/event end), so empty trailing columns don't become a huge
  // right margin while still leaving a month of look-ahead.
  const exportDateColumns = useMemo(() => {
    if (!isExporting) return dateArray.length;
    const toKey = (s: string) => {
      if (!s) return '';
      try { return cdate(s).format('YYYY/MM/DD'); } catch { return ''; }
    };
    let maxKey = '';
    Object.values(data).forEach((row) => {
      if (isChartRow(row) || isEventRow(row)) {
        [row.plannedEndDate, row.actualEndDate].forEach((d) => {
          const k = toKey(d);
          if (k > maxKey) maxKey = k;
        });
        if (isEventRow(row)) {
          row.eventData?.forEach((e) => {
            const k = toKey(e.endDate);
            if (k > maxKey) maxKey = k;
          });
        }
      }
    });
    if (!maxKey) return dateArray.length;
    // Crop to one month after the last content date.
    const cropKey = cdate(maxKey).add(1, 'month').format('YYYY/MM/DD');
    const cropIdx = dateArray.findIndex((d) => d.format('YYYY/MM/DD') === cropKey);
    if (cropIdx >= 0) return cropIdx + 1;
    // The one-month look-ahead extends beyond the saved range: show all of it.
    return dateArray.length;
  }, [isExporting, data, dateArray]);

  const exportDateWidth = exportDateColumns * cellWidth;
  // Bar labels (task names) can overflow to the right of their bar. The grid
  // pane renders with overflow:visible during export, but #gantt-export-root is
  // overflow:hidden, so without this margin a label on a right-edge bar gets
  // clipped. Add a little breathing room on the right when exporting.
  const EXPORT_RIGHT_MARGIN = 160;
  const fullContentWidth = wbsWidth + exportDateWidth + (isExporting ? EXPORT_RIGHT_MARGIN : 0);
  const fullContentHeight = topbarHeight + rowHeight * 2 + filteredData.length * rowHeight;

  const calculateAndSetIndicatorPosition = useCallback((event: MouseEvent) => {
    if (isContextMenuOpen) return;
    if (!gridRef.current) return;
    const gridStartX = (gridRef.current.scrollLeft - wbsWidth) % cellWidth;
    const adjustedX = Math.floor((event.clientX + gridStartX - 1) / cellWidth) * cellWidth - gridStartX + 1;
    let adjustedY = indicatorPosition.y;
    if (canGridRefDragRef.current) {
      const gridStartY = (gridRef.current.scrollTop % rowHeight) + topbarHeight + 7;
      adjustedY = Math.floor((event.clientY + gridStartY + 1) / rowHeight) * rowHeight - gridStartY;
    }
    if (prevIndicatorRef.current.x !== adjustedX || prevIndicatorRef.current.y !== adjustedY) {
      setIndicatorPosition({ x: adjustedX, y: adjustedY });
      prevIndicatorRef.current = { x: adjustedX, y: adjustedY };
    }
  }, [cellWidth, indicatorPosition.y, isContextMenuOpen, rowHeight, wbsWidth]);

  const handleMouseDown = useCallback((event: MouseEvent) => {
    if (event.button === 0) {
      isMouseDownRef.current = true;
      if (canGridRefDragRef.current && gridRef.current) {
        startXRef.current = event.clientX + gridRef.current.scrollLeft;
        startYRef.current = event.clientY + gridRef.current.scrollTop;
      }
    }
  }, []);

  const handleMouseUp = useCallback((event: MouseEvent) => {
    isMouseDownRef.current = false;
    // Safety net: re-enable drag-scroll on any mouse release. A bar-drag sets
    // canGridRefDrag=false and resets it on its own overlay's mouseup; but if that
    // mouseup lands on something stacked above the chart (e.g. the floating
    // dependency builder), the overlay misses it and drag-scroll stays disabled.
    canGridRefDragRef.current = true;
    calculateAndSetIndicatorPosition(event)
  }, [calculateAndSetIndicatorPosition]);

  const updateVisibleRange = useCallback(() => {
    if (!gridRef.current) return;
    const startIndex = Math.max(Math.floor(gridRef.current.scrollTop / rowHeight) - renderRowsInterval, 0);
    const endIndex = Math.min(totalRows - 1, startIndex + visibleRows + (renderRowsInterval * 2));
    const startChanged = Math.abs(startIndex - visibleRange.startIndex) >= renderRowsInterval || (startIndex === 0 && visibleRange.startIndex !== 0);
    // Also refresh when the viewport grows (browser zoom-out / window resize): scrollTop
    // — and therefore startIndex — can stay put while visibleRows increases, so endIndex
    // must follow. Without this the lower rows beyond a stale endIndex stop rendering
    // (their horizontal grid lines and bars vanish) even though the vertical grid, sized
    // from the updated gridHeight, keeps extending down.
    const endChanged = Math.abs(endIndex - visibleRange.endIndex) >= renderRowsInterval || (endIndex === totalRows - 1 && visibleRange.endIndex !== totalRows - 1);
    if (startChanged || endChanged) {
      setVisibleRange({ startIndex, endIndex });
    }
  }, [rowHeight, visibleRows, totalRows, visibleRange.startIndex, visibleRange.endIndex]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!gridRef.current) return;

    if (canGridRefDragRef.current && isMouseDownRef.current) {
      gridRef.current.scrollLeft = startXRef.current - event.clientX;
      gridRef.current.scrollTop = startYRef.current - event.clientY;
      calculateAndSetIndicatorPosition(event)
    } else if (!isGridRefDragging) {
      calculateAndSetIndicatorPosition(event)
    } else if (isGridRefDragging && !isMouseDownRef.current) {
      setIsGridRefDragging(false);
    }
  }, [isGridRefDragging, calculateAndSetIndicatorPosition]);

  const resetDragTimeout = useCallback(() => {
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
    }
    dragTimeoutRef.current = window.setTimeout(() => {
      if (dragTimeoutRef.current !== null) {
        clearTimeout(dragTimeoutRef.current);
      } else if (!isMouseDownRef.current) {
        setIsGridRefDragging(false);
      }
    }, 80) as unknown as number;
  }, []);

  const handleVerticalScroll = useCallback((sourceRef: React.RefObject<HTMLDivElement>, targetRef: React.RefObject<HTMLDivElement>) => {
    if (!isGridRefDragging) {
      setIsGridRefDragging(true);
    }
    if (sourceRef.current && targetRef.current) {
      targetRef.current.scrollTop = sourceRef.current.scrollTop;
      if (isMouseDownRef.current) {
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
  }, [dispatch, isGridRefDragging, resetDragTimeout, updateVisibleRange]);

  const handleHorizontalScroll = useCallback((sourceRef: React.RefObject<HTMLDivElement>, targetRef: React.RefObject<HTMLDivElement>) => {
    if (!isGridRefDragging) {
      setIsGridRefDragging(true);
    }
    if (sourceRef.current && targetRef.current) {
      targetRef.current.scrollLeft = sourceRef.current.scrollLeft;
      if (isMouseDownRef.current) {
        resetDragTimeout();
      }
    }
    if (sourceRef === gridRef && sourceRef.current) {
      dispatch(setScrollPosition({
        scrollLeft: sourceRef.current.scrollLeft,
        scrollTop: sourceRef.current.scrollTop
      }));
    }
  }, [dispatch, isGridRefDragging, resetDragTimeout]);

  useEffect(() => {
    const ua = navigator.userAgent;
    // Mobile is unsupported regardless of browser. On desktop, Chrome/Edge (both
    // carry "Chrome" in the UA), Chromium and Firefox are supported; anything else
    // (Safari, etc.) still gets the compatibility alert.
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
    const isSupportedDesktop = /Firefox\//.test(ua) || /Chrome\//.test(ua) || /Chromium\//.test(ua);
    if (isMobile || !isSupportedDesktop) {
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
          // When typing in a rich-text editor (e.g. a row-note popover), let the
          // editor handle Ctrl+Z/Y itself; don't also undo/redo the chart state.
          const target = event.target as HTMLElement | null;
          if (target && (target.isContentEditable || target.closest?.('.ql-editor'))) {
            return;
          }
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
      <div
        id="gantt-export-root"
        style={
          isExporting
            ? { position: 'relative', width: `${fullContentWidth}px`, height: `${fullContentHeight}px`, overflow: 'hidden', backgroundColor: '#ffffff' }
            : { position: 'relative' }
        }
      >
        <div style={{ position: 'absolute', top: '0px', left: '0px', width: '100svw', height: `${topbarHeight}px`, overflow: 'hidden', backgroundColor: '#ececec', visibility: isExporting ? 'hidden' : 'visible' }}>
          {isLocalMode ? <TopBarLocal /> : <TopBarLocal />}
        </div>
        <div id="gantt-calendar-pane" style={{ position: 'absolute', top: `${topbarHeight}px`, left: `${wbsWidth}px`, width: isExporting ? `${exportDateWidth}px` : `calc(100vw - ${wbsWidth}px)`, height: isExporting ? `${fullContentHeight - topbarHeight}px` : `calc(100vh - ${topbarHeight}px`, overflow: isExporting ? 'visible' : 'hidden', borderLeft: '1px solid #00000066', scrollBehavior: 'auto' }} ref={calendarRef}>
          <Calendar dateArray={dateArray} />
          <GridVertical dateArray={dateArray} gridHeight={isExporting ? fullContentHeight : gridHeight} />
        </div>
        <div id="gantt-wbs-pane" style={{ position: 'absolute', top: `${topbarHeight + rowHeight}px`, width: `${wbsWidth}px`, height: isExporting ? `${fullContentHeight - (rowHeight + topbarHeight)}px` : `calc(100vh - ${rowHeight + topbarHeight}px)`, overflowX: isExporting ? 'hidden' : 'scroll', overflowY: 'hidden', scrollBehavior: 'auto' }} ref={wbsRef}>
          {filteredData.map(([key, entry], filteredIndex) => {
            if (gridRef.current && isSeparatorRow(entry) && filteredIndex >= effectiveRange.startIndex && filteredIndex <= effectiveRange.endIndex) {
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

        <div style={{ position: 'absolute', top: `${topbarHeight + (rowHeight * 2)}px`, left: `${wbsWidth}px`, width: isExporting ? `${exportDateWidth}px` : `calc(100vw - ${wbsWidth}px)`, height: isExporting ? `${fullContentHeight - (topbarHeight + rowHeight * 2)}px` : `calc(100vh - ${topbarHeight + rowHeight * 2}px)`, overflow: isExporting ? 'visible' : 'scroll', borderLeft: '1px solid transparent', scrollBehavior: 'auto' }} ref={gridRef} id="gantt-grid-scroll">
          <div style={{ height: `${(filteredData.length * rowHeight) - topbarHeight}px`, width: `${(dateArray.length * cellWidth)}px` }}>
            {filteredData.map(([key, entry], filteredIndex) => {
              if (gridRef.current) {
                if (filteredIndex >= effectiveRange.startIndex && filteredIndex <= effectiveRange.endIndex) {
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
            <CpArrowsOverlay filteredData={filteredData} dateArray={dateArray} />
          </div>
        </div>
      </div>

      {!activeModal && !isGridRefDragging && !isDependencyEditing && (
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
      {/* Export progress overlay. Rendered OUTSIDE #gantt-export-root so it is not
          captured into the PDF, but covers the screen while the chart is rendered. */}
      {isExporting && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.78)',
            zIndex: 100000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
          }}
        >
          <CircularProgress />
          <div style={{ fontSize: '15px', color: '#333' }}>{t('Generating PDF...')}</div>
        </div>
      )}
      <ErrorMessage />
      <ChartDependencyBuilder />
    </div>
  );
}

export default Gantt