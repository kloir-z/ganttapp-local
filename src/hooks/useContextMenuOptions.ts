import { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, deleteRows, convertDisplayNameOnlyRowsToSeparator, toggleColumnVisibility, hideColumns, ExtendedColumn, createTaskChain, createCpChain, addCpPredecessors, clearCpPredecessors, pushPastState, setSeparatorLevel, setMessageInfo } from '../reduxStoreAndSlices/store';
import { setShowCriticalPath } from '../reduxStoreAndSlices/uiFlagSlice';
import { setCopiedRows } from '../reduxStoreAndSlices/copiedRowsSlice';
import { openRowDialog } from '../reduxStoreAndSlices/rowDialogSlice';
import useAddRow from './useAddRow';
import useInsertCopiedRow from './useInsertCopiedRow';
import { useColorBasis } from './useColorBasis';
import { WBSData, isSeparatorRow, SeparatorRow } from '../types/DataTypes';
import { MenuItemProps } from '../components/MenuItem';
import { createSelector } from '@reduxjs/toolkit';

const selectWbsDataArray = createSelector(
    [(state: RootState) => state.wbsData.data],
    (data) => Object.values(data)
);

interface UseContextMenuOptionsProps {
    entry?: WBSData;
    selectedRowIds?: string[];
    selectedColumnIds?: string[];
    onDeleteBar?: () => void;
    onEditDependency?: () => void;
    contextMenu?: number | string | null;
    includeColumnSettings?: boolean;
    columns?: ExtendedColumn[];
    dataArray?: WBSData[];
    // テーブルヘッダー上で右クリックされたときだけ渡される(列名変更メニュー用)
    headerColumn?: ExtendedColumn | null;
    onRenameColumn?: (column: ExtendedColumn) => void;
}

