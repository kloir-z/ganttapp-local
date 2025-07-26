// SettingsModalBasic.tsx
import { useState, useEffect, memo, useCallback, ReactNode } from "react";
import { useDispatch } from 'react-redux';
import { ModalCloseButton, ModalContainer, ModalDragBar } from "../../styles/GanttStyles";
import { MdClose } from "react-icons/md";
import { setActiveModal } from "../../reduxStoreAndSlices/uiFlagSlice";

interface SettingsModalDivProps {
  children?: ReactNode;
}

const SettingsModalDiv: React.FC<SettingsModalDivProps> = memo(({ children }) => {
  const dispatch = useDispatch();
  const [$fadeStatus, setFadeStatus] = useState<'in' | 'out'>('in');
  const [isDragging, setIsGridRefDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const [modalPosition, setModalPosition] = useState<{ x: number, y: number }>({ x: 250, y: 50 });

  const handleClose = useCallback(() => {
    setFadeStatus('out');
    setTimeout(() => {
      setFadeStatus('in');
      dispatch(setActiveModal(null));
    }, 210);
  }, [dispatch]);

  const startDrag = useCallback((e: React.MouseEvent) => {
    setIsGridRefDragging(true);
    setDragStart({
      x: e.clientX - modalPosition.x,
      y: e.clientY - modalPosition.y,
    });
    e.preventDefault();
  }, [modalPosition]);

  const onDrag = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      let newX = e.clientX - dragStart.x;
      let newY = e.clientY - dragStart.y;
      newX = Math.max(newX, 0);
      newY = Math.max(newY, 0);

      newX = Math.min(newX, windowWidth - 50);
      newY = Math.min(newY, windowHeight - 50);

      setModalPosition({
        x: newX,
        y: newY,
      });
    }
  }, [isDragging, dragStart]);

  const endDrag = useCallback(() => {
    setIsGridRefDragging(false);
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

  return (
    <>
      <ModalContainer
        $fadeStatus={$fadeStatus}
        onMouseDown={e => e.stopPropagation()}
        style={{
          left: `${modalPosition.x}px`,
          top: `${modalPosition.y}px`,
          position: 'absolute',
        }}
      >
        <ModalDragBar onMouseDown={startDrag}>
        </ModalDragBar>
        <ModalCloseButton onClick={handleClose}>
          <MdClose size={'20px'} />
        </ModalCloseButton>
        {children}
      </ModalContainer >
    </>
  )
});

export default SettingsModalDiv;