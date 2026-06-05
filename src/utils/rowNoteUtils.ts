// Shared helpers for per-row notes (rowNoteData).

// A Quill Delta serialized to JSON is "empty" when it holds nothing but the
// trailing newline that Quill always keeps. Such content must not count as a
// note (no indicator) nor mark the project dirty when an editor is merely opened.
export const isEmptyRowNote = (content?: string): boolean => {
  if (!content) return true;
  try {
    const delta = JSON.parse(content);
    return (
      Array.isArray(delta.ops) &&
      delta.ops.length === 1 &&
      delta.ops[0].insert === '\n' &&
      !delta.ops[0].attributes
    );
  } catch {
    return false;
  }
};
