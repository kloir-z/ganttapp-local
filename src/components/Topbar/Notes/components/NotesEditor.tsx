// NotesEditor.tsx
import React, { memo, useRef, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../reduxStoreAndSlices/store';
import QuillEditor from '../QuillEditor';
import NotesTitle from './NotesTitle';
import { useNotesTree } from '../hooks/useNotesTree';

interface NotesEditorProps {
  noteWidth: number;
  noteHeight: number;
  treeWidth: number;
  resizeAnimate: boolean;
  activeModal: string | null;
  selectedNodeKey?: string;
  noteData?: any;
  isViewingPast?: boolean;
}

const NotesEditor: React.FC<NotesEditorProps> = memo(({ 
  noteWidth, 
  noteHeight, 
  treeWidth, 
  resizeAnimate,
  activeModal,
  selectedNodeKey: propsSelectedNodeKey,
  noteData: propsNoteData,
  isViewingPast: propsIsViewingPast
}) => {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarHeight, setToolbarHeight] = useState(0);
  const { selectedNodeKey: hookSelectedNodeKey, addNode } = useNotesTree();
  
  // Use props if provided (for historical data), otherwise use hook data
  const selectedNodeKey = propsSelectedNodeKey ?? hookSelectedNodeKey;
  const isViewingPast = propsIsViewingPast ?? useSelector((state: RootState) => state.history?.isViewingPast || false);

  useEffect(() => {
    if (toolbarRef.current) {
      const targetDiv = toolbarRef.current.querySelector('.ql-toolbar');
      if (targetDiv) {
        setToolbarHeight(targetDiv.clientHeight);
      }
    }
  }, [noteHeight, noteWidth, treeWidth, toolbarHeight, activeModal]);

  useEffect(() => {
    setTimeout(() => {
      if (toolbarRef.current) {
        const targetDiv = toolbarRef.current.querySelector('.ql-toolbar');
        if (targetDiv) {
          setToolbarHeight(targetDiv.clientHeight);
        }
      }
    }, 210);
  }, [resizeAnimate]);

  return (
    <div>
      <NotesTitle selectedNodeKey={selectedNodeKey} addNode={addNode} isViewingPast={isViewingPast} />
      <div 
        ref={toolbarRef} 
        style={{ 
          height: `${noteHeight - 35 - toolbarHeight}px`, 
          width: `${noteWidth - treeWidth - 15}px`, 
          transition: resizeAnimate ? 'width 0.2s ease-in-out' : 'none' 
        }}
      >
        <QuillEditor
          readOnly={isViewingPast}
          selectedNodeKey={selectedNodeKey}
          addNode={addNode}
          noteData={propsNoteData}
        />
      </div>
    </div>
  );
});

export default NotesEditor;