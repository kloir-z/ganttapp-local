// notesDataMigration.ts
import { ExtendedTreeDataNode } from '../../../../reduxStoreAndSlices/notesSlice';
import { cdate } from 'cdate';

/**
 * Migrate legacy note data where treeData is empty but noteData exists
 */
export const migrateLegacyNoteData = (
  treeData: ExtendedTreeDataNode[], 
  noteData: { [key: string]: string },
  selectedNodeKey: string
): ExtendedTreeDataNode[] => {
  // If treeData is not empty, no migration needed
  if (treeData.length > 0) {
    return treeData;
  }

  // If noteData is empty, no migration needed
  const noteKeys = Object.keys(noteData);
  if (noteKeys.length === 0) {
    return treeData;
  }

  // Create tree nodes from existing noteData
  const migratedTreeData: ExtendedTreeDataNode[] = [];
  const currentDate = cdate().format();

  let noteIndex = 1;
  noteKeys.forEach((key) => {
    const content = noteData[key];
    
    try {
      // Skip empty notes (containing only newlines)
      const parsedContent = JSON.parse(content);
      const isEmpty = parsedContent.ops?.length === 1 &&
        parsedContent.ops[0].insert === '\n' &&
        !parsedContent.ops[0].attributes;
      
      if (!isEmpty) {
        // Try to extract meaningful title from content
        let title = `Note ${noteIndex}`;
        if (parsedContent.ops && parsedContent.ops.length > 0) {
          const firstOp = parsedContent.ops[0];
          if (firstOp.insert && typeof firstOp.insert === 'string') {
            const text = firstOp.insert.trim();
            if (text && text !== '\n' && text.length > 0) {
              title = text.length > 30 ? text.substring(0, 30) + '...' : text;
            }
          }
        }
        
        const node: ExtendedTreeDataNode = {
          key,
          title,
          createdAt: currentDate,
          updatedAt: currentDate,
          children: []
        };
        migratedTreeData.push(node);
        noteIndex++;
      }
    } catch (error) {
      // If JSON parsing fails, create a node anyway
      const node: ExtendedTreeDataNode = {
        key,
        title: `Note ${noteIndex}`,
        createdAt: currentDate,
        updatedAt: currentDate,
        children: []
      };
      migratedTreeData.push(node);
      noteIndex++;
    }
  });

  // If selectedNodeKey exists in noteData but not in tree, add it
  if (selectedNodeKey && noteData[selectedNodeKey] && !migratedTreeData.find(node => node.key === selectedNodeKey)) {
    const content = noteData[selectedNodeKey];
    let title = 'no title';
    
    try {
      const parsedContent = JSON.parse(content);
      const isEmpty = parsedContent.ops?.length === 1 &&
        parsedContent.ops[0].insert === '\n' &&
        !parsedContent.ops[0].attributes;
      
      if (!isEmpty && parsedContent.ops && parsedContent.ops.length > 0) {
        const firstOp = parsedContent.ops[0];
        if (firstOp.insert && typeof firstOp.insert === 'string') {
          const text = firstOp.insert.trim();
          if (text && text !== '\n' && text.length > 0) {
            title = text.length > 30 ? text.substring(0, 30) + '...' : text;
          }
        }
      }
    } catch (error) {
      // Keep default 'no title' if parsing fails
    }
    
    const node: ExtendedTreeDataNode = {
      key: selectedNodeKey,
      title,
      createdAt: currentDate,
      updatedAt: currentDate,
      children: []
    };
    migratedTreeData.push(node);
  }

  return migratedTreeData;
};