import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, setMessageInfo } from '../../reduxStoreAndSlices/store';
import { updateRowNoteData, deleteRowNoteData } from '../../reduxStoreAndSlices/notesSlice';
import { MdOutlineStickyNote2 } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import Quill from 'quill';
import QuillEditor from '../Topbar/Notes/QuillEditor';
import ModalResizer from '../Topbar/Notes/ModalResizer';
import { isEmptyRowNote } from '../../utils/rowNoteUtils';
import { rowNoteWindows, MAX_ROW_NOTE_WINDOWS } from '../../utils/rowNoteWindowManager';
import { selectWbsNumberMap } from '../../utils/wbsNumber';

const PANEL_WIDTH = 440;
const PANEL_HEIGHT = 340;
const MIN_WIDTH = 280;
const MIN_HEIGHT = 200;

const noop = () => {};

interface RowNoteButtonProps {
  rowId: string;
  displayName: string;
  // Row number (the table "No" value) shown in the popover title.
  rowNo?: number;
  // Sticky offset from the left edge of the visible chart area (fallback used
  // when the row has no bar to anchor to).
  leftPx?: number;
  // When set, the icon is anchored at this absolute x (in chart coordinates,
  // just left of the row's bar) instead of being sticky to the viewport edge.
  anchorLeftPx?: number;
  // Pixel rect (chart coords, relative to the row's left) of the row's bar
  // span. Used to frame the bar and anchor the connector to the bar's start.
  barRect?: { left: number; width: number } | null;
  // Ref to the row element, used to translate barRect into viewport coords.
  rowRef?: React.RefObject<HTMLDivElement>;
}

