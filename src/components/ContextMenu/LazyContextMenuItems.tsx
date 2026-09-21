// LazyContextMenuItems.tsx
//
// 右クリックメニューの項目を「メニューが開いている間だけ」組み立てるためのコンポーネント。
//
// チャートの各行(ChartRow / EventRow / SeparatorRow)は以前、行ごとに useContextMenuOptions を
// 常時呼んでいた。このフックは色分け基準(useColorBasis)経由で wbsData.data 全体を購読し、
// 項目の翻訳文字列も毎回作り直すので、どこか 1 行の日付が変わるだけで表示中の全行が再レンダーされ、
// バーのドラッグ中はその負荷がマウス移動ごとに掛かっていた。ContextMenu が開いたときにだけ
// このコンポーネントをマウントすることで、閉じている行はフックも購読も持たない。
import React from 'react';
import { MenuItem } from '../MenuItem';
import { useContextMenuOptions, UseContextMenuOptionsProps } from '../../hooks/useContextMenuOptions';
import { useSelectedBarRowIds } from '../../hooks/useBarSelection';

export interface LazyContextMenuOptions extends UseContextMenuOptionsProps {
  /**
   * チャート側のメニュー用。true ならバーの選択をそのまま操作対象の行として渡す
   * (selectedRowIds より優先)。選択の購読もここで行うので、行コンポーネントは
   * 選択が変わるたびに再レンダーされずに済む。
   */
  useBarSelectionAsRows?: boolean;
}

interface LazyContextMenuItemsProps {
  options: LazyContextMenuOptions;
  closeMenu: () => void;
}

const LazyContextMenuItems: React.FC<LazyContextMenuItemsProps> = ({ options, closeMenu }) => {
  const { useBarSelectionAsRows, ...menuOptions } = options;
  const selectedBarRowIds = useSelectedBarRowIds();
  const items = useContextMenuOptions(useBarSelectionAsRows
    // 選択が無いときは undefined。空配列を渡すと「コピーした行を挿入」が無効化されてしまう
    ? { ...menuOptions, selectedRowIds: selectedBarRowIds.length > 0 ? selectedBarRowIds : undefined }
    : menuOptions);
  return (
    <>
      {items.map((item, index) => (
        <MenuItem key={index} closeMenu={closeMenu} {...item} />
      ))}
    </>
  );
};

export default LazyContextMenuItems;
