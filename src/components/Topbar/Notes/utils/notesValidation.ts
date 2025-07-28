// notesValidation.ts
import { NotesModalState } from '../../../../reduxStoreAndSlices/notesSlice';

const QUILL_MIN_WIDTH = 300;

/**
 * Utility function to validate and sanitize modal state
 */
export const validateModalState = (state: NotesModalState): NotesModalState => {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  
  // Check if position is within bounds
  const isPositionValid = 
    state.position.x >= 0 && 
    state.position.x < windowWidth - 200 &&
    state.position.y >= 0 && 
    state.position.y < windowHeight - 100;
  
  // Determine minimum width based on tree visibility
  const minWidth = state.treeWidth === 0 ? QUILL_MIN_WIDTH : 400;
  
  // Check if size is reasonable
  const isSizeValid = 
    state.noteWidth >= minWidth && 
    state.noteWidth <= windowWidth - 50 &&
    state.noteHeight >= 200 && 
    state.noteHeight <= windowHeight - 50 &&
    state.treeWidth >= 0 && 
    state.treeWidth <= 500;
  
  if (isPositionValid && isSizeValid) {
    return state;
  }
  
  // Return default state if validation fails
  return {
    treeWidth: 300,
    noteWidth: 1050,
    noteHeight: 400,
    position: { x: 250, y: 50 }
  };
};

/**
 * Get minimum required width based on tree visibility
 */
export const getMinRequiredWidth = (treeWidth: number): number => {
  return treeWidth === 0 ? QUILL_MIN_WIDTH : treeWidth + QUILL_MIN_WIDTH;
};

export { QUILL_MIN_WIDTH };