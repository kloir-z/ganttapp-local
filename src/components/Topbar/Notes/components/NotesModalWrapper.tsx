// NotesModalWrapper.tsx
import React, { memo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { ModalCloseButton, ModalContainer, ModalDragBar } from '../../../../styles/GanttStyles';
import { MdClose } from 'react-icons/md';
import { setActiveModal } from '../../../../reduxStoreAndSlices/uiFlagSlice';
import { useNotesModalPosition } from '../hooks/useNotesModalPosition';

interface NotesModalWrapperProps {
  children: React.ReactNode;
  position: { x: number; y: number };
}

const NotesModalWrapper: React.FC<NotesModalWrapperProps> = memo(({ children, position }) => {
  const dispatch = useDispatch();
  const [fadeStatus, setFadeStatus] = useState<'in' | 'out'>('in');
  
  const { startDrag } = useNotesModalPosition({ position });

  const handleClose = () => {
    setFadeStatus('out');
    setTimeout(() => {
      setFadeStatus('in');
      dispatch(setActiveModal(null));
    }, 210);
  };

  return (
    <ModalContainer
      $fadeStatus={fadeStatus}
      onMouseDown={e => e.stopPropagation()}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        position: 'absolute',
      }}
    >
      <ModalDragBar onMouseDown={startDrag} />
      <ModalCloseButton onClick={handleClose}>
        <MdClose size={'20px'} />
      </ModalCloseButton>
      {children}
    </ModalContainer>
  );
});

export default NotesModalWrapper;