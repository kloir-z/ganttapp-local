// NotesModal.tsx (Refactored)
import React, { memo, useState, useCallback, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../reduxStoreAndSlices/store';
import { updateNotesModalState, updateTreeData } from '../../../reduxStoreAndSlices/notesSlice';
import { updateTempModalState } from '../../../reduxStoreAndSlices/historySlice';
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
  
  // Historical data for preview functionality
  const isViewingPast = useSelector((state: RootState) => state.history?.isViewingPast || false);
  const previewData = useSelector((state: RootState) => state.history?.previewData);
  const tempModalState = useSelector((state: RootState) => state.history?.tempModalState);
  
  // Get current data
  const currentModalState = useSelector((state: RootState) => state.notes.modalState);
  const currentTreeData = useSelector((state: RootState) => state.notes.treeData);
  const currentNoteData = useSelector((state: RootState) => state.notes.noteData);
  const currentSelectedNodeKey = useSelector((state: RootState) => state.notes.selectedNodeKey);
  
  // Use historical data if viewing past, otherwise current data
  // Note: For selectedNodeKey, always use current selection even during history viewing to allow navigation
  const baseModalState = isViewingPast && previewData?.notesModalState ? previewData.notesModalState : currentModalState;
  const modalState = isViewingPast && tempModalState ? 
    { ...baseModalState, ...tempModalState } : baseModalState;
  const treeData = isViewingPast && previewData?.treeData ? previewData.treeData : currentTreeData;
  const noteData = isViewingPast && previewData?.noteData ? previewData.noteData : currentNoteData;
  const selectedNodeKey = currentSelectedNodeKey; // Always use current selection to allow navigation
  
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
    if (isViewingPast) {
      dispatch(updateTempModalState({ position: newPosition }));
    } else {
      dispatch(updateNotesModalState({ position: newPosition }));
    }
  }, [dispatch, isViewingPast]);

  if (activeModal !== 'notes') {
    return null;
  }

  return (
    <NotesModalWrapper position={position} isViewingPast={isViewingPast} onPositionChange={handlePositionChange}>
      <StyledContainer style={{ width: `${noteWidth}px`, height: `${noteHeight}px` }}>
        <NotesTree 
          treeWidth={treeWidth}
          resizeAnimate={resizeAnimate}
          activeModal={activeModal}
          treeData={treeData}
          selectedNodeKey={selectedNodeKey}
          isViewingPast={isViewingPast}
        />
        
        <TreePaneResizer 
          treeWidth={treeWidth} 
          setTreeWidth={(width) => {
            const newWidth = typeof width === 'function' ? width(treeWidth) : width;
            if (isViewingPast) {
              dispatch(updateTempModalState({ treeWidth: newWidth }));
            } else {
              dispatch(updateNotesModalState({ treeWidth: newWidth }));
            }
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
          isViewingPast={isViewingPast}
        />
      </StyledContainer>
      
      <ModalResizer 
        noteWidth={noteWidth}
        noteHeight={noteHeight}
        position={position}
        onPositionChange={handlePositionChange}
        setNoteWidth={(width) => {
          const newWidth = typeof width === 'function' ? width(noteWidth) : width;
          if (isViewingPast) {
            dispatch(updateTempModalState({ noteWidth: newWidth }));
          } else {
            dispatch(updateNotesModalState({ noteWidth: newWidth }));
          }
        }}
        setNoteHeight={(height) => {
          const newHeight = typeof height === 'function' ? height(noteHeight) : height;
          if (isViewingPast) {
            dispatch(updateTempModalState({ noteHeight: newHeight }));
          } else {
            dispatch(updateNotesModalState({ noteHeight: newHeight }));
          }
        }}
        minWidth={getMinRequiredWidth(treeWidth)}
        minHeight={300}
      />
    </NotesModalWrapper>
  );
});

export default NotesModal;