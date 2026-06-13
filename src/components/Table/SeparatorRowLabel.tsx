import React, { memo } from 'react';
import { SeparatorRow } from '../../types/DataTypes';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, toggleSeparatorCollapsed } from '../../reduxStoreAndSlices/store';
import { MdChevronRight } from 'react-icons/md';

interface SeparatorRowLabelProps {
  entry: SeparatorRow;
  topPosition: number;
}

const SeparatorRowLabelComponent: React.FC<SeparatorRowLabelProps> = memo(({ entry, topPosition }) => {
  const dispatch = useDispatch();
  const rowHeight = useSelector((state: RootState) => state.baseSettings.rowHeight);
  // The label overlay starts after whatever leading fixed columns are visible
  // (the "No" and optional "WBS" columns), so it stays aligned when either is
  // hidden. ~3px per column accounts for cell borders.
  const columns = useSelector((state: RootState) => state.wbsData.columns);
  const leadingOffset = columns.reduce((acc, c) => {
    if (c.visible && (c.columnId === 'no' || c.columnId === 'wbsNumber')) {
      return acc + (c.width ?? 0) + 3;
    }
    return acc;
  }, 0);
  const adjustedTopPosition = topPosition;
  const isCollapsed: boolean = entry.isCollapsed;
  const indentWidth = (entry.level ?? 0) * 9;

  return (
    <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', top: `${adjustedTopPosition}px`, left: `${leadingOffset + indentWidth}px`, height: `${rowHeight}px` }}>
      <div
        style={{
          display: 'flex',
          height: '21px',
          width: '21px',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: '1',
          fontSize: '0.73rem',
        }}
        onClick={() => dispatch(toggleSeparatorCollapsed({ id: entry.id }))}
      >
        <MdChevronRight
          style={{
            transition: 'transform 0.15s ease',
            transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
          }}
        />
      </div>
      <span
        style={{
          padding: '0px 1px',
          zIndex: '1',
          pointerEvents: 'none',
          whiteSpace: 'nowrap'
        }}
      >
        {entry.displayName}
      </span>
    </div>
  );
});

export default SeparatorRowLabelComponent;