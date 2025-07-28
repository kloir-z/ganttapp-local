// ModalResizer.tsx
import React, { useState, useCallback, useEffect } from 'react';
import styled from 'styled-components';

const ResizerHandle = styled.div<{ $position: string }>`
  position: absolute;
  background: transparent;
  transition: background 0.2s ease;
  
  &:hover {
    background: rgba(0, 123, 255, 0.5);
  }
  
  ${({ $position }) => {
    switch ($position) {
      case 'top':
        return `
          top: 0;
          left: 0;
          right: 0;
          height: 6px;
          cursor: n-resize;
        `;
      case 'bottom':
        return `
          bottom: 0;
          left: 0;
          right: 0;
          height: 6px;
          cursor: s-resize;
        `;
      case 'left':
        return `
          left: 0;
          top: 0;
          bottom: 0;
          width: 6px;
          cursor: w-resize;
        `;
      case 'right':
        return `
          right: 0;
          top: 0;
          bottom: 0;
          width: 6px;
          cursor: e-resize;
        `;
      case 'top-left':
        return `
          top: 0;
          left: 0;
          width: 10px;
          height: 10px;
          cursor: nw-resize;
        `;
      case 'top-right':
        return `
          top: 0;
          right: 0;
          width: 10px;
          height: 10px;
          cursor: ne-resize;
        `;
      case 'bottom-left':
        return `
          bottom: 0;
          left: 0;
          width: 10px;
          height: 10px;
          cursor: sw-resize;
        `;
      case 'bottom-right':
        return `
          bottom: 0;
          right: 0;
          width: 10px;
          height: 10px;
          cursor: se-resize;
        `;
      default:
        return '';
    }
  }}
`;

interface ModalResizerProps {
  noteWidth: number;
  noteHeight: number;
  setNoteWidth: React.Dispatch<React.SetStateAction<number>>;
  setNoteHeight: React.Dispatch<React.SetStateAction<number>>;
  position: { x: number; y: number };
  onPositionChange: (position: { x: number; y: number }) => void;
  minWidth?: number;
  minHeight?: number;
}

const ModalResizer: React.FC<ModalResizerProps> = ({ 
  noteWidth, 
  noteHeight, 
  setNoteWidth, 
  setNoteHeight, 
  position,
  onPositionChange,
  minWidth = 600, 
  minHeight = 300 
}) => {
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
  const [startSize, setStartSize] = useState({ width: 0, height: 0 });
  const [startModalPosition, setStartModalPosition] = useState({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(direction);
    setStartPosition({ x: e.clientX, y: e.clientY });
    setStartSize({ width: noteWidth, height: noteHeight });
    setStartModalPosition({ x: position.x, y: position.y });
  }, [noteWidth, noteHeight, position]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const viewportMaxWidth = window.innerWidth - 50;
    const viewportMaxHeight = window.innerHeight - 50;

    let newWidth = startSize.width;
    let newHeight = startSize.height;
    let newX = startModalPosition.x;
    let newY = startModalPosition.y;

    // 幅の処理
    if (isResizing.includes('right')) {
      const deltaX = e.clientX - startPosition.x;
      newWidth = Math.max(minWidth, Math.min(startSize.width + deltaX, viewportMaxWidth));
    } else if (isResizing.includes('left')) {
      // 左辺リサイズ時：マウス位置がブラウザ外に出た場合の処理
      const mouseX = Math.max(0, e.clientX);
      const maxAllowedX = startModalPosition.x + startSize.width - minWidth;
      const effectiveMouseX = Math.min(mouseX, maxAllowedX);
      
      newX = effectiveMouseX;
      newWidth = startModalPosition.x + startSize.width - newX;
      
      // 最小幅を保証
      if (newWidth < minWidth) {
        newWidth = minWidth;
        newX = startModalPosition.x + startSize.width - minWidth;
      }
      
      // ビューポート制限
      if (newWidth > viewportMaxWidth) {
        newWidth = viewportMaxWidth;
        newX = startModalPosition.x + startSize.width - viewportMaxWidth;
      }
    }

    // 高さの処理
    if (isResizing.includes('bottom')) {
      const deltaY = e.clientY - startPosition.y;
      newHeight = Math.max(minHeight, Math.min(startSize.height + deltaY, viewportMaxHeight));
    } else if (isResizing.includes('top')) {
      // 上辺リサイズ時：マウス位置がブラウザ外に出た場合の処理
      const mouseY = Math.max(0, e.clientY);
      const maxAllowedY = startModalPosition.y + startSize.height - minHeight;
      const effectiveMouseY = Math.min(mouseY, maxAllowedY);
      
      newY = effectiveMouseY;
      newHeight = startModalPosition.y + startSize.height - newY;
      
      // 最小高さを保証
      if (newHeight < minHeight) {
        newHeight = minHeight;
        newY = startModalPosition.y + startSize.height - minHeight;
      }
      
      // ビューポート制限
      if (newHeight > viewportMaxHeight) {
        newHeight = viewportMaxHeight;
        newY = startModalPosition.y + startSize.height - viewportMaxHeight;
      }
    }

    setNoteWidth(newWidth);
    setNoteHeight(newHeight);
    
    // 位置が変更された場合のみ更新
    if (newX !== startModalPosition.x || newY !== startModalPosition.y) {
      onPositionChange({ x: newX, y: newY });
    }
  }, [isResizing, startPosition, startSize, startModalPosition, minWidth, minHeight, setNoteWidth, setNoteHeight, onPositionChange]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(null);
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <>
      <ResizerHandle $position="top" onMouseDown={(e) => handleMouseDown(e, 'top')} />
      <ResizerHandle $position="bottom" onMouseDown={(e) => handleMouseDown(e, 'bottom')} />
      <ResizerHandle $position="left" onMouseDown={(e) => handleMouseDown(e, 'left')} />
      <ResizerHandle $position="right" onMouseDown={(e) => handleMouseDown(e, 'right')} />
      <ResizerHandle $position="top-left" onMouseDown={(e) => handleMouseDown(e, 'top-left')} />
      <ResizerHandle $position="top-right" onMouseDown={(e) => handleMouseDown(e, 'top-right')} />
      <ResizerHandle $position="bottom-left" onMouseDown={(e) => handleMouseDown(e, 'bottom-left')} />
      <ResizerHandle $position="bottom-right" onMouseDown={(e) => handleMouseDown(e, 'bottom-right')} />
    </>
  );
};

export default ModalResizer;