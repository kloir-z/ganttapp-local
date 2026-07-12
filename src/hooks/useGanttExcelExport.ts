import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, setMessageInfo } from '../reduxStoreAndSlices/store';
import { useTranslation } from 'react-i18next';
import { buildGanttXlsxBuffer } from '../utils/GanttExcelExport';

export const useGanttExcelExport = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const data = useSelector((state: RootState) => state.wbsData.data);
  const columns = useSelector((state: RootState) => state.wbsData.columns);
  const colors = useSelector((state: RootState) => state.color.colors);
  const fallbackColor = useSelector((state: RootState) => state.color.fallbackColor);
  const dateRange = useSelector((state: RootState) => state.baseSettings.dateRange);
  const holidays = useSelector((state: RootState) => state.wbsData.holidays);
  const holidayColor = useSelector((state: RootState) => state.wbsData.holidayColor);
  const regularDaysOffSetting = useSelector((state: RootState) => state.wbsData.regularDaysOffSetting);
  const dateFormat = useSelector((state: RootState) => state.wbsData.dateFormat);
  const showYear = useSelector((state: RootState) => state.wbsData.showYear);
  const title = useSelector((state: RootState) => state.baseSettings.title);
  const cellWidth = useSelector((state: RootState) => state.baseSettings.cellWidth);
  const colorBasisColumn = useSelector((state: RootState) => state.color.basisColumnId);
  const treeData = useSelector((state: RootState) => state.notes.treeData);
  const noteData = useSelector((state: RootState) => state.notes.noteData);
  const rowNoteData = useSelector((state: RootState) => state.notes.rowNoteData);

  // includeNotes=false でメモ(Notes)シートを出力せずGanttシートのみとする。
  const exportExcel = useCallback(async (options?: { includeNotes?: boolean }) => {
    const includeNotes = options?.includeNotes !== false;
    try {
      const buffer = await buildGanttXlsxBuffer({
        data, columns, colors, fallbackColor, dateRange, holidays, holidayColor,
        regularDaysOffSetting, dateFormat, showYear, title, cellWidth, t,
        colorBasisColumn,
        ...(includeNotes ? { notes: { treeData, noteData, rowNoteData } } : {}),
      });
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title || 'gantt'}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      dispatch(setMessageInfo({ message: t('Excel file downloaded successfully.'), severity: 'success' }));
    } catch (error) {
      const message = error instanceof Error
        ? t('Excel export failed: ') + error.message
        : t('Excel export failed. An unknown error occurred.');
      dispatch(setMessageInfo({ message, severity: 'error' }));
    }
  }, [data, columns, colors, fallbackColor, dateRange, holidays, holidayColor, regularDaysOffSetting, dateFormat, showYear, title, cellWidth, colorBasisColumn, treeData, noteData, rowNoteData, t, dispatch]);

  return { exportExcel };
};
