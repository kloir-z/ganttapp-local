// WBSInfo.tsx
import React, { useCallback, useMemo, memo, useRef, useEffect, useState } from 'react';
import { WBSData, isChartRow, isSeparatorRow, isEventRow, MyRange } from '../../types/DataTypes';
import { ReactGrid, Row, DefaultCellTypes, Id, HeaderCell, MenuOption, SelectionMode } from "@silevis/reactgrid";
import { createChartRow, createSeparatorRow, createEventRow } from './utils/wbsRowCreators';
import { handleGridChanges } from './utils/gridHandlers';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, setEntireData, handleColumnResize, setColumns, pushPastState, ExtendedColumn } from '../../reduxStoreAndSlices/store';
import { CustomDateCell, CustomDateCellTemplate } from './utils/CustomDateCell';
import { CustomTextCell, CustomTextCellTemplate } from './utils/CustomTextCell';
import { CustomNumberCell, CustomNumberCellTemplate } from './utils/CustomNumberCell';
import { SeparatorCell, SeparatorCellTemplate } from './utils/SeparatorCell';
import { assignIds, reorderArray } from './utils/wbsHelpers';
import ContextMenu from '../ContextMenu/ContextMenu';
import { setCopiedRows } from '../../reduxStoreAndSlices/copiedRowsSlice';
import useInsertCopiedRow from '../../hooks/useInsertCopiedRow';
import { useContextMenuOptions } from '../../hooks/useContextMenuOptions';
import DependencyHelp from './DependencyHelp';

