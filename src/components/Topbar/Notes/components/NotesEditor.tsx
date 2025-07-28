// NotesEditor.tsx
import React, { memo, useRef, useState, useEffect } from 'react';
import QuillEditor from '../QuillEditor';
import NotesTitle from './NotesTitle';
import { useNotesTree } from '../hooks/useNotesTree';

interface NotesEditorProps {
  noteWidth: number;
  noteHeight: number;
  treeWidth: number;
  resizeAnimate: boolean;
  activeModal: string | null;
}

const NotesEditor: React.FC<NotesEditorProps> = memo(({ 
  noteWidth, 
  noteHeight, 
  treeWidth, 
  resizeAnimate,
  activeModal
}) => {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarHeight, setToolbarHeight] = useState(0);
  const { selectedNodeKey, addNode } = useNotesTree();

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
      <NotesTitle selectedNodeKey={selectedNodeKey} addNode={addNode} />
      <div 
        ref={toolbarRef} 
        style={{ 
          height: `${noteHeight - 35 - toolbarHeight}px`, 
          width: `${noteWidth - treeWidth - 15}px`, 
          transition: resizeAnimate ? 'width 0.2s ease-in-out' : 'none' 
        }}
      >
        <QuillEditor
          readOnly={false}
          selectedNodeKey={selectedNodeKey}
          addNode={addNode}
        />
      </div>
    </div>
  );
});

export default NotesEditor;