// NotesEditor.tsx
import React, { memo, useCallback } from 'react';
import { Input } from 'antd';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { RootState } from '../../../../reduxStoreAndSlices/store';
import { updateRowNoteData, deleteRowNoteData } from '../../../../reduxStoreAndSlices/notesSlice';
import QuillEditor from '../QuillEditor';
import NotesTitle from './NotesTitle';
import { useNotesTree } from '../hooks/useNotesTree';
import { isEmptyRowNote } from '../../../../utils/rowNoteUtils';

interface NotesEditorProps {
  noteWidth: number;
  noteHeight: number;
  treeWidth: number;
  resizeAnimate: boolean;
  activeModal: string | null;
  selectedNodeKey?: string;
  noteData?: any;
  isViewingPast?: boolean;
  // When set, the editor is in "row note" mode: it edits the note attached to a
  // WBS row (rowNoteData) instead of a tree node.
  selectedRowNoteId?: string;
  rowNoteData?: { [rowId: string]: string };
}

const noop = () => {};

const NotesEditor: React.FC<NotesEditorProps> = memo(({
  noteWidth,
  noteHeight,
  treeWidth,
  resizeAnimate,
  selectedNodeKey: propsSelectedNodeKey,
  noteData: propsNoteData,
  isViewingPast: propsIsViewingPast,
  selectedRowNoteId,
  rowNoteData,
}) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { selectedNodeKey: hookSelectedNodeKey, addNode } = useNotesTree();

  // Use props if provided (for historical data), otherwise use hook data
  const selectedNodeKey = propsSelectedNodeKey ?? hookSelectedNodeKey;
  const isViewingPast = propsIsViewingPast ?? useSelector((state: RootState) => state.history?.isViewingPast || false);

  const isRowMode = !!selectedRowNoteId;
  const rowDisplayName = useSelector((state: RootState) =>
    selectedRowNoteId ? (state.wbsData.data[selectedRowNoteId]?.displayName ?? '') : ''
  );
  const rowNo = useSelector((state: RootState) =>
    selectedRowNoteId ? state.wbsData.data[selectedRowNoteId]?.no : undefined
  );
  const rowTitle = `${rowNo !== undefined ? `No.${rowNo}  ` : ''}${rowDisplayName || t('(Untitled row)')}`;

  const handleRowSave = useCallback((key: string, content: string) => {
    if (isEmptyRowNote(content)) {
      dispatch(deleteRowNoteData(key));
    } else {
      dispatch(updateRowNoteData({ rowId: key, content }));
    }
  }, [dispatch]);

  return (
    <div>
      {isRowMode ? (
        <Input
          variant="outlined"
          value={rowTitle}
          readOnly
          disabled
          style={{ minHeight: '35px' }}
        />
      ) : (
        <NotesTitle selectedNodeKey={selectedNodeKey} addNode={addNode} isViewingPast={isViewingPast} />
      )}
      <div
        style={{
          height: `${noteHeight - 35}px`,
          width: `${noteWidth - treeWidth - 15}px`,
          display: 'flex',
          flexDirection: 'column',
          transition: resizeAnimate ? 'width 0.2s ease-in-out' : 'none',
        }}
      >
        {isRowMode ? (
          <QuillEditor
            key="row-editor"
            readOnly={isViewingPast}
            selectedNodeKey={selectedRowNoteId as string}
            addNode={noop}
            noteData={rowNoteData}
            onSave={handleRowSave}
          />
        ) : (
          <QuillEditor
            key="tree-editor"
            readOnly={isViewingPast}
            selectedNodeKey={selectedNodeKey}
            addNode={addNode}
            noteData={propsNoteData}
          />
        )}
      </div>
    </div>
  );
});

export default NotesEditor;
