import { ExtendedTreeDataNode } from "../../../reduxStoreAndSlices/notesSlice";

export function findNodeByKey(nodes: ExtendedTreeDataNode[], key: React.Key | undefined): ExtendedTreeDataNode | undefined {
  for (const node of nodes) {
    if (node.key === key) {
      return node;
    }
    if (node.children) {
      const found = findNodeByKey(node.children, key);
      if (found) {
        return found;
      }
    }
  }
}

export function formatToLocalDateTime(date?: Date | string) {
  if (!date) return 'N/A';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString()}`;
}