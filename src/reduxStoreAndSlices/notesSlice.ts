// notesSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DataNode } from 'antd/es/tree';
import { cdate } from 'cdate';

export interface ExtendedTreeDataNode extends DataNode {
  key: React.Key;
  title?: React.ReactNode | ((data: DataNode) => React.ReactNode);
  children?: ExtendedTreeDataNode[];
  createdAt?: string;
  updatedAt?: string;
}

export type noteData = {
  [key: string]: string;
}

export interface NotesModalState {
  treeWidth: number;
  noteWidth: number;
  noteHeight: number;
  position: { x: number; y: number };
}

export interface EditorState {
  cursorPosition?: number;
  scrollPosition?: number;
}

interface NotesState {
  treeData: ExtendedTreeDataNode[];
  noteData: noteData;
  modalState: NotesModalState;
  isSavedChanges: boolean;
  zoomLevel: number;
  treeExpandedKeys: React.Key[];
  treeScrollPosition: number;
  editorStates: { [key: string]: EditorState };
  selectedNodeKey: string;
}

const initialState: NotesState = {
  treeData: [],
  noteData: {},
  modalState: {
    treeWidth: 300,
    noteWidth: 1000,
    noteHeight: 400,
    position: { x: 250, y: 50 }
  },
  isSavedChanges: true,
  zoomLevel: 1,
  treeExpandedKeys: [],
  treeScrollPosition: 0,
  editorStates: {},
  selectedNodeKey: '',
};

