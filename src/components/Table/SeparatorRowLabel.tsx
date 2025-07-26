import React, { memo } from 'react';
import { SeparatorRow } from '../../types/DataTypes';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, toggleSeparatorCollapsed } from '../../reduxStoreAndSlices/store';
import { MdExpandMore, MdChevronRight } from 'react-icons/md';

interface SeparatorRowLabelProps {
  entry: SeparatorRow;
  topPosition: number;
}

const SeparatorRowLabelComponent: React.FC<SeparatorRowLabelProps> = memo(({ entry, topPosition }) => {
  const dispatch = useDispatch();
  const rowHeight = useSelector((state: RootState) => state.baseSettings.rowHeight);
  const adjustedTopPosition = topPosition;
  const isCollapsed: boolean = entry.isCollapsed;
  const indentWidth = (entry.level ?? 0) * 9;

  return (
    <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', top: `${adjustedTopPosition}px`, left: `${40 + indentWidth}px`, height: `${rowHeight}px` }}>
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
        {isCollapsed ? <MdChevronRight /> : <MdExpandMore />}
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