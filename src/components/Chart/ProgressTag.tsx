// ProgressTag.tsx
import { memo, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../reduxStoreAndSlices/store';
import { isChartRow } from '../../types/DataTypes';
import { createSelector } from 'reselect';

const selectData = (state: RootState) => state.wbsData.data;

const makeSelectProgressAndColor = () => createSelector(
  [selectData, (_, entryId) => entryId],
  (data, entryId) => {
    if (isChartRow(data[entryId])) {
      const rowData = data[entryId];
      if (!rowData) {
        return { progress: '', color: '#c8c8c8' };
      }
      const today = new Date();
      if (isChartRow(rowData)) {
        const plannedStartDate = new Date(rowData.plannedStartDate);
        const plannedEndDate = new Date(rowData.plannedEndDate);
        const actualStartDate = rowData.actualStartDate ? new Date(rowData.actualStartDate) : null;
        const actualEndDate = rowData.actualEndDate ? new Date(rowData.actualEndDate) : null;
        const progressPercentage = rowData.progress ? parseFloat(rowData.progress.replace('%', '')) : null;
        let color = '#c8c8c8';
        if (progressPercentage !== null) {
          if (progressPercentage === 100) {
            color = '#7a7a7abb';
          } else if (today > plannedEndDate) {
            color = '#ff0000bb';
          } else if (!actualStartDate && !actualEndDate && today >= plannedStartDate) {
            color = '#ff5e00c5';
          } else if ((actualStartDate || actualEndDate || (progressPercentage >= 1 && progressPercentage < 100)) && (today >= plannedStartDate || actualStartDate || progressPercentage > 0)) {
            color = '#0051ffbb';
          }
        }
        return { progress: rowData?.progress, color };
      }
    }
    return { progress: "", color: "" };
  }
);

interface ProgressTagProps {
  entryId: string;
}
const ProgressTag: React.FC<ProgressTagProps> = memo(({ entryId }) => {
  const selectProgressAndColor = useMemo(makeSelectProgressAndColor, []);
  const { progress, color } = useSelector((state) => selectProgressAndColor(state, entryId));

  return (
    <div style={{ color, height: '17px' }}>{progress}</div>
  );
});

export default ProgressTag;