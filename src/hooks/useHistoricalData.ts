import { useSelector } from 'react-redux';
import { useMemo } from 'react';
import { RootState, ExtendedColumn } from '../reduxStoreAndSlices/store';
import { WBSData, DateFormatType } from '../types/DataTypes';
import { isCompressedData } from '../utils/CompressionUtils';

interface HistoricalDataReturn {
  isViewingPast: boolean;
  viewingSnapshotId: string | null;
  wbsData: Record<string, WBSData>;
  columns: ExtendedColumn[];
  colors: any;
  dateRange: any;
  title: string;
  cellWidth: number;
  wbsWidth: number;
  calendarWidth: number;
  holidayInput: any;
  holidayColor: any;
  regularDaysOffSetting: any;
  showYear: boolean;
  dateFormat: DateFormatType;
  treeData: any;
  noteData: any;
  language: string;
  scrollPosition: any;
}

/**
 * Custom hook that returns either current data or historical preview data
 * for specific data slices based on the current viewing mode
 * Optimized for performance with selective state subscription and memoization
 */
export const useHistoricalData = (): HistoricalDataReturn => {
  // Only subscribe to the minimal necessary state
  const isViewingPast = useSelector((state: RootState) => state.history?.isViewingPast || false);
  const viewingSnapshotId = useSelector((state: RootState) => state.history?.viewingSnapshotId);
  
  // Only get current data if not viewing past (avoid unnecessary subscriptions)
  const currentWbsData = useSelector((state: RootState) => state.wbsData.data);
  const currentColumns = useSelector((state: RootState) => state.wbsData.columns);
  const currentColors = useSelector((state: RootState) => state.color.colors);
  const currentDateRange = useSelector((state: RootState) => state.baseSettings.dateRange);
  const currentTitle = useSelector((state: RootState) => state.baseSettings.title);
  const currentCellWidth = useSelector((state: RootState) => state.baseSettings.cellWidth);
  const currentWbsWidth = useSelector((state: RootState) => state.baseSettings.wbsWidth);
  const currentCalendarWidth = useSelector((state: RootState) => state.baseSettings.calendarWidth);
  const currentHolidayInput = useSelector((state: RootState) => state.baseSettings.holidayInput);
  const currentHolidayColor = useSelector((state: RootState) => state.wbsData.holidayColor);
  const currentRegularDaysOffSetting = useSelector((state: RootState) => state.wbsData.regularDaysOffSetting);
  const currentShowYear = useSelector((state: RootState) => state.wbsData.showYear);
  const currentDateFormat = useSelector((state: RootState) => state.wbsData.dateFormat);
  const currentTreeData = useSelector((state: RootState) => state.notes.treeData);
  const currentNoteData = useSelector((state: RootState) => state.notes.noteData);
  const currentLanguage = useSelector((state: RootState) => state.baseSettings.language);
  const currentScrollPosition = useSelector((state: RootState) => state.baseSettings.scrollPosition);
  
  // Only get history snapshots when viewing past
  const historySnapshots = useSelector((state: RootState) => 
    isViewingPast ? state.history?.snapshots : null
  );

  // Memoize the current state data to avoid recreating objects
  const currentStateData = useMemo(() => ({
    isViewingPast: false,
    viewingSnapshotId: null,
    wbsData: currentWbsData,
    columns: currentColumns,
    colors: currentColors,
    dateRange: currentDateRange,
    title: currentTitle,
    cellWidth: currentCellWidth,
    wbsWidth: currentWbsWidth,
    calendarWidth: currentCalendarWidth,
    holidayInput: currentHolidayInput,
    holidayColor: currentHolidayColor,
    regularDaysOffSetting: currentRegularDaysOffSetting,
    showYear: currentShowYear,
    dateFormat: currentDateFormat as DateFormatType,
    treeData: currentTreeData,
    noteData: currentNoteData,
    language: currentLanguage,
    scrollPosition: currentScrollPosition
  }), [
    currentWbsData, currentColumns, currentColors, currentDateRange, currentTitle,
    currentCellWidth, currentWbsWidth, currentCalendarWidth, currentHolidayInput,
    currentHolidayColor, currentRegularDaysOffSetting, currentShowYear, currentDateFormat,
    currentTreeData, currentNoteData, currentLanguage, currentScrollPosition
  ]);

  // Memoize historical data parsing and computation
  const historicalData = useMemo(() => {
    if (!isViewingPast || !viewingSnapshotId || !historySnapshots) {
      return null;
    }

    const snapshot = historySnapshots.find(s => s.id === viewingSnapshotId);
    if (!snapshot) return null;

    try {
      let jsonString: string;
      
      // Handle compressed data (for now, skip compressed data in this hook)
      if (isCompressedData(snapshot.projectDataSnapshot)) {
        // Skip compressed data for now - would need async handling
        return null;
      } else {
        jsonString = snapshot.projectDataSnapshot as string;
      }
      
      const previewData = JSON.parse(jsonString);
      return {
        isViewingPast: true,
        viewingSnapshotId,
        wbsData: previewData.data || currentWbsData,
        columns: previewData.columns || currentColumns,
        colors: previewData.colors || currentColors,
        dateRange: previewData.dateRange || currentDateRange,
        title: previewData.title || currentTitle,
        cellWidth: previewData.cellWidth || currentCellWidth,
        wbsWidth: previewData.wbsWidth || currentWbsWidth,
        calendarWidth: previewData.calendarWidth || currentCalendarWidth,
        holidayInput: previewData.holidayInput || currentHolidayInput,
        holidayColor: previewData.holidayColor || currentHolidayColor,
        regularDaysOffSetting: previewData.regularDaysOffSetting || currentRegularDaysOffSetting,
        showYear: previewData.showYear !== undefined ? previewData.showYear : currentShowYear,
        dateFormat: (previewData.dateFormat as DateFormatType) || currentDateFormat,
        treeData: previewData.treeData || currentTreeData,
        noteData: previewData.noteData || currentNoteData,
        language: previewData.language || currentLanguage,
        scrollPosition: previewData.scrollPosition || currentScrollPosition
      };
    } catch (error) {
      console.error('Failed to parse historical data:', error);
      return null;
    }
  }, [
    isViewingPast, viewingSnapshotId, historySnapshots,
    currentWbsData, currentColumns, currentColors, currentDateRange, currentTitle,
    currentCellWidth, currentWbsWidth, currentCalendarWidth, currentHolidayInput,
    currentHolidayColor, currentRegularDaysOffSetting, currentShowYear, currentDateFormat,
    currentTreeData, currentNoteData, currentLanguage, currentScrollPosition
  ]);

  // Return the appropriate data based on viewing state
  return historicalData || currentStateData;
};

export default useHistoricalData;