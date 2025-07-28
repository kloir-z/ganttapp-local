// useNotesModalPosition.ts
import { useState, useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { updateNotesModalState } from '../../../../reduxStoreAndSlices/notesSlice';

interface UseNotesModalPositionProps {
  position: { x: number; y: number };
}

export const useNotesModalPosition = ({ position }: UseNotesModalPositionProps) => {
  const dispatch = useDispatch();
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number, y: number }>({ x: 0, y: 0 });

  const handlePositionChange = useCallback((newPosition: { x: number; y: number }) => {
    dispatch(updateNotesModalState({ position: newPosition }));
  }, [dispatch]);

  const startDrag = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
    e.preventDefault();
  }, [position]);

  const onDrag = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      let newX = e.clientX - dragStart.x;
      let newY = e.clientY - dragStart.y;
      
      // Prevent modal from going off-screen
      newX = Math.max(0, Math.min(newX, windowWidth - 200));
      newY = Math.max(0, Math.min(newY, windowHeight - 100));

      handlePositionChange({ x: newX, y: newY });
    }
  }, [isDragging, dragStart, handlePositionChange]);

  const endDrag = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', onDrag);
      window.addEventListener('mouseup', endDrag);
      return () => {
        window.removeEventListener('mousemove', onDrag);
        window.removeEventListener('mouseup', endDrag);
      };
    }
  }, [isDragging, onDrag, endDrag]);

  return {
    isDragging,
    startDrag,
    handlePositionChange
  };
};