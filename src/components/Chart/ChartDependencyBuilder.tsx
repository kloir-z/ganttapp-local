// ChartDependencyBuilder.tsx
//
// Renders the dependency builder as a free-floating popover on the chart, opened
// from the chart's right-click menu (uiFlags.dependencyBuilder). Reuses the same
// DependencyBuilder used by the table's dependency cell, in `standalone` mode.
import React, { useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Compatible } from '@silevis/reactgrid';
import { RootState } from '../../reduxStoreAndSlices/store';
import { closeDependencyBuilder } from '../../reduxStoreAndSlices/uiFlagSlice';
import { isChartRow } from '../../types/DataTypes';
import DependencyBuilder from '../Table/utils/DependencyBuilder';
import { CustomDependencyCell } from '../Table/utils/CustomDependencyCell';

const PANEL_WIDTH = 320;
const PANEL_EST_HEIGHT = 340;

const ChartDependencyBuilder: React.FC = () => {
  const dispatch = useDispatch();
  const builder = useSelector((state: RootState) => state.uiFlags.dependencyBuilder);
  const data = useSelector((state: RootState) => state.wbsData.data);
  const close = useCallback(() => dispatch(closeDependencyBuilder()), [dispatch]);
  const onWheel = useCallback((e: React.WheelEvent) => {
    const grid = document.getElementById('gantt-grid-scroll');
    if (grid) {
      grid.scrollTop += e.deltaY;
      grid.scrollLeft += e.deltaX;
    }
  }, []);
  const handleCellChanged = useCallback((_c: Compatible<CustomDependencyCell>, commit: boolean) => {
    if (commit) close();
  }, [close]);

  // Close on Escape (standalone has no ReactGrid to handle it). Closing unmounts
  // DependencyBuilder, whose cleanup reverts any uncommitted live changes.
  useEffect(() => {
    if (!builder) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [builder]);

  const cell = useMemo<Compatible<CustomDependencyCell> | null>(() => {
    if (!builder) return null;
    const row = data[builder.rowId];
    if (!isChartRow(row)) return null;
    const text = (row.dependency || '').replace(/\^\^user\^\^$/, '');
    return { type: 'customDependency', text, value: text.length, rowId: builder.rowId, columnWidth: 150 } as Compatible<CustomDependencyCell>;
    // Only rebuild when the target row changes, not on every live edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [builder?.rowId]);

  if (!builder || !cell) return null;

  const left = Math.max(8, Math.min(builder.x, window.innerWidth - PANEL_WIDTH - 8));
  const top = Math.max(8, Math.min(builder.y, window.innerHeight - PANEL_EST_HEIGHT - 8));

  // No backdrop: the chart stays scrollable/draggable while the builder is open.
  // Close via the × button, Cancel/Apply, or Escape. The wheel is forwarded to the
  // chart grid so scrolling works even with the cursor over the (body-portaled)
  // panel, whose own wheel events otherwise never reach the chart's handler.
  return createPortal(
    <div onWheel={onWheel} style={{ position: 'fixed', top: `${top}px`, left: `${left}px`, zIndex: 11001 }}>
      <DependencyBuilder
        // Remount fresh for each open (new row/position) so no stale internal
        // state (committed flag, original value, drag offset) carries over.
        key={`${builder.rowId}:${builder.x}:${builder.y}`}
        cell={cell}
        standalone
        onCellChanged={handleCellChanged}
      />
    </div>,
    document.body
  );
};

// NOT wrapped in React.memo: that interacts badly with Fast Refresh + createPortal
// (it could leave an orphaned panel div in <body> on hot-reload). Scroll-time
// re-render cost is already avoided because the heavy child (DependencyBuilder) is
// itself memoized and receives stable props (cell, onCellChanged) — so a cheap
// re-render of this wrapper during drag-scroll does not re-render the panel.
export default ChartDependencyBuilder;
