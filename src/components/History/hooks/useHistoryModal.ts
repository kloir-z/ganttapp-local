import { useState, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { RootState } from '../../../reduxStoreAndSlices/store';
import { createSnapshot } from '../../../utils/HistoryUtils';
import { startViewingPastWithBackup, returnToPresentWithRestore } from '../../../reduxStoreAndSlices/historyThunks';
import { selectSnapshots, selectCurrentSnapshotId, selectAllRequiredStateForSnapshot } from '../selectors/historySelectors';
import { HistorySnapshot, deleteSnapshot } from '../../../reduxStoreAndSlices/historySlice';
import { isCompressedData, getCompressionRatio } from '../../../utils/CompressionUtils';

// Memoized selector for snapshot size calculation
const snapshotSizeCache = new Map<string, { size: string }>();

export const useHistoryModal = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const snapshots = useSelector(selectSnapshots);
  const currentSnapshotId = useSelector(selectCurrentSnapshotId);
  const isViewingPast = useSelector((state: RootState) => state.history.isViewingPast);
  
  const [commitMessage, setCommitMessage] = useState('');
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);

  // Use optimized memoized selector for all required state
  const allRequiredState = useSelector(selectAllRequiredStateForSnapshot);

  const handleCreateSnapshot = useCallback(async () => {
    if (isViewingPast) {
      // TODO: Replace with proper toast notification
      alert(t('Cannot create snapshots while viewing history'));
      return;
    }
    
    if (!commitMessage.trim()) {
      // TODO: Replace with proper toast notification
      alert(t('Please enter a comment'));
      return;
    }

    setIsCreatingSnapshot(true);
    const rootState = {
      color: { colors: allRequiredState.colors },
      baseSettings: { 
        dateRange: allRequiredState.dateRange, 
        holidayInput: allRequiredState.holidayInput, 
        wbsWidth: allRequiredState.wbsWidth, 
        calendarWidth: allRequiredState.calendarWidth, 
        cellWidth: allRequiredState.cellWidth, 
        title: allRequiredState.title, 
        language: allRequiredState.language, 
        scrollPosition: allRequiredState.scrollPosition 
      },
      wbsData: { 
        columns: allRequiredState.columns, 
        data: allRequiredState.data, 
        holidayColor: allRequiredState.holidayColor, 
        regularDaysOffSetting: allRequiredState.regularDaysOffSetting, 
        showYear: allRequiredState.showYear, 
        dateFormat: allRequiredState.dateFormat 
      },
      notes: { 
        treeData: allRequiredState.treeData, 
        noteData: allRequiredState.noteData, 
        modalState: allRequiredState.modalState, 
        treeExpandedKeys: allRequiredState.treeExpandedKeys, 
        treeScrollPosition: allRequiredState.treeScrollPosition, 
        editorStates: allRequiredState.editorStates, 
        selectedNodeKey: allRequiredState.selectedNodeKey 
      },
      history: { snapshots, currentSnapshotId: null }
    } as RootState;
    
    const success = await createSnapshot(commitMessage, dispatch, rootState);
    
    if (success) {
      setCommitMessage('');
      // Clear cache when new snapshot is created
      snapshotSizeCache.clear();
    } else {
      // TODO: Replace with proper toast notification
      alert(t('Failed to create history data'));
    }
    setIsCreatingSnapshot(false);
  }, [commitMessage, dispatch, allRequiredState, snapshots, currentSnapshotId, isViewingPast]);

  const handleViewPast = useCallback((snapshot: HistorySnapshot) => {
    dispatch(startViewingPastWithBackup(snapshot.id) as any);
  }, [dispatch]);

  const handleDeleteSnapshot = useCallback((snapshotId: string) => {
    if (window.confirm(t('Delete this history entry permanently') + '?')) {
      dispatch(deleteSnapshot(snapshotId));
      // Clear cache entry when snapshot is deleted
      snapshotSizeCache.delete(snapshotId);
    }
  }, [dispatch, t]);

  const handleReturnToPresent = useCallback(() => {
    dispatch(returnToPresentWithRestore() as any);
  }, [dispatch]);

  // Optimized size calculation with caching
  const getSnapshotSize = useCallback((snapshot: HistorySnapshot) => {
    const cacheKey = snapshot.id;
    
    if (snapshotSizeCache.has(cacheKey)) {
      return snapshotSizeCache.get(cacheKey)!;
    }
    
    let sizeInBytes: number;
    let compressionInfo = '';
    
    // 圧縮データかどうかをチェック
    if (isCompressedData(snapshot.projectDataSnapshot)) {
      sizeInBytes = snapshot.projectDataSnapshot.compressedSize;
      const ratio = getCompressionRatio(snapshot.projectDataSnapshot);
      compressionInfo = ` (${ratio.toFixed(1)}% 削減)`;
    } else {
      // 文字列データ（後方互換）
      const jsonStr = snapshot.projectDataSnapshot as string;
      sizeInBytes = new Blob([jsonStr]).size;
    }
    
    const sizeInKB = (sizeInBytes / 1024).toFixed(2);
    
    const result = {
      size: `${sizeInKB} KB${compressionInfo}`
    };
    
    // Cache the result
    snapshotSizeCache.set(cacheKey, result);
    return result;
  }, []);

  // Memoized snapshots with size info to prevent recalculation
  const snapshotsWithSizeInfo = useMemo(() => {
    return snapshots.map(snapshot => ({
      ...snapshot,
      sizeInfo: getSnapshotSize(snapshot)
    }));
  }, [snapshots, getSnapshotSize]);

  return {
    snapshots: snapshotsWithSizeInfo,
    commitMessage,
    setCommitMessage,
    isCreatingSnapshot,
    isViewingPast,
    handleCreateSnapshot,
    handleViewPast,
    handleDeleteSnapshot,
    handleReturnToPresent,
    getSnapshotSize
  };
};