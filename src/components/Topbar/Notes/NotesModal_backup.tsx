// NotesModal.tsx
import { Key, memo, useState, useCallback, useRef, useEffect } from "react";
import { RootState } from "../../../reduxStoreAndSlices/store";
import { useSelector, useDispatch } from 'react-redux';
import { updateTreeNodeTitle, addTreeNode, removeTreeNode, updateTreeDataOnDrop, ExtendedTreeDataNode, updateNotesModalState, NotesModalState, updateTreeExpandedKeys, updateTreeScrollPosition, setSelectedNodeKey } from "../../../reduxStoreAndSlices/notesSlice";
import { ModalCloseButton, ModalContainer, ModalDragBar } from "../../../styles/GanttStyles";
import { MdClose } from "react-icons/md";
import { setActiveModal } from "../../../reduxStoreAndSlices/uiFlagSlice";
import { Tree, Button, Tooltip, Input } from 'antd';
import type { NodeDragEventParams } from 'rc-tree/lib/contextTypes';
import { DataNode, EventDataNode } from "antd/es/tree";
import { PlusCircleOutlined, MinusCircleOutlined, PlusSquareOutlined } from '@ant-design/icons';
import { StyledContainer, StyledTreeContainer } from "./NotesStyles";
import TreePaneResizer from "./TreePaneResizer";
import { useTranslation } from "react-i18next";
import { findNodeByKey, formatToLocalDateTime } from "./NoteUtils";
import QuillEditor from './QuillEditor';
import ModalResizer from "./ModalResizer";
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button as MuiButton } from "@mui/material";

const QUILL_MIN_WIDTH = 300;

// Utility function to validate and sanitize modal state
const validateModalState = (state: NotesModalState): NotesModalState => {
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

// Custom modal wrapper for Notes with position persistence
interface NotesModalDivProps {
  children: React.ReactNode;
  position: { x: number; y: number };
  onPositionChange: (position: { x: number; y: number }) => void;
}

const NotesModalDiv: React.FC<NotesModalDivProps> = memo(({ children, position, onPositionChange }) => {
  const dispatch = useDispatch();
  const [$fadeStatus, setFadeStatus] = useState<'in' | 'out'>('in');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number, y: number }>({ x: 0, y: 0 });

  const handleClose = useCallback(() => {
    setFadeStatus('out');
    setTimeout(() => {
      setFadeStatus('in');
      dispatch(setActiveModal(null));
    }, 210);
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

      onPositionChange({ x: newX, y: newY });
    }
  }, [isDragging, dragStart, onPositionChange]);

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

  return (
    <ModalContainer
      $fadeStatus={$fadeStatus}
      onMouseDown={e => e.stopPropagation()}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        position: 'absolute',
      }}
    >
      <ModalDragBar onMouseDown={startDrag}>
      </ModalDragBar>
      <ModalCloseButton onClick={handleClose}>
        <MdClose size={'20px'} />
      </ModalCloseButton>
      {children}
    </ModalContainer>
  );
});