export const useContextMenuOptions = ({
    entry,
    selectedRowIds,
    selectedColumnIds = [],
    onDeleteBar,
    onEditDependency,
    contextMenu,
    includeColumnSettings = false,
    columns = [],
    dataArray = [],
    headerColumn = null,
    onRenameColumn
}: UseContextMenuOptionsProps) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const addRow = useAddRow();
    const insertCopiedRow = useInsertCopiedRow();
    const copiedRows = useSelector((state: RootState) => state.copiedRows.rows);
    const showCriticalPath = useSelector((state: RootState) => state.uiFlags.showCriticalPath);
    const storeDataArray = useSelector(selectWbsDataArray);
    const { basisColumnId, candidates, switchTo, autoAssign } = useColorBasis();
    const finalDataArray = useMemo(() => {
        return dataArray.length > 0 ? dataArray : storeDataArray;
    }, [dataArray, storeDataArray]);

    // アクティブな色分け基準列のユニーク値へ自動で色を割り当てる。
    // 行選択があればその範囲だけを対象にする。
    const handleAutoColorSetting = useCallback(() => {
        autoAssign(selectedRowIds);
    }, [autoAssign, selectedRowIds]);

    const menuOptions = useMemo(() => {
        const createAddRowItems = (type: 'Chart' | 'Event') => {
            const items = [];
            items.push({
                children: t('Custom'),
                onClick: () => {
                    const insertAtId = entry?.id || selectedRowIds?.[0] || "";
                    const currentRowCount = finalDataArray.length;
                    const maxRowsToAdd = Math.max(1, 500 - currentRowCount);
                    dispatch(openRowDialog({
                        rowType: type,
                        insertAtId,
                        maxRows: maxRowsToAdd
                    }));
                },
            });
            for (let i = 1; i <= 5; i++) {
                items.push({
                    children: `${i}`,
                    onClick: () => {
                        const insertAtId = entry?.id || selectedRowIds?.[0] || "";
                        addRow(type, insertAtId, i);
                    },
                });
            }
            return items;
        };

        const insertCopiedRowDisabled = copiedRows.length === 0 ||
            (selectedRowIds && selectedRowIds.length === 0);

        const baseOptions = [];
        let pathCounter = 0;

        // ヘッダー右クリック時は列名変更を先頭に出す(設定モーダルを開かずに変更できる)
        if (headerColumn && onRenameColumn) {
            const targetColumn = headerColumn;
            baseOptions.push({
                children: `${t("Rename Column")} (${targetColumn.columnName})`,
                onClick: () => onRenameColumn(targetColumn),
                path: String(pathCounter++)
            });
        }

        if (onDeleteBar) {
            baseOptions.push({
                children: t("Delete Bar"),
                onClick: onDeleteBar,
                disabled: contextMenu === null,
                path: String(pathCounter++)
            });
        }

        if (onEditDependency) {
            baseOptions.push({
                children: t("Edit dependency"),
                onClick: onEditDependency,
                path: String(pathCounter++)
            });
        }

        const shouldShowLevelMenu = () => {
            if (entry && isSeparatorRow(entry)) {
                return true;
            }
            if (selectedRowIds && selectedRowIds.length > 0) {
                return selectedRowIds.some(id => {
                    const row = finalDataArray.find(row => row.id === id);
                    return row && isSeparatorRow(row);
                });
            }
            return false;
        };

        const createLevelMenuItems = () => {
            const items = [];
            const levelMenuCounter = pathCounter;

            const getTargetSeparatorRows = () => {
                if (entry && isSeparatorRow(entry)) {
                    return [entry];
                } else if (selectedRowIds) {
                    return selectedRowIds
                        .map(id => finalDataArray.find(row => row.id === id))
                        .filter((row): row is SeparatorRow => row !== undefined && isSeparatorRow(row));
                }
                return [];
            };

            const executeLevelChange = (targetLevel: number) => {
                const targetRows = getTargetSeparatorRows();
                const changesNeeded = targetRows.filter(row =>
                    (row.level || 0) !== targetLevel
                );
                if (changesNeeded.length > 0) {
                    dispatch(pushPastState());
                    changesNeeded.forEach(row => {
                        dispatch(setSeparatorLevel({ id: row.id, level: targetLevel }));
                    });
                }
            };

            const targetRows = getTargetSeparatorRows();
            const selectedLevels = new Set(targetRows.map(row => row.level || 0));

            for (let level = 0; level <= 4; level++) {
                items.push({
                    children: `${level + 1}`,
                    onClick: () => executeLevelChange(level),
                    path: `${levelMenuCounter}.${level}`,
                    checked: selectedLevels.has(level),
                });
            }

            items.push(
                {
                    children: '+1',
                    onClick: () => {
                        const targetRows = getTargetSeparatorRows();
                        const changesNeeded = targetRows.filter(row => {
                            const newLevel = Math.min(4, (row.level || 0) + 1);
                            return (row.level || 0) !== newLevel;
                        });
                        if (changesNeeded.length > 0) {
                            dispatch(pushPastState());
                            changesNeeded.forEach(row => {
                                const newLevel = Math.min(4, (row.level || 0) + 1);
                                dispatch(setSeparatorLevel({ id: row.id, level: newLevel }));
                            });
                        }
                    },
                    path: `${levelMenuCounter}.5`,
                    checked: false,
                },
                {
                    children: '-1',
                    onClick: () => {
                        const targetRows = getTargetSeparatorRows();
                        const changesNeeded = targetRows.filter(row => {
                            const newLevel = Math.max(0, (row.level || 0) - 1);
                            return (row.level || 0) !== newLevel;
                        });
                        if (changesNeeded.length > 0) {
                            dispatch(pushPastState());
                            changesNeeded.forEach(row => {
                                const newLevel = Math.max(0, (row.level || 0) - 1);
                                dispatch(setSeparatorLevel({ id: row.id, level: newLevel }));
                            });
                        }
                    },
                    path: `${levelMenuCounter}.6`,
                    checked: false,
                }
            );
            return items;
        };
        if (shouldShowLevelMenu()) {
            baseOptions.push({
                children: t("Set Level"),
                items: createLevelMenuItems(),
                path: String(pathCounter++)
            });
        }

        baseOptions.push(
            {
                children: t("Copy Row"),
                onClick: () => {
                    if (entry) {
                        dispatch(setCopiedRows([entry]));
                    } else if (selectedRowIds) {
                        const copiedRows = selectedRowIds.reduce((acc, currId) => {
                            const foundRow = finalDataArray.find(row => row.id === currId);
                            if (foundRow) acc.push(foundRow);
                            return acc;
                        }, [] as WBSData[]);
                        dispatch(setCopiedRows(copiedRows));
                    }
                },
                path: String(pathCounter++)
            },
            {
                children: t("Cut Row"),
                onClick: () => {
                    if (entry) {
                        dispatch(deleteRows([entry.id]));
                        dispatch(setCopiedRows([entry]));
                    } else if (selectedRowIds) {
                        const copiedRows = selectedRowIds.reduce((acc, currId) => {
                            const foundRow = finalDataArray.find(row => row.id === currId);
                            if (foundRow) acc.push(foundRow);
                            return acc;
                        }, [] as WBSData[]);
                        dispatch(setCopiedRows(copiedRows));
                        dispatch(deleteRows(selectedRowIds));
                    }
                },
                path: String(pathCounter++)
            },
            {
                children: t("Insert Copied Row"),
                onClick: () => {
                    const insertAtId = entry?.id || selectedRowIds?.[0] || "";
                    insertCopiedRow(insertAtId, copiedRows);
                },
                disabled: insertCopiedRowDisabled,
                path: String(pathCounter++)
            },
            {
                children: t("Add Row"),
                items: [
                    {
                        children: t("Separator"),
                        onClick: () => {
                            const insertAtId = entry?.id || selectedRowIds?.[0] || "";
                            const numberOfRows = selectedRowIds?.length || 1;
                            addRow("Separator", insertAtId, numberOfRows);
                        },
                        path: `${pathCounter}.0`
                    },
                    {
                        children: t("Chart"),
                        onClick: () => {
                            const insertAtId = entry?.id || selectedRowIds?.[0] || "";
                            const numberOfRows = selectedRowIds?.length || 1;
                            addRow("Chart", insertAtId, numberOfRows);
                        },
                        items: createAddRowItems('Chart'),
                        path: `${pathCounter}.1`
                    },
                    {
                        children: t("Event"),
                        onClick: () => {
                            const insertAtId = entry?.id || selectedRowIds?.[0] || "";
                            const numberOfRows = selectedRowIds?.length || 1;
                            addRow("Event", insertAtId, numberOfRows);
                        },
                        items: createAddRowItems('Event'),
                        path: `${pathCounter}.2`
                    }
                ],
                path: String(pathCounter++)
            }
        );

        if (includeColumnSettings && columns.length > 0) {
            // Excel-style quick hide of the currently selected column(s).
            const hideableColumnIds = columns
                .filter(col => col.visible && col.columnId !== 'no' && selectedColumnIds.includes(col.columnId))
                .map(col => col.columnId);
            if (hideableColumnIds.length > 0) {
                const visibleNonNoCount = columns.filter(col => col.visible && col.columnId !== 'no').length;
                baseOptions.push({
                    children: hideableColumnIds.length > 1
                        ? `${t("Hide Columns")} (${hideableColumnIds.length})`
                        : t("Hide Column"),
                    onClick: () => {
                        if (hideableColumnIds.length >= visibleNonNoCount) {
                            dispatch(setMessageInfo({
                                message: t("At least one column must remain visible."),
                                severity: 'warning'
                            }));
                            return;
                        }
                        dispatch(hideColumns(hideableColumnIds));
                    },
                    path: String(pathCounter++)
                });
            }

            const initialColumnOrder = [
                'no', 'wbsNumber', 'displayName', 'color', 'plannedStartDate', 'plannedEndDate',
                'plannedDays', 'actualStartDate', 'actualEndDate', 'progress', 'dependency',
                'cpPredecessors', 'textColumn1', 'textColumn2', 'textColumn3', 'textColumn4',
                'textColumn5', 'textColumn6', 'textColumn7', 'isIncludeHolidays'
            ];

            const columnSettingsItems: MenuItemProps[] = initialColumnOrder.reduce((acc: MenuItemProps[], columnId) => {
                const column = columns.find(col => col.columnId === columnId);
                if (column) {
                    acc.push({
                        children: `${column.columnName}`,
                        onClick: () => dispatch(toggleColumnVisibility(column.columnId)),
                        checked: column.visible,
                    });
                }
                return acc;
            }, []);

            baseOptions.push({
                children: t("Show/Hide Column"),
                items: columnSettingsItems,
                path: String(pathCounter++)
            });
        }

        // クリティカルパス表示のトグル。テーブル・チャートどちらの右クリックからも
        // 切り替えられるようにトップレベルに置く(設定メニューのトグルと同じ状態)。
        baseOptions.push({
            children: t("Show Critical Path"),
            onClick: () => dispatch(setShowCriticalPath(!showCriticalPath)),
            checked: showCriticalPath,
            path: String(pathCounter++)
        });

        // 色分け基準列の切り替え。テーブル・チャートどちらの右クリックからも
        // 変更できる(トップバーのクイック切替・チャート設定と同じ状態)。
        baseOptions.push({
            children: t("Color Basis"),
            items: candidates.map((candidate, index) => ({
                children: candidate.label,
                onClick: () => switchTo(candidate.columnId),
                checked: candidate.columnId === basisColumnId,
                path: `${pathCounter}.${index}`,
            })),
            path: String(pathCounter++)
        });

        baseOptions.push({
            children: t("Functions"),
            items: [
                {
                    children: selectedRowIds && selectedRowIds.length > 1
                        ? t("Convert selected DisplayName only rows to separators")
                        : t("Convert DisplayName only rows to separators"),
                    onClick: () => {
                        const targetIds = selectedRowIds && selectedRowIds.length > 1 ? selectedRowIds : undefined;
                        dispatch(convertDisplayNameOnlyRowsToSeparator(targetIds));
                    },
                    path: `${pathCounter}.1`
                },
                {
                    children: t("Create task chain"),
                    onClick: () => {
                        if (selectedRowIds && selectedRowIds.length >= 2) {
                            dispatch(pushPastState());
                            dispatch(createTaskChain(selectedRowIds));
                        }
                    },
                    disabled: !selectedRowIds || selectedRowIds.length < 2,
                    path: `${pathCounter}.2`
                },
                {
                    children: selectedRowIds && selectedRowIds.length > 0
                        ? t("Auto color setting for selected rows")
                        : t("Auto color setting for all rows"),
                    onClick: handleAutoColorSetting,
                    disabled: finalDataArray.filter(row =>
                        (selectedRowIds && selectedRowIds.length > 0 ? selectedRowIds.includes(row.id) : true) &&
                        (row.rowType === 'Chart' || row.rowType === 'Event')
                    ).length === 0,
                    path: `${pathCounter}.3`
                },
                {
                    // 選択行を表示順に cpPredecessors で接続する(タスクチェーン作成のCP版)。
                    // 完了後は結果がすぐ見えるようクリティカルパス表示も ON にする。
                    children: t("Create critical path chain"),
                    onClick: () => {
                        if (selectedRowIds && selectedRowIds.length >= 2) {
                            dispatch(pushPastState());
                            dispatch(createCpChain(selectedRowIds));
                            dispatch(setShowCriticalPath(true));
                        }
                    },
                    disabled: !selectedRowIds || selectedRowIds.length < 2,
                    path: `${pathCounter}.4`
                },
                {
                    // 選択行のうち最後の行を後続、それ以外を先行として追記する(合流を作る)。
                    // createCpChain と違い既存の CP 先行を上書きしない。
                    children: t("Add critical path predecessors"),
                    onClick: () => {
                        if (selectedRowIds && selectedRowIds.length >= 2) {
                            dispatch(pushPastState());
                            dispatch(addCpPredecessors(selectedRowIds));
                            dispatch(setShowCriticalPath(true));
                        }
                    },
                    disabled: !selectedRowIds || selectedRowIds.length < 2,
                    path: `${pathCounter}.5`
                },
                {
                    children: (selectedRowIds && selectedRowIds.length > 0) || entry
                        ? t("Clear critical path links for selected rows")
                        : t("Clear critical path links for all rows"),
                    onClick: () => {
                        const targetIds = selectedRowIds && selectedRowIds.length > 0
                            ? selectedRowIds
                            : entry ? [entry.id] : undefined;
                        dispatch(pushPastState());
                        dispatch(clearCpPredecessors(targetIds));
                    },
                    path: `${pathCounter}.6`
                }
            ],
            path: String(pathCounter++)
        });

        return baseOptions;
    }, [addRow, contextMenu, copiedRows, dispatch, entry, insertCopiedRow, onDeleteBar, onEditDependency, selectedRowIds, selectedColumnIds, t, includeColumnSettings, columns, finalDataArray, handleAutoColorSetting, showCriticalPath, basisColumnId, candidates, switchTo, headerColumn, onRenameColumn]);

    return menuOptions;
};