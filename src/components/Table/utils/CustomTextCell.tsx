// CustomTextCellTemplate.tsx
import * as React from "react";
import { CellTemplate, Compatible, Uncertain, UncertainCompatible, keyCodes, Cell } from "@silevis/reactgrid";
import { isAlphaNumericKey, isNavigationKey } from "@silevis/reactgrid";


export interface CustomTextCell extends Cell {
  type: 'customText';
  text: string;
  value: number;
  columnWidth?: number;
}

export class CustomTextCellTemplate implements CellTemplate<CustomTextCell> {
  private wasEscKeyPressed = false;

  getCompatibleCell(uncertainCell: Uncertain<CustomTextCell>): Compatible<CustomTextCell> {
    const text = uncertainCell.text || '';
    const value = text.length;
    return { ...uncertainCell, text, value };
  }

  handleKeyDown(
    cell: Compatible<CustomTextCell>,
    keyCode: number,
    ctrl: boolean,
    _shift: boolean,
    alt: boolean,
    key?: string
  ): { cell: Compatible<CustomTextCell>; enableEditMode: boolean } {
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
    cell: Compatible<CustomTextCell>,
    eventData: string
  ): { cell: Compatible<CustomTextCell>; enableEditMode: boolean } {
    return { cell: this.getCompatibleCell({ ...cell, text: eventData }), enableEditMode: true };
  }

  update(cell: Compatible<CustomTextCell>, cellToMerge: UncertainCompatible<CustomTextCell>): Compatible<CustomTextCell> {
    return this.getCompatibleCell({ ...cell, text: cellToMerge.text });
  }

  render(
    cell: Compatible<CustomTextCell>,
    isInEditMode: boolean,
    onCellChanged: (cell: Compatible<CustomTextCell>, commit: boolean) => void
  ): React.ReactNode {
    if (isInEditMode) {
      const columnWidth = cell.columnWidth ? cell.columnWidth - 11 : 80;
      const inputStyle = {
        minWidth: `${columnWidth}px`,
      };
      return (
        <div className="input-text__item">
          <div className="input-text__dummy js-dummy-input-text" style={inputStyle} data-placeholder=" "></div>
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
        </div>
      );
    }
    return <span style={{ whiteSpace: 'pre' }}>{cell.text}</span>;
  }
}