const WBSInfo: React.FC = memo(() => {
  const activeModal = useSelector((state: RootState) => state.uiFlags.activeModal);
  const dispatch = useDispatch();
  const [allSelectedColumnsVisible, areAllSelectedColumnsVisible] = useState(false);
  const insertCopiedRow = useInsertCopiedRow();
  
  // Historical data for preview functionality
  const isViewingPast = useSelector((state: RootState) => state.history?.isViewingPast || false);
  const previewData = useSelector((state: RootState) => state.history?.previewData);
  
  // Always get current data
  const currentData = useSelector((state: RootState) => state.wbsData.data);
  const currentColumns = useSelector((state: RootState) => state.wbsData.columns);
  const currentShowYear = useSelector((state: RootState) => state.wbsData.showYear);
  const currentDateFormat = useSelector((state: RootState) => state.wbsData.dateFormat);
  const currentWbsWidth = useSelector((state: RootState) => state.baseSettings.wbsWidth);
  
  // Get data based on viewing mode
  const data = isViewingPast && previewData?.data ? previewData.data : currentData;
  const columns = isViewingPast && previewData?.columns ? previewData.columns : currentColumns;
  const showYear = isViewingPast && previewData?.showYear !== undefined ? previewData.showYear : currentShowYear;
  const dateFormat = isViewingPast && previewData?.dateFormat ? (previewData.dateFormat as any) : currentDateFormat;
  const wbsWidth = isViewingPast && previewData?.wbsWidth ? previewData.wbsWidth : currentWbsWidth;
  
  // Holiday data with preview support
  const currentHolidays = useSelector((state: RootState) => state.wbsData.holidays);
  const holidays = isViewingPast && previewData?.holidays ? previewData.holidays : currentHolidays;
  const rowHeight = useSelector((state: RootState) => state.baseSettings.rowHeight);
  const copiedRows = useSelector((state: RootState) => state.copiedRows.rows);
  const [selectedRanges, setSelectedRanges] = useState<{ selectedRowIds: string[], selectedColumnIds: string[] }>({
    selectedRowIds: [],
    selectedColumnIds: []
  });

  const isDependencyColumnSelected = useMemo(() => {
    return selectedRanges.selectedColumnIds.includes('dependency');
  }, [selectedRanges.selectedColumnIds]);

  const { visibleColumns, visibleColumnIds } = useMemo(() => {
    let filteredColumns = columns.filter(column => column.visible);
    if (filteredColumns.length < 2) {
      filteredColumns = columns.slice(0, 2).map(col => ({ ...col, visible: true }));
    }
    const columnIds = new Set(filteredColumns.map(column => column.columnId));
    return { visibleColumns: filteredColumns, visibleColumnIds: columnIds };
  }, [columns]);

  const headerRow = useMemo(() => {
    const getHeaderRow = (columns: ExtendedColumn[]): Row<DefaultCellTypes> => {
      const cells = columns.filter(column => column.visible).map(column => {
        return { type: "header", text: column.columnName ?? "" } as HeaderCell;
      });
      return {
        rowId: "header",
        height: rowHeight,
        cells: cells
      };
    };
    return getHeaderRow(columns);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, wbsWidth]);

  const regularDaysOff = useSelector((state: RootState) => state.wbsData.regularDaysOff);
  const selectedRangesRef = useRef<{ selectedRowIds: string[], selectedColumnIds: string[] }>();
  const wbsRef = useRef<HTMLDivElement>(null);

  const dataArray = useMemo(() => {
    return Object.values(data);
  }, [data]);

  const customDateCellTemplate = useMemo(() => new CustomDateCellTemplate(showYear, dateFormat), [showYear, dateFormat]);
  const customTextCellTemplate = useMemo(() => new CustomTextCellTemplate(), []);
  const customNumberCellTemplate = useMemo(() => new CustomNumberCellTemplate(), []);
  const separatorCellTemplate = useMemo(() => new SeparatorCellTemplate(), [])

  const getRows = useCallback((data: WBSData[]): Row<DefaultCellTypes | CustomDateCell | CustomTextCell | CustomDateCell | CustomNumberCell | SeparatorCell>[] => {
    const collapseStack: number[] = [];
    return [
      headerRow,
      ...data.flatMap((item) => {
        if (isSeparatorRow(item)) {
          while (collapseStack.length > 0 && collapseStack[collapseStack.length - 1] >= (item.level || 0)) {
            collapseStack.pop();
          }
          if (collapseStack.length > 0) {
            return [];
          }
          if (item.isCollapsed) {
            collapseStack.push(item.level || 0);
          }
          return createSeparatorRow(item, visibleColumns, rowHeight);
        } else if (isChartRow(item)) {
          if (collapseStack.length > 0) {
            return [];
          }
          return createChartRow(item, visibleColumns, rowHeight);
        } else if (isEventRow(item)) {
          if (collapseStack.length > 0) {
            return [];
          }
          return createEventRow(item, visibleColumns, rowHeight);
        } else {
          return [];
        }
      })
    ];
  }, [headerRow, visibleColumns, rowHeight]);

  const rows = useMemo(() => getRows(dataArray), [dataArray, getRows]);

  const handleRowsReorder = useCallback((targetRowId: Id, rowIds: Id[]) => {
    const targetIndex = dataArray.findIndex(data => data.id === targetRowId);
    const movingRowsIndexes = rowIds.map(id => dataArray.findIndex(data => data.id === id));
    const sortedMovingRowsIndexes = [...movingRowsIndexes].sort((a, b) => a - b);
    const reorderedData = reorderArray(dataArray, sortedMovingRowsIndexes, targetIndex);
    dispatch(setEntireData(assignIds(reorderedData)));
  }, [dataArray, dispatch]);

  const handleColumnsReorder = useCallback((targetColumnId: Id, columnIds: Id[]) => {
    if (columnIds.includes("no")) {
      return;
    }
    const targetIndex = columns.findIndex(data => data.columnId === targetColumnId);
    const noColumnIndex = columns.findIndex(data => data.columnId === "no");
    const adjustedTargetIndex = targetIndex <= noColumnIndex ? noColumnIndex + 1 : targetIndex;
    const movingColumnsIndexes = columnIds.map(id => columns.findIndex(data => data.columnId === id));
    const sortedMovingColumnsIndexes = [...movingColumnsIndexes].sort((a, b) => a - b);
    const tempColumns = columns.map(column => ({ ...column, id: column.columnId }));
    const reorderedTempColumns = reorderArray(tempColumns, sortedMovingColumnsIndexes, adjustedTargetIndex);
    const reorderedColumns = reorderedTempColumns.map(column => ({ ...column, columnId: column.id, id: undefined }));
    dispatch(pushPastState());
    dispatch(setColumns(reorderedColumns));
  }, [columns, dispatch]);

  const onColumnResize = useCallback((columnId: Id, width: number) => {
    const columnIdAsString = columnId.toString();
    dispatch(pushPastState());
    dispatch(handleColumnResize({ columnId: columnIdAsString, width }));
  }, [dispatch]);

  const handleCanReorderRows = useCallback((targetRowId: Id): boolean => {
    return targetRowId !== 'header';
  }, []);

  const handleContextMenu = useCallback((
    _selectedRowIds: Id[],
    _selectedColIds: Id[],
    _selectionMode: SelectionMode,
    menuOptions: MenuOption[]
  ): MenuOption[] => {
    const newMenuOptions = menuOptions.filter(option =>
      option.id !== "copy" && option.id !== "cut" && option.id !== "paste"
    );
    return newMenuOptions;
  }, []);

  const menuOptions = useContextMenuOptions({
    selectedRowIds: selectedRanges.selectedRowIds,
    includeColumnSettings: true,
    columns,
    dataArray
  });

  const handleSelectionChanged = useCallback((selectedRanges: MyRange[]) => {
    const selectedRowIds: Set<string> = new Set();
    const selectedColumnIds: Set<string> = new Set();
    selectedRanges.forEach((range) => {
      range.rows.forEach(row => {
        selectedRowIds.add(row.rowId.toString());
      });
      range.columns.forEach(column => {
        selectedColumnIds.add(column.columnId.toString());
      });
    });
    const newSelection = {
      selectedRowIds: Array.from(selectedRowIds),
      selectedColumnIds: Array.from(selectedColumnIds),
    };
    selectedRangesRef.current = newSelection;
    setSelectedRanges(newSelection);
    areAllSelectedColumnsVisible(Array.from(visibleColumnIds).every(id => selectedColumnIds.has(id)));
  }, [visibleColumnIds]);

  const [vKeyDownActive, setVKeyDownActive] = useState(false);
  const [cKeyDownActive, setCKeyDownActive] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'c' && allSelectedColumnsVisible && !cKeyDownActive && !activeModal) {
        event.preventDefault();
        const selectedRowIds = selectedRangesRef.current?.selectedRowIds || [];
        const copiedRows = selectedRowIds.reduce((acc, currId) => {
          const foundRow = dataArray.find(row => row.id === currId);
          if (foundRow) acc.push(foundRow);
          return acc;
        }, [] as WBSData[]);
        dispatch(setCopiedRows(copiedRows));
        setCKeyDownActive(true);
      } else if (event.ctrlKey && event.key === 'v' && allSelectedColumnsVisible && !vKeyDownActive && !activeModal) {
        event.preventDefault();
        insertCopiedRow(selectedRangesRef.current?.selectedRowIds[0] || "", copiedRows)
        setVKeyDownActive(true);
      } else if (event.ctrlKey && event.key === 'c' && allSelectedColumnsVisible && cKeyDownActive && !activeModal) {
        event.preventDefault();
      } else if (event.ctrlKey && event.key === 'v' && allSelectedColumnsVisible && vKeyDownActive && !activeModal) {
        event.preventDefault();
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'v') {
        setVKeyDownActive(false);
      } else if (event.key === 'c') {
        setCKeyDownActive(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeModal, allSelectedColumnsVisible, cKeyDownActive, copiedRows, dataArray, dispatch, insertCopiedRow, vKeyDownActive]);

  return (
    <div ref={wbsRef}>
      <ReactGrid
        rows={rows}
        columns={visibleColumns}
        onCellsChanged={isViewingPast ? undefined : (changes) => handleGridChanges(dispatch, data, changes, columns, holidays, regularDaysOff)}
        onColumnResized={isViewingPast ? undefined : onColumnResize}
        stickyTopRows={1}
        stickyLeftColumns={1}
        enableRangeSelection
        enableColumnSelection
        enableRowSelection
        onRowsReordered={isViewingPast ? undefined : handleRowsReorder}
        onColumnsReordered={isViewingPast ? undefined : handleColumnsReorder}
        onContextMenu={handleContextMenu}
        onSelectionChanged={handleSelectionChanged}
        canReorderRows={handleCanReorderRows}
        customCellTemplates={{ customDate: customDateCellTemplate, customText: customTextCellTemplate, customNumber: customNumberCellTemplate, separator: separatorCellTemplate }}
        minColumnWidth={10}
        minRowHeight={10}
      />
      <ContextMenu
        targetRef={wbsRef}
        items={menuOptions}
      />
      <DependencyHelp
        show={isDependencyColumnSelected}
        wbsWidth={wbsWidth}
      />
    </div>
  );
});

export default WBSInfo;