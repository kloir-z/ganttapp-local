// NoteResizer.tsx
import React, { useState, useCallback, useEffect } from 'react';
import styled from 'styled-components';

const Resizer = styled.div`
  width: 16px;
  height: 16px;
  position: absolute;
  right: 5px;
  bottom: -2px;
  cursor: se-resize;
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0.5;
`;

const ResizeIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M18 13L13 18"
      stroke="#6d6d6d"
      strokeWidth="1.0"
    />
    <path
      d="M18 7L7 18"
      stroke="#696969"
      strokeWidth="1.0"
    />
  </svg>
);

interface NoteResizerProps {
  treeWidth: number;
  setTreeWidth: React.Dispatch<React.SetStateAction<number>>;
  setNoteWidth: React.Dispatch<React.SetStateAction<number>>;
  setNoteHeight: React.Dispatch<React.SetStateAction<number>>;
  quillMinWidth: number;
  minHeight: number;
}

const NoteResizer: React.FC<NoteResizerProps> = ({ setNoteHeight, setNoteWidth, treeWidth, quillMinWidth, minHeight, setTreeWidth }) => {
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const [startHeight, setStartHeight] = useState(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const quillContainer = e.currentTarget.parentElement;
    if (quillContainer) {
      setIsResizing(true);
      setStartX(e.clientX);
      setStartY(e.clientY);
      setStartWidth(quillContainer.clientWidth);
      setStartHeight(quillContainer.clientHeight);
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    const viewportMaxWidth = window.innerWidth - 20;
    const viewportMaxHeight = window.innerHeight - 20;
    const limitedX = Math.min(e.clientX, viewportMaxWidth);
    const limitedY = Math.min(e.clientY, viewportMaxHeight);
    const width = Math.max(startWidth + (limitedX - startX), quillMinWidth);
    if (width - treeWidth < quillMinWidth) {
      setTreeWidth(width - quillMinWidth);
      setNoteWidth(width);
    } else {
      setNoteWidth(width);
    }
    const height = Math.max(startHeight + (limitedY - startY), minHeight);
    setNoteHeight(height);

  },
    [isResizing, startWidth, startX, quillMinWidth, treeWidth, startHeight, startY, minHeight, setNoteHeight, setTreeWidth, setNoteWidth]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <Resizer onMouseDown={handleMouseDown}>
      <ResizeIcon />
    </Resizer>
  );
};

export default NoteResizer;