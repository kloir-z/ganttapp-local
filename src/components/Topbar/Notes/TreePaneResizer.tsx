import { useRef, useCallback, memo, useState } from "react";
import { StyledResizeBar } from "./NotesStyles";

interface TreePaneResizerProps {
  treeWidth: number;
  setTreeWidth: React.Dispatch<React.SetStateAction<number>>;
  setResizeAnimate: React.Dispatch<React.SetStateAction<boolean>>;
}

const TreePaneResizer: React.FC<TreePaneResizerProps> = memo(({ treeWidth, setTreeWidth, setResizeAnimate }) => {
  const initialPositionRef = useRef<number | null>(null);
  const initialWidthRef = useRef<number>(treeWidth);
  const [isMouseDown, setIsMouseDown] = useState<boolean>(false);
  const lastWidthRef = useRef<number>(treeWidth);
  const isDraggedRef = useRef<boolean>(false);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    isDraggedRef.current = true;
    setResizeAnimate(false);
    const viewportMaxWidth = window.innerWidth - 330;
    if (initialPositionRef.current !== null) {
      const limitedX = Math.min(event.clientX, viewportMaxWidth);
      const deltaX = limitedX - initialPositionRef.current;
      const newWidth = Math.max(0, Math.min(initialWidthRef.current + deltaX, 500));
      setTreeWidth(newWidth);
    }
  }, [setResizeAnimate, setTreeWidth]);

  const handleMouseUp = useCallback(() => {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    if (isDraggedRef.current) {
      lastWidthRef.current = treeWidth;
      setResizeAnimate(false);
    } else {
      setResizeAnimate(true);
      setTimeout(() => setResizeAnimate(false), 400);
      if (treeWidth !== 0) {
        lastWidthRef.current = treeWidth;
        setTreeWidth(0);
      } else {
        setTreeWidth(lastWidthRef.current);
      }
    }
    setIsMouseDown(false);
    isDraggedRef.current = false;
    initialPositionRef.current = null;
  }, [handleMouseMove, treeWidth, setResizeAnimate, setTreeWidth]);

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    initialPositionRef.current = event.clientX;
    initialWidthRef.current = treeWidth;
    setIsMouseDown(true);
    isDraggedRef.current = false;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    event.preventDefault();
    event.stopPropagation();
  }, [handleMouseMove, handleMouseUp, treeWidth]);

  return (
    <StyledResizeBar $left={treeWidth} onMouseDown={handleMouseDown} $ismousedown={isMouseDown} />
  )
});

export default TreePaneResizer;