const NotesModal: React.FC = memo(() => {
  const activeModal = useSelector((state: RootState) => state.uiFlags.activeModal);
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const treeData = useSelector((state: RootState) => state.notes.treeData);
  const treeExpandedKeys = useSelector((state: RootState) => state.notes.treeExpandedKeys);
  const treeScrollPosition = useSelector((state: RootState) => state.notes.treeScrollPosition);
  const selectedNodeKeyFromStore = useSelector((state: RootState) => state.notes.selectedNodeKey);
  
  // Get modal state from Redux
  const modalState = useSelector((state: RootState) => state.notes.modalState);
  
  // Validate modal state on first render and window resize
  useEffect(() => {
    const validatedState = validateModalState(modalState);
    if (JSON.stringify(validatedState) !== JSON.stringify(modalState)) {
      dispatch(updateNotesModalState(validatedState));
    }
  }, [modalState, dispatch]);
  
  const [selectedNodeTitle, setSelectedNodeTitle] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const selectedNodeKey = selectedNodeKeyFromStore;
  const selectedNode = findNodeByKey(treeData, selectedNodeKey);
  const [resizeAnimate, setResizeAnimate] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarHeight, setToolbarHeight] = useState(0);
  const treeContainerRef = useRef<HTMLDivElement>(null);
  
  // Extract values from modal state
  const { treeWidth, noteWidth, noteHeight, position } = modalState;
  
  // Handle position changes
  const handlePositionChange = useCallback((newPosition: { x: number; y: number }) => {
    dispatch(updateNotesModalState({ position: newPosition }));
  }, [dispatch]);

  useEffect(() => {
    if (toolbarRef.current) {
      const targetDiv = toolbarRef.current.querySelector('.ql-toolbar');
      if (targetDiv) {
        setToolbarHeight(targetDiv.clientHeight);
      }
    }
  }, [noteHeight, noteWidth, treeWidth, toolbarHeight, activeModal]);

  useEffect(() => {
    // Only enforce minimum width if tree is visible (treeWidth > 0)
    const minRequiredWidth = treeWidth === 0 ? QUILL_MIN_WIDTH : treeWidth + QUILL_MIN_WIDTH;
    if (noteWidth < minRequiredWidth) {
      dispatch(updateNotesModalState({ noteWidth: minRequiredWidth }));
    }
  }, [noteWidth, treeWidth, dispatch]);

  useEffect(() => {
    setTimeout(() => {
      if (toolbarRef.current) {
        const targetDiv = toolbarRef.current.querySelector('.ql-toolbar');
        if (targetDiv) {
          setToolbarHeight(targetDiv.clientHeight);
        }
      }
    }, 210);
  }, [resizeAnimate])

  const onDrop = useCallback((info: NodeDragEventParams<DataNode> & {
    dragNode: EventDataNode<DataNode>;
    dragNodesKeys: React.Key[];
    dropPosition: number;
    dropToGap: boolean;
  }) => {
    const { node, dragNode, dropPosition, dropToGap } = info;
    const dropKey = node.key;
    const dragKey = dragNode.key;
    dispatch(updateTreeDataOnDrop({ dropKey, dragKey, dropPosition, dropToGap }));
  }, [dispatch]);

  const onSelect = useCallback((_selectedKeys: Key[], info: {
    event: "select";
    selected: boolean;
    node: EventDataNode<ExtendedTreeDataNode>;
    selectedNodes: ExtendedTreeDataNode[];
    nativeEvent: MouseEvent;
  }) => {
    const nodeTitle = typeof info.node.title === 'string' ? info.node.title : '';
    const nodeKey = info.node.key.toString();
    setSelectedNodeTitle(nodeTitle);
    dispatch(setSelectedNodeKey(nodeKey));
  }, [dispatch]);

  const addNode = useCallback((sameLevel = false, title?: string, content?: string) => {
    const newKey = Math.random().toString(36).substring(2, 11);
    const newTitle = title || 'no title'
    dispatch(addTreeNode({ selectedNodeKey, sameLevel, newKey, newTitle, content }));
    dispatch(setSelectedNodeKey(newKey));
    setSelectedNodeTitle(newTitle);
  }, [dispatch, selectedNodeKey]);

  const onRemoveNodeClick = useCallback(() => {
    if (!selectedNodeKey) {
      alert(t('Please select an item'));
      return;
    }
    setDeleteDialogOpen(true);
  }, [selectedNodeKey, t]);

  const handleConfirmDelete = useCallback(() => {
    if (!selectedNodeKey) {
      alert(t('Please select an item'));
      return;
    }
    dispatch(removeTreeNode(selectedNodeKey));
    dispatch(setSelectedNodeKey(''));
    setSelectedNodeTitle('');
    setDeleteDialogOpen(false);
  }, [dispatch, selectedNodeKey, t]);

  const handleCancelDelete = useCallback(() => {
    setDeleteDialogOpen(false);
  }, []);


  const handleTitleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = event.target.value;
    setSelectedNodeTitle(newTitle);
    if (selectedNodeKey) {
      dispatch(updateTreeNodeTitle({ key: selectedNodeKey, title: newTitle }));
    } else {
      addNode(false, newTitle, '');
    }
  }, [addNode, dispatch, selectedNodeKey]);

  const onExpand = useCallback((expandedKeys: Key[]) => {
    dispatch(updateTreeExpandedKeys(expandedKeys));
  }, [dispatch]);

  const handleTreeScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    dispatch(updateTreeScrollPosition(scrollTop));
  }, [dispatch]);

  // Restore tree scroll position
  useEffect(() => {
    if (treeContainerRef.current && treeScrollPosition > 0) {
      const scrollContainer = treeContainerRef.current.querySelector('.ant-tree');
      if (scrollContainer) {
        scrollContainer.scrollTop = treeScrollPosition;
      }
    }
  }, [treeScrollPosition, activeModal]);

  // Initialize selected node title when selectedNodeKey changes
  useEffect(() => {
    if (selectedNodeKey) {
      const node = findNodeByKey(treeData, selectedNodeKey);
      if (node && typeof node.title === 'string') {
        setSelectedNodeTitle(node.title);
      }
    } else {
      setSelectedNodeTitle('');
    }
  }, [selectedNodeKey, treeData]);

  return (
    (activeModal === 'notes') &&
    <NotesModalDiv position={position} onPositionChange={handlePositionChange}>
      <StyledContainer style={{ width: `${noteWidth}px`, height: `${noteHeight}px` }}>
        <StyledTreeContainer 
          ref={treeContainerRef}
          style={{ width: `${treeWidth}px`, maxHeight: '80svh', transition: resizeAnimate ? 'width 0.2s ease-in-out' : 'none' }}
          onScroll={handleTreeScroll}
        >
          <div style={{ overflow: 'hidden', minWidth: '150px' }}>
            <Tooltip title={t('Add Sibling Node')}>
              <Button type="text" onClick={() => addNode(true)}>
                <PlusSquareOutlined />
              </Button>
            </Tooltip>
            <Tooltip title={t('Add Child Node')}>
              <Button type="text" onClick={() => addNode(false)}>
                <PlusCircleOutlined />
              </Button>
            </Tooltip>
            <Tooltip title={t('Remove Node')}>
              <Button type="text" onClick={onRemoveNodeClick}>
                <MinusCircleOutlined />
              </Button>
            </Tooltip>
            <Dialog
              open={deleteDialogOpen}
              onClose={handleCancelDelete}
              aria-labelledby="alert-dialog-title"
              aria-describedby="alert-dialog-description"
            >
              <DialogTitle id="alert-dialog-title">{t('Confirm Delete')}</DialogTitle>
              <DialogContent>
                <DialogContentText id="alert-dialog-description">
                  {t('Are you sure you want to delete this? This action cannot be undone.')}
                </DialogContentText>
              </DialogContent>
              <DialogActions>
                <MuiButton onClick={handleCancelDelete} color="primary">
                  {t('Cancel')}
                </MuiButton>
                <MuiButton onClick={handleConfirmDelete} color="primary" autoFocus>
                  {t('Confirm')}
                </MuiButton>
              </DialogActions>
            </Dialog>
          </div>
          <Tree
            className="draggable-tree"
            draggable
            blockNode
            onDrop={onDrop}
            onSelect={onSelect}
            onExpand={onExpand}
            treeData={treeData}
            selectedKeys={[selectedNodeKey]}
            expandedKeys={treeExpandedKeys}
          />
        </StyledTreeContainer>
        <TreePaneResizer 
          treeWidth={treeWidth} 
          setTreeWidth={(width) => dispatch(updateNotesModalState({ treeWidth: typeof width === 'function' ? width(treeWidth) : width }))} 
          setResizeAnimate={setResizeAnimate} 
        />
        <div>
          <Tooltip
            title={selectedNode ? (
              <>
                <div>{t('Created')}: {formatToLocalDateTime(selectedNode.createdAt)}</div>
                <div>{t('Updated')}: {formatToLocalDateTime(selectedNode.updatedAt)}</div>
              </>
            ) : ''}
            placement="topLeft"
          >
            <Input variant="outlined" value={selectedNodeTitle} onChange={handleTitleChange} placeholder={t('Title') + '...'} style={{ minHeight: '35px', }} />
          </Tooltip>
          <div ref={toolbarRef} style={{ height: `${noteHeight - 35 - toolbarHeight}px`, width: `${noteWidth - treeWidth - 15}px`, transition: resizeAnimate ? 'width 0.2s ease-in-out' : 'none' }}>
            <QuillEditor
              readOnly={false}
              selectedNodeKey={selectedNodeKey}
              addNode={addNode}
            />
          </div>
        </div>
      </StyledContainer>
      <ModalResizer 
        noteWidth={noteWidth}
        noteHeight={noteHeight}
        position={position}
        onPositionChange={handlePositionChange}
        setNoteWidth={(width) => dispatch(updateNotesModalState({ noteWidth: typeof width === 'function' ? width(noteWidth) : width }))}
        setNoteHeight={(height) => dispatch(updateNotesModalState({ noteHeight: typeof height === 'function' ? height(noteHeight) : height }))}
        minWidth={treeWidth === 0 ? QUILL_MIN_WIDTH : treeWidth + QUILL_MIN_WIDTH}
        minHeight={300}
      />
    </NotesModalDiv>
  )
});

export default NotesModal;