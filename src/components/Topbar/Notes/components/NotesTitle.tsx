// NotesTitle.tsx
import React, { memo, useState, useCallback, useEffect } from 'react';
import { Input, Tooltip } from 'antd';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../../reduxStoreAndSlices/store';
import { updateTreeNodeTitle } from '../../../../reduxStoreAndSlices/notesSlice';
import { useTranslation } from 'react-i18next';
import { findNodeByKey, formatToLocalDateTime } from '../NoteUtils';

interface NotesTitleProps {
  selectedNodeKey: string;
  addNode: (sameLevel?: boolean, title?: string, content?: string) => void;
  isViewingPast: boolean;
}

const NotesTitle: React.FC<NotesTitleProps> = memo(({ selectedNodeKey, addNode, isViewingPast }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const treeData = useSelector((state: RootState) => state.notes.treeData);
  const [selectedNodeTitle, setSelectedNodeTitle] = useState<string>('');
  
  const selectedNode = findNodeByKey(treeData, selectedNodeKey);

  const handleTitleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = event.target.value;
    setSelectedNodeTitle(newTitle);
    if (selectedNodeKey) {
      dispatch(updateTreeNodeTitle({ key: selectedNodeKey, title: newTitle }));
    } else {
      addNode(false, newTitle, '');
    }
  }, [addNode, dispatch, selectedNodeKey]);

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
    <Tooltip
      title={selectedNode ? (
        <>
          <div>{t('Created')}: {formatToLocalDateTime(selectedNode.createdAt)}</div>
          <div>{t('Updated')}: {formatToLocalDateTime(selectedNode.updatedAt)}</div>
        </>
      ) : ''}
      placement="topLeft"
    >
      <Input 
        variant="outlined" 
        value={selectedNodeTitle} 
        onChange={isViewingPast ? undefined : handleTitleChange} 
        placeholder={t('Title') + '...'} 
        style={{ minHeight: '35px' }} 
        disabled={isViewingPast}
        readOnly={isViewingPast}
      />
    </Tooltip>
  );
});

export default NotesTitle;