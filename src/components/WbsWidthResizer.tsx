import React, { useRef, useCallback, memo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setWbsWidth } from '../reduxStoreAndSlices/baseSettingsSlice';
import styled from 'styled-components';
import { RootState } from '../reduxStoreAndSlices/store';

interface StyledResizeBarProps {
  width: number;
}

const StyledResizeBar = styled.div<StyledResizeBarProps>`
  width: 5px;
  cursor: ew-resize;
  position: absolute;
  left: ${props => props.width}px;
  height: 100vh;
  z-index: 10;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: #2773ff90;
  }
`;

interface ResizeBarProps {
  setIsGridRefDragging: React.Dispatch<React.SetStateAction<boolean>>;
}

const ResizeBar: React.FC<ResizeBarProps> = memo(({ setIsGridRefDragging }) => {
  const dispatch = useDispatch();
  const initialPositionRef = useRef<number | null>(null);
  const maxWbsWidth = useSelector((state: RootState) => state.baseSettings.maxWbsWidth);
  const wbsWidth = useSelector((state: RootState) => state.baseSettings.wbsWidth);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (initialPositionRef.current !== null) {
      const deltaX = event.clientX - initialPositionRef.current;
      const newWidth = wbsWidth + deltaX;
      const adjustedWidth = Math.max(0, Math.min(newWidth, maxWbsWidth));
      dispatch(setWbsWidth(adjustedWidth));
    }
    setIsGridRefDragging(true);
    event.preventDefault();
  }, [dispatch, maxWbsWidth, setIsGridRefDragging, wbsWidth]);

  const handleMouseUp = useCallback(() => {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    setIsGridRefDragging(false);
    initialPositionRef.current = null;
  }, [handleMouseMove, setIsGridRefDragging]);

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    initialPositionRef.current = event.clientX;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    setIsGridRefDragging(true);
    event.preventDefault();
  }, [handleMouseMove, handleMouseUp, setIsGridRefDragging]);

  return (
    <StyledResizeBar
      width={wbsWidth}
      onMouseDown={handleMouseDown}
    />
  );
});

export default ResizeBar;