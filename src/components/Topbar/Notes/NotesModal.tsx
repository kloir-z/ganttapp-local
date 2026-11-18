// NotesModal.tsx (Refactored)
import React, { memo, useState, useCallback, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../reduxStoreAndSlices/store';
import { updateNotesModalState, updateTreeData } from '../../../reduxStoreAndSlices/notesSlice';
import { StyledContainer } from './NotesStyles';
import { validateModalState, getMinRequiredWidth } from './utils/notesValidation';
import { migrateLegacyNoteData } from './utils/notesDataMigration';
import NotesModalWrapper from './components/NotesModalWrapper';
import NotesTree from './components/NotesTree';
import NotesEditor from './components/NotesEditor';
import RowNoteConnector from './components/RowNoteConnector';
import TreePaneResizer from './TreePaneResizer';
import ModalResizer from './ModalResizer';

const NotesModal: React.FC = memo(() => {
  const activeModal = useSelector((state: RootState) => state.uiFlags.activeModal);
  const modalState = useSelector((state: RootState) => state.notes.modalState);
  const treeData = useSelector((state: RootState) => state.notes.treeData);
  const noteData = useSelector((state: RootState) => state.notes.noteData);
  const selectedNodeKey = useSelector((state: RootState) => state.notes.selectedNodeKey);
  const selectedRowNoteId = useSelector((state: RootState) => state.notes.selectedRowNoteId);
  const rowNoteData = useSelector((state: RootState) => state.notes.rowNoteData);

  const dispatch = useDispatch();
  const [resizeAnimate, setResizeAnimate] = useState(false);
  
  // Extract values from modal state
  const { treeWidth, noteWidth, noteHeight, position } = modalState;

  // Migrate legacy note data if needed
  useEffect(() => {
    const migratedTreeData = migrateLegacyNoteData(treeData, noteData, selectedNodeKey);
    if (migratedTreeData.length > 0 && treeData.length === 0) {
      dispatch(updateTreeData(migratedTreeData));
    }
  }, [treeData, noteData, selectedNodeKey, dispatch]);

  // Validate modal state on first render and window resize
  useEffect(() => {
    const validatedState = validateModalState(modalState);
    if (JSON.stringify(validatedState) !== JSON.stringify(modalState)) {
      dispatch(updateNotesModalState(validatedState));
    }
  }, [modalState, dispatch]);

  // Enforce minimum width based on tree visibility
  useEffect(() => {
    const minRequiredWidth = getMinRequiredWidth(treeWidth);
    if (noteWidth < minRequiredWidth) {
      dispatch(updateNotesModalState({ noteWidth: minRequiredWidth }));
    }
  }, [noteWidth, treeWidth, dispatch]);

  // Handle position changes
  const handlePositionChange = useCallback((newPosition: { x: number; y: number }) => {
    dispatch(updateNotesModalState({ position: newPosition }));
  }, [dispatch]);

  if (activeModal !== 'notes') {
    return null;
  }

  return (
    <NotesModalWrapper position={position} onPositionChange={handlePositionChange}>
      {/* 行メモ表示中は、対象タスク(チャート側)からメモ帳へ向かう矢印を描く。 */}
      {selectedRowNoteId && <RowNoteConnector rowId={selectedRowNoteId} />}
      <StyledContainer style={{ width: `${noteWidth}px`, height: `${noteHeight}px` }}>
        <NotesTree 
          treeWidth={treeWidth}
          resizeAnimate={resizeAnimate}
          activeModal={activeModal}
          treeData={treeData}
          selectedNodeKey={selectedNodeKey}
        />
        
        <TreePaneResizer 
          treeWidth={treeWidth} 
          setTreeWidth={(width) => {
            const newWidth = typeof width === 'function' ? width(treeWidth) : width;
            dispatch(updateNotesModalState({ treeWidth: newWidth }));
          }} 
          setResizeAnimate={setResizeAnimate} 
        />
        
        <NotesEditor
          noteWidth={noteWidth}
          noteHeight={noteHeight}
          treeWidth={treeWidth}
          resizeAnimate={resizeAnimate}
          activeModal={activeModal}
          selectedNodeKey={selectedNodeKey}
          noteData={noteData}
          selectedRowNoteId={selectedRowNoteId}
          rowNoteData={rowNoteData}
        />
      </StyledContainer>
      
      <ModalResizer 
        noteWidth={noteWidth}
        noteHeight={noteHeight}
        position={position}
        onPositionChange={handlePositionChange}
        setNoteWidth={(width) => {
          const newWidth = typeof width === 'function' ? width(noteWidth) : width;
          dispatch(updateNotesModalState({ noteWidth: newWidth }));
        }}
        setNoteHeight={(height) => {
          const newHeight = typeof height === 'function' ? height(noteHeight) : height;
          dispatch(updateNotesModalState({ noteHeight: newHeight }));
        }}
        minWidth={getMinRequiredWidth(treeWidth)}
        minHeight={300}
      />
    </NotesModalWrapper>
  );
});

export default NotesModal;