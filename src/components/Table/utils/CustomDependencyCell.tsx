// CustomDependencyCell.tsx
//
// 依存関係列(columnId === 'dependency')専用のセル。通常表示は依存文字列をそのまま出し、
// 編集モードでは入力支援用のビルダー(DependencyBuilder)をポップオーバー表示する。
import * as React from "react";
import { CellTemplate, Compatible, Uncertain, UncertainCompatible, keyCodes, Cell } from "@silevis/reactgrid";
import DependencyBuilder from "./DependencyBuilder";

export interface CustomDependencyCell extends Cell {
  type: 'customDependency';
  text: string;
  value: number;
  columnWidth?: number;
  // 現在行の id。相対指定(+N/-N)の解決や対象候補から自分を除くのに使う。
  rowId: string;
}

export class CustomDependencyCellTemplate implements CellTemplate<CustomDependencyCell> {
  getCompatibleCell(uncertainCell: Uncertain<CustomDependencyCell>): Compatible<CustomDependencyCell> {
    const text = uncertainCell.text || '';
    const value = text.length;
    const rowId = uncertainCell.rowId || '';
    return { ...uncertainCell, text, value, rowId };
  }

  handleKeyDown(
    cell: Compatible<CustomDependencyCell>,
    keyCode: number,
    ctrl: boolean,
    _shift: boolean,
    alt: boolean,
    key?: string
  ): { cell: Compatible<CustomDependencyCell>; enableEditMode: boolean } {
    // クリック/F2/Enter、もしくは何か文字を打ち始めたらビルダーを開く。
    if (keyCode === keyCodes.POINTER || keyCode === keyCodes.F2 || keyCode === keyCodes.ENTER) {
      return { cell, enableEditMode: true };
    }
    if (key && key.length === 1 && !ctrl && !alt && keyCode !== 229) {
      return { cell, enableEditMode: true };
    }
    return { cell, enableEditMode: false };
  }

  update(cell: Compatible<CustomDependencyCell>, cellToMerge: UncertainCompatible<CustomDependencyCell>): Compatible<CustomDependencyCell> {
    return this.getCompatibleCell({ ...cell, text: cellToMerge.text });
  }

  render(
    cell: Compatible<CustomDependencyCell>,
    isInEditMode: boolean,
    onCellChanged: (cell: Compatible<CustomDependencyCell>, commit: boolean) => void
  ): React.ReactNode {
    if (isInEditMode) {
      return (
        <DependencyBuilder
          cell={cell}
          onCellChanged={onCellChanged}
        />
      );
    }
    return <span style={{ whiteSpace: 'pre' }}>{cell.text}</span>;
  }
}