const RowNoteButton: React.FC<RowNoteButtonProps> = ({ rowId, displayName, rowNo, leftPx = 2, anchorLeftPx, barRect, rowRef }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  // Subscribe only to this row's note (a single string) so editing one row's
  // note does not re-render every other row's button.
  const noteContent = useSelector((state: RootState) => state.notes.rowNoteData[rowId]);
  const hasNote = !isEmptyRowNote(noteContent);
  // Open state and stacking order are shared across all row-note windows so we
  // can cap the count and raise the last-clicked one to the front.
  const open = useSyncExternalStore(rowNoteWindows.subscribe, () => rowNoteWindows.isOpen(rowId));
  const stackIndex = useSyncExternalStore(rowNoteWindows.subscribe, () => rowNoteWindows.indexOf(rowId));
  // Show the No / WBS number in the title to match whichever the table currently
  // shows, so the two stay intuitively in sync. The WBS map is only computed when
  // this popover is open and the WBS column is shown (otherwise no overhead).
  const noColVisible = useSelector((state: RootState) => state.wbsData.columns.some(c => c.columnId === 'no' && c.visible));
  const wbsColVisible = useSelector((state: RootState) => state.wbsData.columns.some(c => c.columnId === 'wbsNumber' && c.visible));
  const wbsNo = useSelector((state: RootState) => (open && wbsColVisible ? (selectWbsNumberMap(state)[rowId] || '') : ''));
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });
  // Size is kept locally (per button, session-only) so the popover can be
  // resized/moved on the fly without persisting anything.
  const [size, setSize] = useState({ width: PANEL_WIDTH, height: PANEL_HEIGHT });
  // Viewport-space anchor on the chart (start of the bar, falling back to the
  // note icon), used to draw the connector. Recomputed on scroll/resize so the
  // line follows the chart.
  const [anchorPoint, setAnchorPoint] = useState<{ x: number; y: number } | null>(null);
  const btnRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Quill | null>(null);
  const dragRef = useRef<{ x: number; y: number; top: number; left: number } | null>(null);

  const handleSave = useCallback((key: string, content: string) => {
    if (isEmptyRowNote(content)) {
      dispatch(deleteRowNoteData(key));
    } else {
      dispatch(updateRowNoteData({ rowId: key, content }));
    }
  }, [dispatch]);

  const stop = useCallback((e: React.SyntheticEvent) => e.stopPropagation(), []);

  const handleOpen = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // Already open -> just raise it to the front.
    if (rowNoteWindows.isOpen(rowId)) {
      rowNoteWindows.bringToFront(rowId);
      return;
    }
    if (!rowNoteWindows.open(rowId)) {
      dispatch(setMessageInfo({
        message: t('You can open up to {{count}} note windows.', { count: MAX_ROW_NOTE_WINDOWS }),
        severity: 'error',
      }));
      return;
    }
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      // Open a little away from the bar so the connector arrow is visible.
      let left = rect.left + 40;
      let top = rect.bottom + 28;
      if (left + size.width > window.innerWidth) left = window.innerWidth - size.width - 8;
      if (top + size.height > window.innerHeight) top = rect.top - size.height - 12;
      if (top < 8) top = 8;
      if (left < 8) left = 8;
      setPanelPos({ top, left });
    }
  }, [rowId, size.width, size.height, dispatch, t]);

  const handleClose = useCallback(() => rowNoteWindows.close(rowId), [rowId]);
  const bringToFront = useCallback(() => rowNoteWindows.bringToFront(rowId), [rowId]);

  // Drop this window from the manager when the row unmounts (e.g. scrolled out
  // of the virtualized range) so it doesn't linger toward the window cap.
  useEffect(() => () => { rowNoteWindows.close(rowId); }, [rowId]);

  // Escキーでアクティブ(最前面)のメモウィンドウを閉じる。複数開いている場合は
  // 押すたびに手前から順に閉じる。エディタ編集中でも効く(document で捕捉)。
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && rowNoteWindows.isTop(rowId)) {
        e.stopPropagation();
        rowNoteWindows.close(rowId);
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open, rowId]);

  // --- Connector line: track the chart anchor's viewport position while open ---
  const updateAnchor = useCallback(() => {
    // Prefer anchoring to the start of the bar (on the bar color) when present.
    if (rowRef?.current && barRect) {
      const r = rowRef.current.getBoundingClientRect();
      setAnchorPoint({ x: r.left + barRect.left, y: r.top + r.height / 2 });
      return;
    }
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) setAnchorPoint({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  }, [rowRef, barRect]);
  useEffect(() => {
    if (!open) return;
    updateAnchor();
    // capture=true so we also catch scrolling of the inner chart grid container.
    window.addEventListener('scroll', updateAnchor, true);
    window.addEventListener('resize', updateAnchor);
    return () => {
      window.removeEventListener('scroll', updateAnchor, true);
      window.removeEventListener('resize', updateAnchor);
    };
  }, [open, updateAnchor]);

  // --- Drag to move (via header) ---
  const onDragMove = useCallback((e: MouseEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const left = Math.max(0, Math.min(d.left + (e.clientX - d.x), window.innerWidth - 60));
    const top = Math.max(0, Math.min(d.top + (e.clientY - d.y), window.innerHeight - 40));
    setPanelPos({ top, left });
  }, []);
  const endDrag = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener('mousemove', onDragMove);
    window.removeEventListener('mouseup', endDrag);
  }, [onDragMove]);
  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Dragging via the header should also raise the window (it stops propagation,
    // so the container's own bring-to-front mousedown never fires).
    rowNoteWindows.bringToFront(rowId);
    dragRef.current = { x: e.clientX, y: e.clientY, top: panelPos.top, left: panelPos.left };
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', endDrag);
  }, [rowId, panelPos.top, panelPos.left, onDragMove, endDrag]);

  // --- Resize adapters for the shared 8-direction ModalResizer ---
  const setWidth = useCallback((v: React.SetStateAction<number>) => {
    setSize(s => ({ ...s, width: typeof v === 'function' ? v(s.width) : v }));
  }, []);
  const setHeight = useCallback((v: React.SetStateAction<number>) => {
    setSize(s => ({ ...s, height: typeof v === 'function' ? v(s.height) : v }));
  }, []);
  const handlePositionChange = useCallback((p: { x: number; y: number }) => {
    setPanelPos({ left: p.x, top: p.y });
  }, []);

  // Stacking: each open window gets a z block; topmost (highest stackIndex) wins.
  const zBase = 10000 + Math.max(0, stackIndex) * 10;

  // Connector endpoint: closest point on the panel rectangle to the anchor.
  const connector = (() => {
    if (!anchorPoint) return null;
    const px = Math.max(panelPos.left, Math.min(anchorPoint.x, panelPos.left + size.width));
    const py = Math.max(panelPos.top, Math.min(anchorPoint.y, panelPos.top + size.height));
    return { x1: anchorPoint.x, y1: anchorPoint.y, x2: px, y2: py };
  })();

  return (
    <>
      <div
        ref={btnRef}
        className={hasNote ? 'row-note-icon row-note-icon--has' : 'row-note-icon'}
        data-row-note-anchor={rowId}
        title={hasNote ? t('Edit note') : t('Add note')}
        onClick={handleOpen}
        onMouseDown={stop}
        onDoubleClick={stop}
        onContextMenu={stop}
        style={{
          ...(anchorLeftPx !== undefined
            ? { position: 'absolute', left: `${anchorLeftPx}px`, top: '50%', transform: 'translateY(-50%)', zIndex: 4 }
            : { position: 'sticky', left: `${leftPx}px`, alignSelf: 'center', zIndex: 3 }),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '16px',
          height: '16px',
          minWidth: '16px',
          cursor: 'pointer',
          color: '#90a4ae',
          // No note -> hidden until the row is hovered; has note -> faint outline
          // icon. Row hover (see GanttRow CSS) reveals it and turns it blue.
          opacity: hasNote ? 0.3 : 0,
          transition: 'opacity 0.15s ease, color 0.15s ease',
          fontSize: '14px',
        }}
      >
        <MdOutlineStickyNote2 />
      </div>
      {open && barRect && (
        <div
          className="row-note-highlight"
          style={{
            position: 'absolute',
            left: `${barRect.left}px`,
            top: 0,
            bottom: 0,
            width: `${barRect.width}px`,
            pointerEvents: 'none',
            boxSizing: 'border-box',
            zIndex: 6,
          }}
        />
      )}
      {open && createPortal(
        <>
          {connector && (
            <svg
              style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: zBase }}
            >
              <defs>
                <marker
                  id={`rowNoteArrow-${rowId}`}
                  markerWidth={12}
                  markerHeight={12}
                  refX={8}
                  refY={4}
                  orient="auto"
                  markerUnits="userSpaceOnUse"
                >
                  <path d="M0,0 L8,4 L0,8 Z" fill="#3579f8" />
                </marker>
              </defs>
              {/* Drawn bar -> modal so the arrowhead points at the note window. */}
              <line
                x1={connector.x1}
                y1={connector.y1}
                x2={connector.x2}
                y2={connector.y2}
                stroke="#3579f8"
                strokeWidth={2}
                strokeOpacity={0.9}
                markerEnd={`url(#rowNoteArrow-${rowId})`}
              />
              <circle cx={connector.x1} cy={connector.y1} r={3} fill="#3579f8" fillOpacity={0.9} />
            </svg>
          )}
          <div
            onMouseDown={(e) => { e.stopPropagation(); bringToFront(); }}
            onClick={stop}
            onDoubleClick={stop}
            onContextMenu={stop}
            style={{
              position: 'fixed',
              top: `${panelPos.top}px`,
              left: `${panelPos.left}px`,
              width: `${size.width}px`,
              height: `${size.height}px`,
              background: '#fff',
              border: '1px solid #ccc',
              borderRadius: '6px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
              zIndex: zBase + 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div
              onMouseDown={startDrag}
              style={{
                padding: '6px 10px',
                borderBottom: '1px solid #eee',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px',
                cursor: 'move',
                userSelect: 'none',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden' }}>
                <MdOutlineStickyNote2 style={{ color: '#aab2bd', flexShrink: 0, fontSize: '13px' }} />
                <span style={{ color: '#aab2bd', fontWeight: 400, fontSize: '11px', flexShrink: 0 }}>{t('Note')}</span>
                {noColVisible && rowNo !== undefined && (
                  <span style={{ color: '#90a4ae', fontWeight: 500, flexShrink: 0 }}>#{rowNo}</span>
                )}
                {wbsColVisible && wbsNo && (
                  <span style={{ color: '#8e99a3', fontWeight: 500, flexShrink: 0 }}>{wbsNo}</span>
                )}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#555' }}>
                  {displayName || t('(Untitled row)')}
                </span>
              </span>
              <span
                onClick={handleClose}
                onMouseDown={stop}
                style={{ cursor: 'pointer', padding: '0 4px', color: '#888', flexShrink: 0 }}
              >
                ×
              </span>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <QuillEditor
                ref={editorRef}
                readOnly={false}
                selectedNodeKey={rowId}
                addNode={noop}
                noteData={{ [rowId]: noteContent }}
                onSave={handleSave}
              />
            </div>
            <ModalResizer
              noteWidth={size.width}
              noteHeight={size.height}
              setNoteWidth={setWidth}
              setNoteHeight={setHeight}
              position={{ x: panelPos.left, y: panelPos.top }}
              onPositionChange={handlePositionChange}
              minWidth={MIN_WIDTH}
              minHeight={MIN_HEIGHT}
            />
          </div>
        </>,
        document.body
      )}
    </>
  );
};

export default React.memo(RowNoteButton);
