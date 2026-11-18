// useNotesTree.ts
import { Key, useCallback, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../../reduxStoreAndSlices/store';
import { 
  addTreeNode, 
  removeTreeNode, 
  updateTreeDataOnDrop, 
  updateTreeExpandedKeys, 
  updateTreeScrollPosition, 
  setSelectedNodeKey,
  ExtendedTreeDataNode
} from '../../../../reduxStoreAndSlices/notesSlice';
import type { NodeDragEventParams } from 'rc-tree/lib/contextTypes';
import { DataNode, EventDataNode } from 'antd/es/tree';
import { useTranslation } from 'react-i18next';

export const useNotesTree = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  
  const treeData = useSelector((state: RootState) => state.notes.treeData);
  const treeExpandedKeys = useSelector((state: RootState) => state.notes.treeExpandedKeys);
  const treeScrollPosition = useSelector((state: RootState) => state.notes.treeScrollPosition);
  const selectedNodeKey = useSelector((state: RootState) => state.notes.selectedNodeKey);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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
    const nodeKey = info.node.key.toString();
    dispatch(setSelectedNodeKey(nodeKey));
  }, [dispatch]);

  const addNode = useCallback((sameLevel = false, title?: string, content?: string) => {
    const newKey = Math.random().toString(36).substring(2, 11);
    const newTitle = title || 'no title';
    dispatch(addTreeNode({ selectedNodeKey, sameLevel, newKey, newTitle, content }));
    dispatch(setSelectedNodeKey(newKey));
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
    setDeleteDialogOpen(false);
  }, [dispatch, selectedNodeKey, t]);

  const handleCancelDelete = useCallback(() => {
    setDeleteDialogOpen(false);
  }, []);

  const onExpand = useCallback((expandedKeys: Key[]) => {
    dispatch(updateTreeExpandedKeys(expandedKeys));
  }, [dispatch]);

  const handleTreeScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    dispatch(updateTreeScrollPosition(scrollTop));
  }, [dispatch]);

  return {
    // State
    treeData,
    treeExpandedKeys,
    treeScrollPosition,
    selectedNodeKey,
    deleteDialogOpen,
    
    // Actions
    onDrop,
    onSelect,
    addNode,
    onRemoveNodeClick,
    handleConfirmDelete,
    handleCancelDelete,
    onExpand,
    handleTreeScroll,
    
    // Dialog control
    setDeleteDialogOpen
  };
};