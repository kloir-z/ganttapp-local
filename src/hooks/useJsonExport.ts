import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, setMessageInfo } from '../reduxStoreAndSlices/store';
import { handleExport } from '../utils/ExportImportHandler';
import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from 'react-i18next';

export const useJsonExport = () => {
    const { t } = useTranslation();
    const dispatch = useDispatch();

    const currentColors = useSelector((state: RootState) => state.color.colors);
    const currentDateRange = useSelector((state: RootState) => state.baseSettings.dateRange);
    const currentColumns = useSelector((state: RootState) => state.wbsData.columns);
    const currentData = useSelector((state: RootState) => state.wbsData.data);
    const isViewingPast = useSelector((state: RootState) => state.history?.isViewingPast || false);
    const previewData = useSelector((state: RootState) => state.history?.previewData);
    
    const colors = isViewingPast && previewData?.colors ? previewData.colors : currentColors;
    const dateRange = isViewingPast && previewData?.dateRange ? previewData.dateRange : currentDateRange;
    const columns = isViewingPast && previewData?.columns ? previewData.columns : currentColumns;
    const data = isViewingPast && previewData?.data ? previewData.data : currentData;
    const holidayInput = useSelector((state: RootState) => state.baseSettings.holidayInput);
    const holidayColor = useSelector((state: RootState) => state.wbsData.holidayColor);
    const regularDaysOffSetting = useSelector((state: RootState) => state.wbsData.regularDaysOffSetting);
    const wbsWidth = useSelector((state: RootState) => state.baseSettings.wbsWidth);
    const calendarWidth = useSelector((state: RootState) => state.baseSettings.calendarWidth);
    const cellWidth = useSelector((state: RootState) => state.baseSettings.cellWidth);
    const title = useSelector((state: RootState) => state.baseSettings.title);
    const showYear = useSelector((state: RootState) => state.wbsData.showYear);
    const dateFormat = useSelector((state: RootState) => state.wbsData.dateFormat);
    const treeData = useSelector((state: RootState) => state.notes.treeData);
    const noteData = useSelector((state: RootState) => state.notes.noteData);
    const treeExpandedKeys = useSelector((state: RootState) => state.notes.treeExpandedKeys);
    const treeScrollPosition = useSelector((state: RootState) => state.notes.treeScrollPosition);
    const editorStates = useSelector((state: RootState) => state.notes.editorStates);
    const selectedNodeKey = useSelector((state: RootState) => state.notes.selectedNodeKey);
    const currentLanguage = useSelector((state: RootState) => state.baseSettings.language);
    const scrollPosition = useSelector((state: RootState) => state.baseSettings.scrollPosition);
    const notesModalState = useSelector((state: RootState) => state.notes.modalState);
    const historySnapshots = useSelector((state: RootState) => state.history?.snapshots || []);

    const exportAndCopyJson = useCallback(async () => {
        try {
            const zipBlob = await handleExport(
                uuidv4(),
                colors,
                dateRange,
                columns,
                data,
                holidayInput,
                holidayColor,
                regularDaysOffSetting,
                wbsWidth,
                calendarWidth,
                cellWidth,
                title,
                showYear,
                dateFormat,
                treeData,
                noteData,
                currentLanguage,
                scrollPosition,
                notesModalState,
                treeExpandedKeys,
                treeScrollPosition,
                editorStates,
                selectedNodeKey,
                historySnapshots,
            );

            const JSZip = (await import('jszip')).default;
            const zip = new JSZip();
            const loadedZip = await zip.loadAsync(zipBlob);
            const jsonFileEntry = Object.values(loadedZip.files).find(file => file.name.endsWith('.json'));
            if (!jsonFileEntry) throw new Error("No JSON file found in ZIP");
            const jsonString = await jsonFileEntry.async("string");

            await navigator.clipboard.writeText(jsonString);

            dispatch(setMessageInfo({
                message: t('JSON data generated and copied to clipboard.'),
                severity: 'success'
            }));

            return jsonString;
        } catch (error) {
            const errorMessage = error instanceof Error
                ? t('JSON export failed: ') + error.message
                : t('JSON export failed. An unknown error occurred.');
            dispatch(setMessageInfo({
                message: errorMessage,
                severity: 'error'
            }));
            throw error;
        }
    }, [
        colors, dateRange, columns, data, holidayInput, holidayColor,
        regularDaysOffSetting, wbsWidth, calendarWidth, cellWidth, title,
        showYear, dateFormat, treeData, noteData, currentLanguage, 
        scrollPosition, notesModalState, treeExpandedKeys, treeScrollPosition,
        editorStates, selectedNodeKey, historySnapshots, dispatch, t
    ]);

    return { exportAndCopyJson };
};