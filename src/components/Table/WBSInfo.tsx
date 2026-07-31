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
import { CustomDependencyCell, CustomDependencyCellTemplate } from './utils/CustomDependencyCell';
import { assignIds, reorderArray } from './utils/wbsHelpers';
import ContextMenu from '../ContextMenu/ContextMenu';
import RenameColumnDialog from '../ContextMenu/RenameColumnDialog';
import { setCopiedRows } from '../../reduxStoreAndSlices/copiedRowsSlice';
import useInsertCopiedRow from '../../hooks/useInsertCopiedRow';
import { useContextMenuOptions } from '../../hooks/useContextMenuOptions';
import { useImeCellOverlay } from '../../hooks/useImeCellOverlay';
import { PasteRange, useRangePasteFill } from '../../hooks/useRangePasteFill';
import { useRangeClipboardCopy } from '../../hooks/useRangeClipboardCopy';
import { ClipboardCell, cellToClipboardText } from './utils/clipboardCopy';
import { buildWbsNumberMap } from '../../utils/wbsNumber';
import { buildCpDisplayTextMap } from '../../utils/CriticalPath';
import CpHelp from './CpHelp';

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

  const isCpColumnSelected = useMemo(() => {
    return selectedRanges.selectedColumnIds.includes('cpPredecessors');
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
  // 貼り付け時に「選択範囲を繰り返しで埋める」ため、アクティブな選択範囲を保持する
  const pasteRangeRef = useRef<PasteRange | null>(null);
  // コピー/切り取りでクリップボードへ書き出す範囲(表示順の行ID・列ID)
  const copyRangeRef = useRef<{ rowIds: string[]; columnIds: string[] } | null>(null);
  // 直前の貼り付けが埋めた行ID。onCellsChanged で使い切る(値が変わらなかった行も
  // 依存計算から守るために handleGridChanges へ渡す)。
  const pastedRowsRef = useRef<{ rowIds: string[]; at: number } | null>(null);
  const wbsRef = useRef<HTMLDivElement>(null);

  // ヘッダー行の右クリック検出(列名変更メニュー用)。ReactGrid のセルは
  // data-cell-rowidx / data-cell-colidx を持ち、rowidx 0 がヘッダー行、
  // colidx は visibleColumns 内のインデックスに一致する。
  const [headerContextColumn, setHeaderContextColumn] = useState<ExtendedColumn | null>(null);
  const [renameColumnTarget, setRenameColumnTarget] = useState<ExtendedColumn | null>(null);

  useEffect(() => {
    const element = wbsRef.current;
    if (!element) return;
    const handleHeaderContextMenu = (event: MouseEvent) => {
      const headerCell = (event.target as HTMLElement).closest?.('[data-cell-rowidx="0"][data-cell-colidx]');
      if (headerCell) {
        const colIdx = Number(headerCell.getAttribute('data-cell-colidx'));
        setHeaderContextColumn(visibleColumns[colIdx] ?? null);
      } else {
        setHeaderContextColumn(null);
      }
    };
    element.addEventListener('contextmenu', handleHeaderContextMenu);
    return () => element.removeEventListener('contextmenu', handleHeaderContextMenu);
  }, [visibleColumns]);

  const dataArray = useMemo(() => {
    return Object.values(data);
  }, [data]);

  // Mechanical WBS numbers for the optional read-only "WBS" column. Only computed
  // when that column is actually shown so hidden state stays free of overhead.
  const wbsNumberVisible = useMemo(() => visibleColumns.some(c => c.columnId === 'wbsNumber'), [visibleColumns]);
  const wbsNumberMap = useMemo(() => (wbsNumberVisible ? buildWbsNumberMap(data) : {}), [wbsNumberVisible, data]);

  // クリティカルパス先行列("CP")の表示テキスト(行ID → 現在の行番号表記)。
  // 列が表示されているときだけ計算する(wbsNumberMap と同じ方針)。
  const cpColumnVisible = useMemo(() => visibleColumns.some(c => c.columnId === 'cpPredecessors'), [visibleColumns]);
  const cpDisplayTextMap = useMemo(() => (cpColumnVisible ? buildCpDisplayTextMap(data) : {}), [cpColumnVisible, data]);

  const customDateCellTemplate = useMemo(() => new CustomDateCellTemplate(showYear, dateFormat), [showYear, dateFormat]);
  const customTextCellTemplate = useMemo(() => new CustomTextCellTemplate(), []);
  const customNumberCellTemplate = useMemo(() => new CustomNumberCellTemplate(), []);
  const separatorCellTemplate = useMemo(() => new SeparatorCellTemplate(), [])
  const customDependencyCellTemplate = useMemo(() => new CustomDependencyCellTemplate(), []);

  const getRows = useCallback((data: WBSData[]): Row<DefaultCellTypes | CustomDateCell | CustomTextCell | CustomDateCell | CustomNumberCell | SeparatorCell | CustomDependencyCell>[] => {
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
          return createSeparatorRow(item, visibleColumns, rowHeight, wbsNumberMap[item.id]);
        } else if (isChartRow(item)) {
          if (collapseStack.length > 0) {
            return [];
          }
          return createChartRow(item, visibleColumns, rowHeight, wbsNumberMap[item.id], cpDisplayTextMap[item.id] ?? '');
        } else if (isEventRow(item)) {
          if (collapseStack.length > 0) {
            return [];
          }
          return createEventRow(item, visibleColumns, rowHeight, wbsNumberMap[item.id]);
        } else {
          return [];
        }
      })
    ];
  }, [headerRow, visibleColumns, rowHeight, wbsNumberMap, cpDisplayTextMap]);

  const rows = useMemo(() => getRows(dataArray), [dataArray, getRows]);

  const handleRowsReorder = useCallback((targetRowId: Id, rowIds: Id[]) => {
    const targetIndex = dataArray.findIndex(data => data.id === targetRowId);
    const movingRowsIndexes = rowIds.map(id => dataArray.findIndex(data => data.id === id));
    const sortedMovingRowsIndexes = [...movingRowsIndexes].sort((a, b) => a - b);
    const reorderedData = reorderArray(dataArray, sortedMovingRowsIndexes, targetIndex);
    dispatch(setEntireData(assignIds(reorderedData)));
  }, [dataArray, dispatch]);

  const handleColumnsReorder = useCallback((targetColumnId: Id, columnIds: Id[]) => {
    // "no" and the optional "wbsNumber" column are pinned to the front.
    if (columnIds.includes("no") || columnIds.includes("wbsNumber")) {
      return;
    }
    const targetIndex = columns.findIndex(data => data.columnId === targetColumnId);
    const noColumnIndex = columns.findIndex(data => data.columnId === "no");
    const wbsColumnIndex = columns.findIndex(data => data.columnId === "wbsNumber");
    const lastPinnedIndex = Math.max(noColumnIndex, wbsColumnIndex);
    const adjustedTargetIndex = targetIndex <= lastPinnedIndex ? lastPinnedIndex + 1 : targetIndex;
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
    selectedColumnIds: selectedRanges.selectedColumnIds,
    includeColumnSettings: true,
    columns,
    dataArray,
    headerColumn: isViewingPast ? null : headerContextColumn,
    onRenameColumn: setRenameColumnTarget
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
    // 貼り付け先はアクティブな範囲(複数範囲選択のときは最後に作られたもの)
    const activeRange = selectedRanges[selectedRanges.length - 1];
    pasteRangeRef.current = activeRange
      ? { rowIds: activeRange.rows.map(row => row.rowId.toString()), columnCount: activeRange.columns.length }
      : null;
    copyRangeRef.current = activeRange
      ? {
        rowIds: activeRange.rows.map(row => row.rowId.toString()),
        columnIds: activeRange.columns.map(column => column.columnId.toString()),
      }
      : null;
    setSelectedRanges(newSelection);
    areAllSelectedColumnsVisible(Array.from(visibleColumnIds).every(id => selectedColumnIds.has(id)));
  }, [visibleColumnIds]);

  // Excelライクな範囲貼り付け: コピー元より広い範囲を選択して貼り付けたときは、
  // 選択範囲を埋めるまでコピー元の内容を繰り返す(ReactGrid 自身はコピー元のサイズぶんしか貼らない)
  const getPasteRange = useCallback(() => pasteRangeRef.current, []);
  const handlePasteRange = useCallback((range: PasteRange) => {
    pastedRowsRef.current = { rowIds: range.rowIds, at: Date.now() };
  }, []);
  useRangePasteFill(wbsRef, getPasteRange, handlePasteRange, !isViewingPast);

  // コピー/切り取り: ReactGrid のプレーンテキストは区切り文字が入らず、メモ帳などに貼ると
  // 1行につながってしまうため、タブ区切りのテキストを自前でクリップボードへ載せる。
  // 内容はイベント発生時点の最新の行・列から組み立てる(コールバックは作り直さない)。
  const copySourceRef = useRef({ rows, visibleColumns, showYear, dateFormat });
  copySourceRef.current = { rows, visibleColumns, showYear, dateFormat };
  const getCopyCells = useCallback((): ClipboardCell[][] | null => {
    const range = copyRangeRef.current;
    if (!range || range.rowIds.length === 0 || range.columnIds.length === 0) return null;
    const { rows, visibleColumns, showYear, dateFormat } = copySourceRef.current;
    const rowById = new Map(rows.map(row => [row.rowId.toString(), row]));
    const columnIndexById = new Map(visibleColumns.map((column, index) => [column.columnId.toString(), index]));
    return range.rowIds.map(rowId => {
      const row = rowById.get(rowId);
      return range.columnIds.map(columnId => {
        const columnIndex = columnIndexById.get(columnId);
        const cell = row && columnIndex !== undefined ? row.cells[columnIndex] : undefined;
        return {
          cell: cell ?? { type: 'text', text: '' },
          text: cell ? cellToClipboardText(cell, { showYear, dateFormat }) : '',
        };
      });
    });
  }, []);
  useRangeClipboardCopy(wbsRef, getCopyCells);

  // 貼り付け直後の onCellsChanged でだけ使う(取り出したら破棄。古い記録は使わない)
  const consumePastedRowIds = useCallback(() => {
    const pasted = pastedRowsRef.current;
    pastedRowsRef.current = null;
    return pasted && Date.now() - pasted.at < 1000 ? pasted.rowIds : undefined;
  }, []);

  // IME(日本語)変換中の文字と候補ウィンドウを、画面中央の隠し要素ではなく
  // フォーカス中のセル上に表示する(Excelライクな直接入力)。
  useImeCellOverlay(wbsRef);

  const [vKeyDownActive, setVKeyDownActive] = useState(false);
  const [cKeyDownActive, setCKeyDownActive] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 列名変更ダイアログ表示中は行コピー/挿入のショートカットを無効化する
      // (ダイアログは activeModal を使わないローカル表示のため個別にガード)
      if (renameColumnTarget) {
        return;
      }
      if (event.ctrlKey && event.key === 'c' && allSelectedColumnsVisible && !cKeyDownActive && !activeModal) {
        // 既定のコピーは止めない。行コピー(アプリ内の行貼り付け用)と同時に、
        // 選択範囲のタブ区切りテキストを useRangeClipboardCopy がクリップボードへ載せる。
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
  }, [activeModal, allSelectedColumnsVisible, cKeyDownActive, copiedRows, dataArray, dispatch, insertCopiedRow, vKeyDownActive, renameColumnTarget]);

  return (
    <div ref={wbsRef}>
      <ReactGrid
        rows={rows}
        columns={visibleColumns}
        onCellsChanged={isViewingPast ? undefined : (changes) => handleGridChanges(dispatch, data, changes, columns, holidays, regularDaysOff, consumePastedRowIds(), dateFormat)}
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
        customCellTemplates={{ customDate: customDateCellTemplate, customText: customTextCellTemplate, customNumber: customNumberCellTemplate, separator: separatorCellTemplate, customDependency: customDependencyCellTemplate }}
        minColumnWidth={10}
        minRowHeight={10}
      />
      <ContextMenu
        targetRef={wbsRef}
        items={menuOptions}
      />
      <RenameColumnDialog
        column={renameColumnTarget}
        onClose={() => setRenameColumnTarget(null)}
      />
      <CpHelp
        show={isCpColumnSelected}
        wbsWidth={wbsWidth}
      />
    </div>
  );
});

export default WBSInfo;