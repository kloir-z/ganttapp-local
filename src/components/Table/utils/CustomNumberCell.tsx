// CustomNumberCellTemplate.tsx
import { CellTemplate, Compatible, Uncertain, UncertainCompatible, keyCodes, Cell, isNavigationKey, isAlphaNumericKey } from "@silevis/reactgrid";


export interface CustomNumberCell extends Cell {
  type: 'customNumber';
  text: string;
  value: number;
  columnWidth?: number;
}

export class CustomNumberCellTemplate implements CellTemplate<CustomNumberCell> {
  private wasEscKeyPressed = false;
  getCompatibleCell(uncertainCell: Uncertain<CustomNumberCell>): Compatible<CustomNumberCell> {
    const text = uncertainCell.text || '';
    const value = text.length;
    return { ...uncertainCell, text, value };
  }

  handleKeyDown(
    cell: Compatible<CustomNumberCell>,
    keyCode: number,
    ctrl: boolean,
    _shift: boolean,
    alt: boolean,
    key?: string
  ): { cell: Compatible<CustomNumberCell>; enableEditMode: boolean } {
    if (keyCode === keyCodes.POINTER || keyCode === keyCodes.F2) {
      return { cell, enableEditMode: true };
    }
    // IMEを通さない直接入力(半角英数・記号・スペース等の印字可能な1文字)は、
    // 押した瞬間にその文字で編集開始する。keyCode 229 はIME変換中のキーなので除外し、
    // 日本語などの変換確定は handleCompositionEnd 側に任せる。
    if (key && key.length === 1 && !ctrl && !alt && keyCode !== 229) {
      return { cell: { ...cell, text: key }, enableEditMode: true };
    }
    return { cell, enableEditMode: false };
  }

  // IME(日本語入力モード)でセル選択中に変換確定すると発火する。
  // これを実装しないと、Excelのような「選択状態のまま打ち始めて直接入力」が効かない。
  handleCompositionEnd(
    cell: Compatible<CustomNumberCell>,
    eventData: string
  ): { cell: Compatible<CustomNumberCell>; enableEditMode: boolean } {
    return { cell: this.getCompatibleCell({ ...cell, text: eventData }), enableEditMode: true };
  }

  update(cell: Compatible<CustomNumberCell>, cellToMerge: UncertainCompatible<CustomNumberCell>): Compatible<CustomNumberCell> {
    return this.getCompatibleCell({ ...cell, text: cellToMerge.text });
  }

  render(
    cell: Compatible<CustomNumberCell>,
    isInEditMode: boolean,
    onCellChanged: (cell: Compatible<CustomNumberCell>, commit: boolean) => void
  ): React.ReactNode {
    if (isInEditMode) {
      return (
        <input
          type="text"
          className="input-text js-input-text"
          defaultValue={cell.text}
          ref={input => {
            if (input) {
              input.focus();
              const dummyElement = input.previousSibling as HTMLElement;
              if (dummyElement) {
                dummyElement.textContent = cell.text;
              }
            }
          }}
          onChange={e => {
            const value = e.currentTarget.value;
            onCellChanged(this.getCompatibleCell({ ...cell, text: value }), false);
            const dummyElement = e.currentTarget.previousSibling as HTMLElement;
            if (dummyElement) {
              dummyElement.textContent = value;
            }
          }}
          onBlur={e => { onCellChanged(this.getCompatibleCell({ ...cell, text: e.currentTarget.value }), !this.wasEscKeyPressed); this.wasEscKeyPressed = false; }}
          onCopy={e => e.stopPropagation()}
          onCut={e => e.stopPropagation()}
          onPaste={e => e.stopPropagation()}
          onPointerDown={e => e.stopPropagation()}
          onKeyDown={e => {
            if (isAlphaNumericKey(e.keyCode) || (isNavigationKey(e.keyCode))) e.stopPropagation();
            if (e.keyCode === keyCodes.ESCAPE) this.wasEscKeyPressed = true;
          }}
        />
      );
    }
    return <span style={{ whiteSpace: 'pre' }}>{cell.text}</span>;
  }
}