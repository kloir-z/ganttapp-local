// NotesTree.tsx
import React, { memo, useRef, useEffect } from 'react';
import { Tree, Button, Tooltip } from 'antd';
import { PlusCircleOutlined, MinusCircleOutlined, PlusSquareOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { StyledTreeContainer } from '../NotesStyles';
import { useNotesTree } from '../hooks/useNotesTree';
import DeleteConfirmDialog from './DeleteConfirmDialog';

interface NotesTreeProps {
  treeWidth: number;
  resizeAnimate: boolean;
  activeModal: string | null;
}

const NotesTree: React.FC<NotesTreeProps> = memo(({ 
  treeWidth, 
  resizeAnimate, 
  activeModal 
}) => {
  const { t } = useTranslation();
  const treeContainerRef = useRef<HTMLDivElement>(null);
  
  const {
    treeData,
    treeExpandedKeys,
    treeScrollPosition,
    selectedNodeKey,
    deleteDialogOpen,
    onDrop,
    onSelect,
    addNode,
    onRemoveNodeClick,
    handleConfirmDelete,
    handleCancelDelete,
    onExpand,
    handleTreeScroll
  } = useNotesTree();

  // Restore tree scroll position
  useEffect(() => {
    if (treeContainerRef.current && treeScrollPosition > 0) {
      const scrollContainer = treeContainerRef.current.querySelector('.ant-tree');
      if (scrollContainer) {
        scrollContainer.scrollTop = treeScrollPosition;
      }
    }
  }, [treeScrollPosition, activeModal]);

  return (
    <StyledTreeContainer 
      ref={treeContainerRef}
      style={{ 
        width: `${treeWidth}px`, 
        maxHeight: '80svh', 
        transition: resizeAnimate ? 'width 0.2s ease-in-out' : 'none' 
      }}
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
        
        <DeleteConfirmDialog
          open={deleteDialogOpen}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
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
  );
});

export default NotesTree;