const notesSlice = createSlice({
  name: 'notes',
  initialState,
  reducers: {
    updateNoteData: (state, action: PayloadAction<{ key: string; content: string }>) => {
      const { key, content } = action.payload;
      if (state.noteData[key] !== content) {
        state.noteData[key] = content;
        const findAndUpdateNode = (nodes: ExtendedTreeDataNode[]) => {
          for (const node of nodes) {
            if (node.key === key) {
              node.updatedAt = cdate().format();
              return;
            }
            if (node.children) {
              findAndUpdateNode(node.children);
            }
          }
        };
        findAndUpdateNode(state.treeData);
        state.isSavedChanges = false;
      }
    },
    addNoteData: (state, action: PayloadAction<{ key: string; content: string }>) => {
      const { key, content } = action.payload;
      state.noteData[key] = content;
      state.isSavedChanges = false;
    },
    deleteNoteData: (state, action: PayloadAction<string>) => {
      const key = action.payload;
      delete state.noteData[key];
      state.isSavedChanges = false;
    },
    updateTreeNodeTitle: (state, action: PayloadAction<{ key: string; title: string }>) => {
      const { key, title } = action.payload;
      const findAndUpdateNode = (nodes: ExtendedTreeDataNode[]) => {
        for (const node of nodes) {
          if (node.key === key) {
            node.title = title;
            node.updatedAt = cdate().format()
            return;
          }
          if (node.children) {
            findAndUpdateNode(node.children);
          }
        }
      };
      findAndUpdateNode(state.treeData);
      state.isSavedChanges = false;
    },
    addTreeNode: (state, action: PayloadAction<{ selectedNodeKey: string; sameLevel: boolean; newKey: string; newTitle: string; content?: string }>) => {
      const { selectedNodeKey, sameLevel, newKey, newTitle, content } = action.payload;
      state.noteData[newKey] = content || '';
      const newDate = cdate().format();
      const newNode = {
        key: newKey,
        title: newTitle,
        createdAt: newDate,
        updatedAt: newDate,
        children: []
      };
      if (selectedNodeKey === '') {
        state.treeData.push(newNode);
        return;
      }
      const findNodeLevel = (nodes: ExtendedTreeDataNode[], key: string, level: number = 1): number => {
        for (const node of nodes) {
          if (node.key === key) {
            return level;
          }
          if (node.children) {
            const childLevel = findNodeLevel(node.children, key, level + 1);
            if (childLevel !== -1) {
              return childLevel;
            }
          }
        }
        return -1;
      };
      const selectedNodeLevel = findNodeLevel(state.treeData, selectedNodeKey);
      const findAndAddNode = (nodes: ExtendedTreeDataNode[], parent?: ExtendedTreeDataNode) => {
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].key === selectedNodeKey) {
            if (sameLevel && parent) {
              parent.children = parent.children || [];
              parent.children.splice(i + 1, 0, newNode);
            } else {
              nodes[i].children = nodes[i].children || [];
              nodes[i].children?.unshift(newNode);
            }
            return;
          }
          if (nodes[i].children) {
            findAndAddNode(nodes[i].children!, nodes[i]);
          }
        }
      };
      if (selectedNodeLevel === 1 && sameLevel) {
        const selectedNodeIndex = state.treeData.findIndex(node => node.key === selectedNodeKey);
        state.treeData.splice(selectedNodeIndex + 1, 0, newNode);
      } else {
        findAndAddNode(state.treeData);
      }
      state.isSavedChanges = false;
    },
    removeTreeNode: (state, action: PayloadAction<string>) => {
      const key = action.payload;
      const findAndRemoveNode = (nodes: ExtendedTreeDataNode[]) => {
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].key === key) {
            const removeRelatedData = (node: ExtendedTreeDataNode) => {
              delete state.noteData[node.key.toString()];
              delete state.editorStates[node.key.toString()];
              if (node.children) {
                node.children.forEach(removeRelatedData);
              }
            };
            removeRelatedData(nodes[i]);
            nodes.splice(i, 1);
            return true;
          }
          if (nodes[i].children) {
            if (findAndRemoveNode(nodes[i].children!)) {
              if (nodes[i].children?.length === 0) {
                delete nodes[i].children;
              }
              return true;
            }
          }
        }
        return false;
      };
      findAndRemoveNode(state.treeData);
      state.isSavedChanges = false;
    },
    updateTreeDataOnDrop: (state, action: PayloadAction<{ dropKey: React.Key; dragKey: React.Key; dropPosition: number; dropToGap: boolean }>) => {
      const { dropKey, dragKey, dropPosition, dropToGap } = action.payload;
      const dropPos = dropKey.toString().split('-');
      const dropIndex = dropPosition - Number(dropPos[dropPos.length - 1]);
      let dragObj: ExtendedTreeDataNode | undefined;
      const findAndUpdateNode = (nodes: ExtendedTreeDataNode[]) => {
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].key === dragKey) {
            dragObj = nodes[i];
            nodes.splice(i, 1);
            return;
          }
          if (nodes[i].children) {
            findAndUpdateNode(nodes[i].children!);
          }
        }
      };
      findAndUpdateNode(state.treeData);
      if (dragObj) {
        const findAndAddNode = (nodes: ExtendedTreeDataNode[]) => {
          for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].key === dropKey) {
              if (!dropToGap) {
                nodes[i].children = nodes[i].children || [];
                nodes[i].children?.unshift(dragObj!);
              } else {
                if (dropIndex === -1) {
                  nodes.splice(i, 0, dragObj!);
                } else {
                  nodes.splice(i + 1, 0, dragObj!);
                }
              }
              return;
            }
            if (nodes[i].children) {
              findAndAddNode(nodes[i].children!);
            }
          }
        };
        findAndAddNode(state.treeData);
        state.isSavedChanges = false;
      }
    },
    resetNotes: (state) => {
      state.treeData = initialState.treeData;
      state.noteData = initialState.noteData;
      state.modalState = initialState.modalState;
      state.treeExpandedKeys = initialState.treeExpandedKeys;
      state.treeScrollPosition = initialState.treeScrollPosition;
      state.editorStates = initialState.editorStates;
      state.selectedNodeKey = initialState.selectedNodeKey;
      state.isSavedChanges = true;
    },
    setNotes: (state, action: PayloadAction<{ 
      treeData: ExtendedTreeDataNode[]; 
      noteData: noteData; 
      modalState?: NotesModalState;
      treeExpandedKeys?: React.Key[];
      treeScrollPosition?: number;
      editorStates?: { [key: string]: EditorState };
      selectedNodeKey?: string;
    }>) => {
      const { treeData, noteData, modalState, treeExpandedKeys, treeScrollPosition, editorStates, selectedNodeKey } = action.payload;
      state.treeData = treeData;
      state.noteData = noteData;
      if (modalState) {
        state.modalState = modalState;
      }
      if (treeExpandedKeys !== undefined) {
        state.treeExpandedKeys = treeExpandedKeys;
      }
      if (treeScrollPosition !== undefined) {
        state.treeScrollPosition = treeScrollPosition;
      }
      if (editorStates !== undefined) {
        state.editorStates = editorStates;
      }
      if (selectedNodeKey !== undefined) {
        state.selectedNodeKey = selectedNodeKey;
      }
    },
    setIsSavedChangesNotes(state, action: PayloadAction<boolean>) {
      state.isSavedChanges = action.payload;
    },
    updateNotesModalState: (state, action: PayloadAction<Partial<NotesModalState>>) => {
      state.modalState = { ...state.modalState, ...action.payload };
      state.isSavedChanges = false;
    },
    setNotesModalState: (state, action: PayloadAction<NotesModalState>) => {
      state.modalState = action.payload;
      state.isSavedChanges = false;
    },
    updateZoomLevel: (state, action: PayloadAction<number>) => {
      state.zoomLevel = action.payload;
      state.isSavedChanges = false;
    },
    updateTreeExpandedKeys: (state, action: PayloadAction<React.Key[]>) => {
      state.treeExpandedKeys = action.payload;
      state.isSavedChanges = false;
    },
    updateTreeScrollPosition: (state, action: PayloadAction<number>) => {
      state.treeScrollPosition = action.payload;
      state.isSavedChanges = false;
    },
    updateEditorState: (state, action: PayloadAction<{ key: string; editorState: EditorState }>) => {
      const { key, editorState } = action.payload;
      state.editorStates[key] = { ...state.editorStates[key], ...editorState };
      state.isSavedChanges = false;
    },
    deleteEditorState: (state, action: PayloadAction<string>) => {
      const key = action.payload;
      delete state.editorStates[key];
      state.isSavedChanges = false;
    },
    setSelectedNodeKey: (state, action: PayloadAction<string>) => {
      state.selectedNodeKey = action.payload;
      state.isSavedChanges = false;
    },
  },
});

export const {
  updateNoteData,
  addNoteData,
  deleteNoteData,
  updateTreeNodeTitle,
  addTreeNode,
  removeTreeNode,
  updateTreeDataOnDrop,
  resetNotes,
  setNotes,
  setIsSavedChangesNotes,
  updateNotesModalState,
  setNotesModalState,
  updateZoomLevel,
  updateTreeExpandedKeys,
  updateTreeScrollPosition,
  updateEditorState,
  deleteEditorState,
  setSelectedNodeKey
} = notesSlice.actions;

export default notesSlice.reducer;