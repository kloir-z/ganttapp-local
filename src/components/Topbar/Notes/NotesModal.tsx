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
import TreePaneResizer from './TreePaneResizer';
import ModalResizer from './ModalResizer';

const NotesModal: React.FC = memo(() => {
  const activeModal = useSelector((state: RootState) => state.uiFlags.activeModal);
  const modalState = useSelector((state: RootState) => state.notes.modalState);
  const treeData = useSelector((state: RootState) => state.notes.treeData);
  const noteData = useSelector((state: RootState) => state.notes.noteData);
  const selectedNodeKey = useSelector((state: RootState) => state.notes.selectedNodeKey);
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
    <NotesModalWrapper position={position}>
      <StyledContainer style={{ width: `${noteWidth}px`, height: `${noteHeight}px` }}>
        <NotesTree 
          treeWidth={treeWidth}
          resizeAnimate={resizeAnimate}
          activeModal={activeModal}
        />
        
        <TreePaneResizer 
          treeWidth={treeWidth} 
          setTreeWidth={(width) => dispatch(updateNotesModalState({ 
            treeWidth: typeof width === 'function' ? width(treeWidth) : width 
          }))} 
          setResizeAnimate={setResizeAnimate} 
        />
        
        <NotesEditor
          noteWidth={noteWidth}
          noteHeight={noteHeight}
          treeWidth={treeWidth}
          resizeAnimate={resizeAnimate}
          activeModal={activeModal}
        />
      </StyledContainer>
      
      <ModalResizer 
        noteWidth={noteWidth}
        noteHeight={noteHeight}
        position={position}
        onPositionChange={handlePositionChange}
        setNoteWidth={(width) => dispatch(updateNotesModalState({ 
          noteWidth: typeof width === 'function' ? width(noteWidth) : width 
        }))}
        setNoteHeight={(height) => dispatch(updateNotesModalState({ 
          noteHeight: typeof height === 'function' ? height(noteHeight) : height 
        }))}
        minWidth={getMinRequiredWidth(treeWidth)}
        minHeight={300}
      />
    </NotesModalWrapper>
  );
});

export default NotesModal;