import React, { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../reduxStoreAndSlices/store';
import { updateRowNoteData, deleteRowNoteData } from '../../reduxStoreAndSlices/notesSlice';
import { MdOutlineStickyNote2 } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import Quill from 'quill';
import QuillEditor from '../Topbar/Notes/QuillEditor';
import { isEmptyRowNote } from '../../utils/rowNoteUtils';

const PANEL_WIDTH = 440;
const PANEL_HEIGHT = 340;

const noop = () => {};

interface RowNoteButtonProps {
  rowId: string;
  displayName: string;
  // Sticky offset from the left edge of the visible chart area (fallback used
  // when the row has no bar to anchor to).
  leftPx?: number;
  // When set, the icon is anchored at this absolute x (in chart coordinates,
  // just left of the row's bar) instead of being sticky to the viewport edge.
  anchorLeftPx?: number;
}

const RowNoteButton: React.FC<RowNoteButtonProps> = ({ rowId, displayName, leftPx = 2, anchorLeftPx }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  // Subscribe only to this row's note (a single string) so editing one row's
  // note does not re-render every other row's button.
  const noteContent = useSelector((state: RootState) => state.notes.rowNoteData[rowId]);
  const hasNote = !isEmptyRowNote(noteContent);
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });
  // Size is kept locally (per button, session-only) so the popover can be
  // resized/moved on the fly without persisting anything.
  const [size, setSize] = useState({ width: PANEL_WIDTH, height: PANEL_HEIGHT });
  const btnRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Quill | null>(null);
  const dragRef = useRef<{ x: number; y: number; top: number; left: number } | null>(null);
  const resizeRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

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
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      let left = rect.left;
      let top = rect.bottom + 4;
      if (left + size.width > window.innerWidth) left = window.innerWidth - size.width - 8;
      if (top + size.height > window.innerHeight) top = rect.top - size.height - 4;
      if (top < 8) top = 8;
      if (left < 8) left = 8;
      setPanelPos({ top, left });
    }
    setOpen(true);
  }, [size.width, size.height]);

  const handleClose = useCallback(() => setOpen(false), []);

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
    dragRef.current = { x: e.clientX, y: e.clientY, top: panelPos.top, left: panelPos.left };
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', endDrag);
  }, [panelPos.top, panelPos.left, onDragMove, endDrag]);

  // --- Resize (via bottom-right handle) ---
  const onResizeMove = useCallback((e: MouseEvent) => {
    const r = resizeRef.current;
    if (!r) return;
    const width = Math.max(280, r.w + (e.clientX - r.x));
    const height = Math.max(200, r.h + (e.clientY - r.y));
    setSize({ width, height });
  }, []);
  const endResize = useCallback(() => {
    resizeRef.current = null;
    window.removeEventListener('mousemove', onResizeMove);
    window.removeEventListener('mouseup', endResize);
  }, [onResizeMove]);
  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { x: e.clientX, y: e.clientY, w: size.width, h: size.height };
    window.addEventListener('mousemove', onResizeMove);
    window.addEventListener('mouseup', endResize);
  }, [size.width, size.height, onResizeMove, endResize]);

  return (
    <>
      <div
        ref={btnRef}
        className={hasNote ? 'row-note-icon row-note-icon--has' : 'row-note-icon'}
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
      {open && createPortal(
        <>
          <div
            onMouseDown={handleClose}
            onClick={handleClose}
            onContextMenu={handleClose}
            style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'transparent' }}
          />
          <div
            onMouseDown={stop}
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
              zIndex: 10001,
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
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName || t('(Untitled row)')}
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
            <div
              onMouseDown={startResize}
              title={t('Drag to resize')}
              style={{
                position: 'absolute',
                right: 0,
                bottom: 0,
                width: '16px',
                height: '16px',
                cursor: 'nwse-resize',
                zIndex: 10002,
                background:
                  'linear-gradient(135deg, transparent 0%, transparent 50%, #bbb 50%, #bbb 60%, transparent 60%, transparent 70%, #bbb 70%, #bbb 80%, transparent 80%)',
              }}
            />
          </div>
        </>,
        document.body
      )}
    </>
  );
};

export default React.memo(RowNoteButton);
