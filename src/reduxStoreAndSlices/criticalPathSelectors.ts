// criticalPathSelectors.ts
// クリティカルパスは data から完全に導出できる派生状態なので、slice には持たず
// メモ化セレクタで算出する(undo/redo スナップショットにも保存ファイルにも入らない)。
import { createSelector } from '@reduxjs/toolkit';
import { RootState } from './store';
import { computeCriticalPath } from '../utils/CriticalPath';

export const selectCriticalPath = createSelector(
  [
    (state: RootState) => state.wbsData.data,
    (state: RootState) => state.wbsData.holidays,
    (state: RootState) => state.wbsData.regularDaysOff,
  ],
  (data, holidays, regularDaysOff) => computeCriticalPath(data, holidays, regularDaysOff)
);
