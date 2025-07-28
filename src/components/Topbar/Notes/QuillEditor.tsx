import { forwardRef, useCallback, useEffect, useRef } from 'react';
import Quill from 'quill';
import Toolbar from 'quill/modules/toolbar';
import { BlockEmbed } from 'quill/blots/block';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../reduxStoreAndSlices/store';
import { updateNoteData, updateZoomLevel, updateEditorState, EditorState } from '../../../reduxStoreAndSlices/notesSlice';
import { cdate } from 'cdate';
import { StyledQuillContainer } from './NotesStyles';
import { useTranslation } from 'react-i18next';
import './quill.css';

interface QuillKeyboardContext {
  quill: Quill;
}

interface QuillKeyboardModule {
  addBinding: (binding: {
    key: string;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    handler: () => void;
  }) => void;
}

class DividerBlot extends BlockEmbed {
  static blotName = 'divider';
  static tagName = 'hr';
}
Quill.register(DividerBlot, true)

const toolbarOptions = [
  [
    { header: [1, 2, 3, false] },
    { size: [false, 'large', 'huge'] },
    'bold', 'italic', 'underline', 'strike', 'blockquote', 'code', 'code-block',
    { indent: '-1' }, { indent: '+1' }, { list: 'bullet' }, { list: 'check' },
    'link',
    { align: [] }, { color: [] }, { background: [] },
    'clean',
    'divider'
  ]
];

const keyboardBindings = {
  'header1': {
    key: '1',
    ctrlKey: true,
    handler: function (this: QuillKeyboardContext) {
      this.quill.format('header', 1);
    }
  },
  'header2': {
    key: '2',
    ctrlKey: true,
    handler: function (this: QuillKeyboardContext) {
      this.quill.format('header', 2);
    }
  },
  'header3': {
    key: '3',
    ctrlKey: true,
    handler: function (this: QuillKeyboardContext) {
      this.quill.format('header', 3);
    }
  },
  'removeHeader': {
    key: '0',
    ctrlKey: true,
    handler: function (this: QuillKeyboardContext) {
      this.quill.format('header', false);
    }
  },
  'insertDivider': {
    key: 'h',
    ctrlKey: true,
    handler: function (this: QuillKeyboardContext) {
      const range = this.quill.getSelection();
      if (range) {
        this.quill.insertText(range.index, '\n');
        this.quill.insertEmbed(range.index + 1, 'divider', true);
        this.quill.setSelection(range.index + 2);
      }
    }
  },
  'removeFormatting': {
    key: ':',
    ctrlKey: true,
    handler: function (this: QuillKeyboardContext) {
      const range = this.quill.getSelection();
      if (range) {
        this.quill.removeFormat(range.index, range.length);
      }
    }
  }
};

interface QuillEditorProps {
  readOnly: boolean;
  selectedNodeKey: string;
  addNode: (sameLevel?: boolean, title?: string, content?: string) => void;
}

