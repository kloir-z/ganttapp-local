import { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, deleteRows, convertDisplayNameOnlyRowsToSeparator, toggleColumnVisibility, ExtendedColumn, createTaskChain, pushPastState, setSeparatorLevel } from '../reduxStoreAndSlices/store';
import { setCopiedRows } from '../reduxStoreAndSlices/copiedRowsSlice';
import { openRowDialog } from '../reduxStoreAndSlices/rowDialogSlice';
import { updateAlias } from '../reduxStoreAndSlices/colorSlice';
import useAddRow from './useAddRow';
import useInsertCopiedRow from './useInsertCopiedRow';
import { WBSData, ChartRow, EventRow, isSeparatorRow, SeparatorRow } from '../types/DataTypes';
import { MenuItemProps } from '../components/MenuItem';
import { createSelector } from '@reduxjs/toolkit';

const selectWbsDataArray = createSelector(
    [(state: RootState) => state.wbsData.data],
    (data) => Object.values(data)
);

interface UseContextMenuOptionsProps {
    entry?: WBSData;
    selectedRowIds?: string[];
    onDeleteBar?: () => void;
    contextMenu?: number | string | null;
    includeColumnSettings?: boolean;
    columns?: ExtendedColumn[];
    dataArray?: WBSData[];
}

export const useContextMenuOptions = ({
    entry,
    selectedRowIds,
    onDeleteBar,
    contextMenu,
    includeColumnSettings = false,
    columns = [],
    dataArray = []
}: UseContextMenuOptionsProps) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const addRow = useAddRow();
    const insertCopiedRow = useInsertCopiedRow();
    const copiedRows = useSelector((state: RootState) => state.copiedRows.rows);
    const storeDataArray = useSelector(selectWbsDataArray);
    const colorState = useSelector((state: RootState) => state.color);
    const finalDataArray = useMemo(() => {
        return dataArray.length > 0 ? dataArray : storeDataArray;
    }, [dataArray, storeDataArray]);

    const handleAutoColorSetting = useCallback(() => {
        const targetRowIds = selectedRowIds && selectedRowIds.length > 0
            ? selectedRowIds
            : finalDataArray.map(row => row.id);

        const uniqueColors = new Set<string>();
        finalDataArray.forEach(row => {
            if (targetRowIds.includes(row.id) && (row.rowType === 'Chart' || row.rowType === 'Event')) {
                const coloredRow = row as ChartRow | EventRow;
                const color = coloredRow.color;
                if (color && color.trim() !== "") {
                    uniqueColors.add(color.trim());
                }
            }
        });

        const colorArray = Array.from(uniqueColors);

        const shuffle = <T>(array: T[]): T[] => {
            const shuffled = [...array];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        };

        const existingColors = new Set<string>();
        for (let i = 1; i <= 7; i++) {
            const currentAlias = colorState.colors[i].alias;
            if (currentAlias && currentAlias.trim() !== "") {
                currentAlias.split(',').forEach(color => {
                    const trimmedColor = color.trim();
                    if (trimmedColor !== "") {
                        existingColors.add(trimmedColor);
                    }
                });
            }
        }

        const newColors = colorArray.filter(color => !existingColors.has(color));

        const localAliasState: { [id: number]: string } = {};
        for (let i = 1; i <= 7; i++) {
            localAliasState[i] = colorState.colors[i].alias || "";
        }

        for (let groupIndex = 0; groupIndex * 7 < newColors.length; groupIndex++) {
            const groupStart = groupIndex * 7;
            const groupEnd = Math.min(groupStart + 7, newColors.length);
            const groupColors = newColors.slice(groupStart, groupEnd);

            const shuffledSlots = shuffle([1, 2, 3, 4, 5, 6, 7]);

            groupColors.forEach((color, index) => {
                const targetSlotId = shuffledSlots[index];
                const currentAlias = localAliasState[targetSlotId];

                let newAlias;
                if (!currentAlias || currentAlias.trim() === "") {
                    newAlias = color;
                } else {
                    newAlias = `${currentAlias.trim()},${color}`;
                }
                localAliasState[targetSlotId] = newAlias;
            });
        }

        for (let i = 1; i <= 7; i++) {
            if (localAliasState[i] !== colorState.colors[i].alias) {
                dispatch(updateAlias({ id: i, alias: localAliasState[i] }));
            }
        }

    }, [selectedRowIds, finalDataArray, dispatch, colorState.colors]);

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

        if (onDeleteBar) {
            baseOptions.push({
                children: t("Delete Bar"),
                onClick: onDeleteBar,
                disabled: contextMenu === null,
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
            const initialColumnOrder = [
                'displayName', 'color', 'plannedStartDate', 'plannedEndDate',
                'plannedDays', 'actualStartDate', 'actualEndDate', 'progress', 'dependency',
                'textColumn1', 'textColumn2', 'textColumn3', 'isIncludeHolidays'
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
                }
            ],
            path: String(pathCounter++)
        });

        return baseOptions;
    }, [addRow, contextMenu, copiedRows, dispatch, entry, insertCopiedRow, onDeleteBar, selectedRowIds, t, includeColumnSettings, columns, finalDataArray, handleAutoColorSetting]);

    return menuOptions;
};