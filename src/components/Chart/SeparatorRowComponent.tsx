import React, { memo, useMemo, useRef } from 'react';
import { SeparatorRow } from '../../types/DataTypes';
import { GanttRow } from '../../styles/GanttStyles';
import { RootState, toggleSeparatorCollapsed } from '../../reduxStoreAndSlices/store';
import { useDispatch, useSelector } from 'react-redux';
import { cdate } from 'cdate';
import ContextMenu from '../ContextMenu/ContextMenu';
import { useContextMenuOptions } from '../../hooks/useContextMenuOptions';
import { MdExpandMore, MdChevronRight } from 'react-icons/md';

interface SeparatorRowProps {
  entry: SeparatorRow;
  topPosition: number;
  dateArray: ReturnType<typeof cdate>[];
}

const SeparatorRowComponent: React.FC<SeparatorRowProps> = memo(({ entry, topPosition, dateArray }) => {
  const dispatch = useDispatch();
  const cellWidth = useSelector((state: RootState) => state.baseSettings.cellWidth);
  const rowHeight = useSelector((state: RootState) => state.baseSettings.rowHeight);
  const calendarWidth = useSelector((state: RootState) => state.baseSettings.calendarWidth);
  const ganttRowRef = useRef<HTMLDivElement>(null);
  const isCollapsed: boolean = entry.isCollapsed;
  const indentWidth = (entry.level ?? 0) * 9;

  const { lineStart, lineWidth } = useMemo(() => {
    if (!entry.minStartDate || !entry.maxEndDate) {
      return { lineStart: 0, lineWidth: 0 };
    }
    const startDate = cdate(entry.minStartDate);
    const endDate = cdate(entry.maxEndDate);
    let startCDate = dateArray.findIndex(date => date >= startDate);
    let endCDate = dateArray.findIndex(date => date > endDate);
    if (startCDate === -1) {
      startCDate = dateArray.length - 1;
    } else if (startCDate < 0) {
      startCDate = 0;
    }
    if (endCDate === -1) {
      endCDate = dateArray.length;
    } else if (endCDate < 0) {
      endCDate = 0;
    }
    const lineStart = startCDate * cellWidth;
    const lineWidth = (endCDate - startCDate) * cellWidth;
    return { lineStart, lineWidth };
  }, [entry.minStartDate, entry.maxEndDate, dateArray, cellWidth]);

  const menuOptions = useContextMenuOptions({
    entry
  });

  return (
    <>
      <GanttRow style={{ position: 'absolute', top: `${topPosition}px`, width: `${calendarWidth}px`, height: `${rowHeight}px`, backgroundColor: '#ddedff', alignItems: 'center' }} ref={ganttRowRef}>
        {entry.isCollapsed &&
          <div style={{ position: 'absolute', top: '0px', left: `${lineStart}px`, width: `${lineWidth}px`, height: `${rowHeight}px`, backgroundColor: '#bfbfbf5d' }}></div>
        }

        <span
          style={{
            position: 'sticky',
            left: `${9 + indentWidth}px`,
            height: '21px',
            width: '21px',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            zIndex: '1',
            fontSize: '0.73rem',
          }}
          onClick={() => dispatch(toggleSeparatorCollapsed({ id: entry.id }))}
        >
          {isCollapsed ? <MdChevronRight /> : <MdExpandMore />}
        </span>
        <span style={{ position: 'sticky', left: `${21 + indentWidth}px`, color: '#000000ec', padding: '0px 6px', whiteSpace: 'nowrap' }}>{entry.displayName}</span>
      </GanttRow>
      <ContextMenu
        targetRef={ganttRowRef}
        items={menuOptions}
      />
    </>
  );
});
export default SeparatorRowComponent;