const QuillEditor = forwardRef<Quill, QuillEditorProps>(({ readOnly, selectedNodeKey, addNode }, ref) => {
  const dispatch = useDispatch();
  const noteData = useSelector((state: RootState) => state.notes.noteData);
  const zoomLevel = useSelector((state: RootState) => state.notes.zoomLevel);
  const editorStates = useSelector((state: RootState) => state.notes.editorStates);
  const dateFormat = useSelector((state: RootState) => state.wbsData.dateFormat);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Quill | null>(null);
  const readOnlyRef = useRef(readOnly);
  const { t } = useTranslation();

  const formatDate = useCallback((date: Date, format: string): string => {
    const cd = cdate(date);
    const cdateFormat = format
      .replace(/yyyy/g, 'YYYY')
      .replace(/yy/g, 'YY')
      .replace(/MM/g, 'MM')
      .replace(/M/g, 'M')
      .replace(/dd/g, 'DD')
      .replace(/d/g, 'D');

    return cd.format(cdateFormat);
  }, []);

  const getCurrentDate = useCallback((): string => {
    return formatDate(new Date(), dateFormat);
  }, [formatDate, dateFormat]);

  const getCurrentTime = useCallback((): string => {
    return formatDate(new Date(), 'HH:mm');
  }, [formatDate]);

  const getCurrentDateTime = useCallback((): string => {
    const date = getCurrentDate();
    const time = getCurrentTime();
    return `${date} ${time}`;
  }, [getCurrentDate, getCurrentTime]);

  const updateZoomButtonStates = useCallback(() => {
    const zoomInBtn = document.querySelector('.ql-zoom-in') as HTMLButtonElement;
    const zoomOutBtn = document.querySelector('.ql-zoom-out') as HTMLButtonElement;
    const resetBtn = document.querySelector('.ql-zoom-reset') as HTMLButtonElement;
    
    if (zoomInBtn) zoomInBtn.disabled = zoomLevel >= 2;
    if (zoomOutBtn) zoomOutBtn.disabled = zoomLevel <= 0.5;
    if (resetBtn) resetBtn.disabled = zoomLevel === 1;
  }, [zoomLevel]);

  const handleZoomIn = useCallback(() => {
    const currentSelection = editorRef.current?.getSelection();
    const scrollContainer = editorContainerRef.current?.querySelector('.ql-editor') as HTMLElement;
    const scrollTop = scrollContainer?.scrollTop || 0;

    const newZoomLevel = Math.min(zoomLevel + 0.1, 2);
    dispatch(updateZoomLevel(newZoomLevel));

    setTimeout(() => {
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollTop;
      }
      if (currentSelection && editorRef.current) {
        editorRef.current.setSelection(currentSelection);
      }
    }, 10);
  }, [dispatch, zoomLevel]);

  const handleZoomOut = useCallback(() => {
    const currentSelection = editorRef.current?.getSelection();
    const scrollContainer = editorContainerRef.current?.querySelector('.ql-editor') as HTMLElement;
    const scrollTop = scrollContainer?.scrollTop || 0;

    const newZoomLevel = Math.max(zoomLevel - 0.1, 0.5);
    dispatch(updateZoomLevel(newZoomLevel));

    setTimeout(() => {
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollTop;
      }
      if (currentSelection && editorRef.current) {
        editorRef.current.setSelection(currentSelection);
      }
    }, 10);
  }, [dispatch, zoomLevel]);

  const handleZoomReset = useCallback(() => {
    const currentSelection = editorRef.current?.getSelection();
    const scrollContainer = editorContainerRef.current?.querySelector('.ql-editor') as HTMLElement;
    const scrollTop = scrollContainer?.scrollTop || 0;

    dispatch(updateZoomLevel(1));

    setTimeout(() => {
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollTop;
      }
      if (currentSelection && editorRef.current) {
        editorRef.current.setSelection(currentSelection);
      }
    }, 10);
  }, [dispatch]);

  const saveEditorState = useCallback(() => {
    if (selectedNodeKey && editorRef.current) {
      const selection = editorRef.current.getSelection();
      const scrollContainer = editorContainerRef.current?.querySelector('.ql-editor') as HTMLElement;
      const scrollPosition = scrollContainer?.scrollTop || 0;
      
      const editorState: EditorState = {
        cursorPosition: selection?.index,
        scrollPosition
      };
      
      dispatch(updateEditorState({ key: selectedNodeKey, editorState }));
    }
  }, [selectedNodeKey, dispatch]);

  const handleContentChange = useCallback(() => {
    if (selectedNodeKey && editorRef.current) {
      const deltaContent = JSON.stringify(editorRef.current.getContents());
      dispatch(updateNoteData({ key: selectedNodeKey, content: deltaContent }));
      saveEditorState();
    } else if (!selectedNodeKey && editorRef.current) {
      const deltaContent = editorRef.current.getContents();
      const isEmpty = deltaContent.ops?.length === 1 &&
        deltaContent.ops[0].insert === '\n' &&
        !deltaContent.ops[0].attributes;
      if (!isEmpty) {
        addNode(false, '', JSON.stringify(deltaContent));
      }
    }
    if (!editorRef.current?.hasFocus()) {
      editorRef.current?.focus();
      editorRef.current?.setSelection(2000);
    }
  }, [addNode, dispatch, selectedNodeKey, saveEditorState]);

  const handleSelectionChange = useCallback(() => {
    saveEditorState();
  }, [saveEditorState]);

  const handleScrollChange = useCallback(() => {
    saveEditorState();
  }, [saveEditorState]);

  const addToolbarTooltips = useCallback(() => {
    setTimeout(() => {
      const toolbar = document.querySelector('.ql-toolbar');
      if (!toolbar) return;

      const tooltipMap: { [key: string]: string } = {
        '.ql-header': t('Heading') + ' (Ctrl+1/2/3/0)',
        '.ql-size': t('Font Size'),
        '.ql-bold': t('Bold') + ' (Ctrl+b)',
        '.ql-italic': t('Italic') + ' (Ctrl+i)',
        '.ql-underline': t('Underline') + ' (Ctrl+u)',
        '.ql-strike': t('Strikethrough'),
        '.ql-blockquote': t('Blockquote'),
        '.ql-code': t('Inline Code'),
        '.ql-code-block': t('Code Block'),
        '.ql-indent[value="-1"]': t('Decrease Indent'),
        '.ql-indent[value="+1"]': t('Increase Indent'),
        '.ql-list[value="bullet"]': t('Bullet List'),
        '.ql-list[value="check"]': t('Checklist'),
        '.ql-link': t('Insert Link'),
        '.ql-align': t('Text Align'),
        '.ql-color': t('Text Color'),
        '.ql-background': t('Background Color'),
        '.ql-clean': t('Remove Formatting') + ' (Ctrl+:)',
        '.ql-divider': t('Insert Divider') + ' (Ctrl+h)'
      };

      Object.entries(tooltipMap).forEach(([selector, tooltip]) => {
        const element = toolbar.querySelector(selector) as HTMLElement;
        if (element && !element.getAttribute('title')) {
          element.setAttribute('title', tooltip);
        }
      });
    }, 100);
  }, [t]);

  useEffect(() => {
    const editorContainer = editorContainerRef.current;
    if (!editorContainer) return;
    const editor = new Quill(editorContainer, {
      theme: 'snow',
      modules: {
        toolbar: toolbarOptions,
        keyboard: {
          bindings: keyboardBindings
        }
      },
    });
    if (typeof ref === 'function') {
      ref(editor);
    } else if (ref) {
      ref.current = editor;
    }
    editorRef.current = editor;
    editor.enable(!readOnlyRef.current);
    editor.on('text-change', handleContentChange);
    editor.on('selection-change', handleSelectionChange);

    // Add scroll event listener
    const editorElement = editorContainer.querySelector('.ql-editor');
    if (editorElement) {
      editorElement.addEventListener('scroll', handleScrollChange);
    }

    const handleCopy = (e: Event) => {
      const clipboardEvent = e as ClipboardEvent;
      const selection = editor.getSelection();
      if (selection && selection.length > 0) {
        const plainText = editor.getText(selection.index, selection.length);
        const lines = plainText.split('\n');
        let convertedText = '';

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
          const line = lines[lineIndex];

          if (lineIndex > 0) {
            convertedText += '\n';
          }

          let lineStartIndex = selection.index;
          for (let i = 0; i < lineIndex; i++) {
            lineStartIndex += lines[i].length + 1;
          }

          const format = editor.getFormat(lineStartIndex, 0);
          const indentLevel = (format.indent as number) || 0;

          if (line.length > 0) {
            const spaces = '    '.repeat(indentLevel);
            convertedText += spaces + line;
          }
        }

        clipboardEvent.clipboardData?.setData('text/plain', convertedText);
        clipboardEvent.preventDefault();
      }
    };

    if (editorElement) {
      editorElement.addEventListener('copy', handleCopy);
    }
    const toolbar = editorRef.current!.getModule('toolbar');
    if (toolbar instanceof Toolbar) {
      toolbar.addHandler('divider', () => {
        const range = editor.getSelection();
        if (range) {
          editor.insertText(range.index, '\n');
          editor.insertEmbed(range.index + 1, 'divider', true);
          editor.setSelection(range.index + 2);
        }
      });
    } else {
      console.error('Toolbar module is not available');
    }
    const keyboard = editor.getModule('keyboard') as QuillKeyboardModule;

    if (keyboard && keyboard.addBinding) {
      keyboard.addBinding({
        key: '/',
        ctrlKey: true,
        handler: () => {
          const range = editor.getSelection();
          if (range) {
            const currentDateTime = getCurrentDateTime();
            editor.insertText(range.index, currentDateTime);
            editor.setSelection(range.index + currentDateTime.length);
          }
        }
      });
    }

    const toolbarElement = editorContainer.previousSibling as HTMLElement;
    if (toolbarElement && toolbarElement.classList.contains('ql-toolbar')) {
      const zoomContainer = document.createElement('div');
      zoomContainer.className = 'ql-zoom-controls';
      zoomContainer.style.cssText = `
        display: inline-flex;
        align-items: center;
        margin-left: 8px;
        border-left: 1px solid #ccc;
        padding-left: 8px;
        gap: 4px;
      `;
      
      // Zoom In ボタン
      const zoomInBtn = document.createElement('button');
      zoomInBtn.type = 'button';
      zoomInBtn.className = 'ql-zoom-in';
      zoomInBtn.title = t('Zoom In');
      zoomInBtn.innerHTML = '<span style="font-size: 16px;">+</span>';
      zoomInBtn.style.cssText = `
        padding: 2px 4px;
        min-width: 24px;
        height: 24px;
        border: none;
        background: none;
        cursor: pointer;
        border-radius: 3px;
      `;
      zoomInBtn.addEventListener('mouseover', () => zoomInBtn.style.background = '#f0f0f0');
      zoomInBtn.addEventListener('mouseout', () => zoomInBtn.style.background = 'none');
      zoomInBtn.addEventListener('click', handleZoomIn);

      // Zoom Out ボタン
      const zoomOutBtn = document.createElement('button');
      zoomOutBtn.type = 'button';
      zoomOutBtn.className = 'ql-zoom-out';
      zoomOutBtn.title = t('Zoom Out');
      zoomOutBtn.innerHTML = '<span style="font-size: 16px;">-</span>';
      zoomOutBtn.style.cssText = `
        padding: 2px 4px;
        min-width: 24px;
        height: 24px;
        border: none;
        background: none;
        cursor: pointer;
        border-radius: 3px;
      `;
      zoomOutBtn.addEventListener('mouseover', () => zoomOutBtn.style.background = '#f0f0f0');
      zoomOutBtn.addEventListener('mouseout', () => zoomOutBtn.style.background = 'none');
      zoomOutBtn.addEventListener('click', handleZoomOut);

      // Reset ボタン
      const resetBtn = document.createElement('button');
      resetBtn.type = 'button';
      resetBtn.className = 'ql-zoom-reset';
      resetBtn.title = t('Reset Zoom');
      resetBtn.innerHTML = '<span style="font-size: 12px;">100%</span>';
      resetBtn.style.cssText = `
        padding: 2px 4px;
        min-width: 36px;
        height: 24px;
        border: none;
        background: none;
        cursor: pointer;
        border-radius: 3px;
      `;
      resetBtn.addEventListener('mouseover', () => resetBtn.style.background = '#f0f0f0');
      resetBtn.addEventListener('mouseout', () => resetBtn.style.background = 'none');
      resetBtn.addEventListener('click', handleZoomReset);

      zoomContainer.appendChild(zoomInBtn);
      zoomContainer.appendChild(zoomOutBtn);
      zoomContainer.appendChild(resetBtn);
      toolbarElement.appendChild(zoomContainer);
    }

    addToolbarTooltips();
    return () => {
      editor.off('text-change', handleContentChange);
      editor.off('selection-change', handleSelectionChange);

      const editorElement = editorContainer.querySelector('.ql-editor');
      if (editorElement) {
        editorElement.removeEventListener('copy', handleCopy);
        editorElement.removeEventListener('scroll', handleScrollChange);
      }

      if (editorContainer) {
        const toolbarElement = document.querySelector('.ql-toolbar');
        if (toolbarElement && editorContainer.parentNode) {
          editorContainer.parentNode.removeChild(toolbarElement);
        }
      }
      editorRef.current = null;
    };
  }, [handleContentChange, handleSelectionChange, handleScrollChange, ref, addToolbarTooltips, getCurrentDate, getCurrentTime, getCurrentDateTime]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.enable(!readOnly);
      readOnlyRef.current = readOnly;
    }
  }, [readOnly]);

  useEffect(() => {
    if (editorRef.current) {
      const content = noteData[selectedNodeKey];
      if (content) {
        try {
          const deltaContent = JSON.parse(content);
          editorRef.current.setContents(deltaContent);
        } catch {
          const delta = editorRef.current.clipboard.convert({ html: content });
          editorRef.current.setContents(delta);
        }
      } else {
        editorRef.current.setContents([{ insert: '\n' }]);
      }
      editorRef.current.history.clear();

      // Restore editor state
      const editorState = editorStates[selectedNodeKey];
      if (editorState) {
        // Restore cursor position
        if (editorState.cursorPosition !== undefined) {
          setTimeout(() => {
            editorRef.current?.setSelection(editorState.cursorPosition!, 0);
          }, 10);
        }
        
        // Restore scroll position
        if (editorState.scrollPosition !== undefined) {
          setTimeout(() => {
            const scrollContainer = editorContainerRef.current?.querySelector('.ql-editor') as HTMLElement;
            if (scrollContainer) {
              scrollContainer.scrollTop = editorState.scrollPosition!;
            }
          }, 10);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeKey]);

  useEffect(() => {
    updateZoomButtonStates();
  }, [zoomLevel, updateZoomButtonStates]);

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <style>
        {`
          .ql-editor {
            font-size: ${zoomLevel}rem !important;
          }
          .ql-editor h1 {
            font-size: ${zoomLevel * 1.5}rem !important;
          }
          .ql-editor h2 {
            font-size: ${zoomLevel * 1.1}rem !important;
          }
          .ql-editor h3 {
            font-size: ${zoomLevel * 0.9}rem !important;
          }
          
          /* チェックボックスのスタイル改善 */
          .ql-editor li[data-list="checked"],
          .ql-editor li[data-list="unchecked"] {
            position: relative;
            padding-left: 2em;
            line-height: 1.6;
            margin-top: 0.2em;
            margin-bottom: 0.2em;
          }
          
          /* 元のチェックボックスを透明にしてクリック可能にする */
          .ql-editor li[data-list="checked"] > .ql-ui,
          .ql-editor li[data-list="unchecked"] > .ql-ui {
            position: absolute;
            left: 0.3em;
            width: 1.2em;
            height: 1.2em;
            opacity: 0;
            cursor: pointer;
            z-index: 2;
          }
          
          /* カスタムチェックボックスを疑似要素で作成 */
          .ql-editor li[data-list="checked"]::before,
          .ql-editor li[data-list="unchecked"]::before {
            content: '';
            position: absolute;
            top: 0.1em;
            left: 0.3em;
            width: 1.0em;
            height: 1.0em;
            border: 2px solid #4a90e2;
            border-radius: 3px;
            background: white;
            transition: all 0.2s ease;
            display: inline-block;
            z-index: 1;
          }
          
          .ql-editor li[data-list="checked"]:hover::before,
          .ql-editor li[data-list="unchecked"]:hover::before {
            border-color: #357abd;
            box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
          }
          
          .ql-editor li[data-list="checked"]::before {
            background: #4a90e2;
            border-color: #4a90e2;
          }
          
          .ql-editor li[data-list="checked"]::after {
            content: '✔';
            position: absolute;
            top: 0.3em;
            left: 0.45em;
            color: white;
            font-weight: bold;
            pointer-events: none;
            z-index: 3;
            line-height: 1;
            text-align: center;
            width: 1em;
            height: 1em;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .ql-editor li[data-list="checked"] {
            text-decoration: line-through;
            color: #aaaaaa;
          }
          
          .ql-editor li[data-list="unchecked"]::before {
            background: white;
          }
        `}
      </style>
      <StyledQuillContainer
        ref={editorContainerRef}
        style={{
          overflow: 'auto',
          height: '100%'
        }}
      />
    </div>
  );
});

export default QuillEditor;