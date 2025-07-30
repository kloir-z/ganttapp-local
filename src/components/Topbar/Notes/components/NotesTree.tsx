// NotesTree.tsx
import React, { memo, useRef, useEffect } from 'react';
import { Tree, Button, Tooltip } from 'antd';
import { PlusCircleOutlined, MinusCircleOutlined, PlusSquareOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../reduxStoreAndSlices/store';
import { StyledTreeContainer } from '../NotesStyles';
import { useNotesTree } from '../hooks/useNotesTree';
import DeleteConfirmDialog from './DeleteConfirmDialog';

interface NotesTreeProps {
  treeWidth: number;
  resizeAnimate: boolean;
  activeModal: string | null;
  treeData?: any[];
  selectedNodeKey?: string;
  isViewingPast?: boolean;
}

const NotesTree: React.FC<NotesTreeProps> = memo(({ 
  treeWidth, 
  resizeAnimate, 
  activeModal,
  treeData: propsTreeData,
  selectedNodeKey: propsSelectedNodeKey,
  isViewingPast: propsIsViewingPast
}) => {
  const { t } = useTranslation();
  const treeContainerRef = useRef<HTMLDivElement>(null);
  
  // Use props if provided, otherwise use current state
  const isViewingPast = propsIsViewingPast ?? useSelector((state: RootState) => state.history?.isViewingPast || false);
  
  const {
    treeData: hookTreeData,
    treeExpandedKeys,
    treeScrollPosition,
    selectedNodeKey: hookSelectedNodeKey,
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
  
  // Use props if provided (for historical data), otherwise use hook data
  const treeData = propsTreeData ?? hookTreeData;
  const selectedNodeKey = propsSelectedNodeKey ?? hookSelectedNodeKey;

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
          <Button type="text" onClick={isViewingPast ? undefined : () => addNode(true)} disabled={isViewingPast}>
            <PlusSquareOutlined />
          </Button>
        </Tooltip>
        <Tooltip title={t('Add Child Node')}>
          <Button type="text" onClick={isViewingPast ? undefined : () => addNode(false)} disabled={isViewingPast}>
            <PlusCircleOutlined />
          </Button>
        </Tooltip>
        <Tooltip title={t('Remove Node')}>
          <Button type="text" onClick={isViewingPast ? undefined : onRemoveNodeClick} disabled={isViewingPast}>
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
        draggable={!isViewingPast}
        blockNode
        onDrop={isViewingPast ? undefined : onDrop}
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