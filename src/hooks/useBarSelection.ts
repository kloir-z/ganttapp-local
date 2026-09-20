// useBarSelection.ts
//
// チャートバーの複数選択。一括移動(useMultiBarDrag)の対象行を決めるための、
// クリック操作の意味づけだけを受け持つ。
//
// 修飾キーの割り当て:
//   Ctrl(⌘)+クリック       … 選択に追加/解除
//   Ctrl(⌘)+Shift+クリック … 直前に選んだ行からの範囲選択(表示順)
//   修飾なしクリック       … 選択外の行を掴んだら選択を解除してから単体ドラッグへ
//
// 選択モード(uiFlags.isBarSelectionMode)中だけは、修飾なしクリックの意味が変わる。
// 選択外のバーを押したら「その行を選ぶ」で終わり(ドラッグしない)、選択済みのバーを
// 押したらそのまま一括ドラッグへ進む。囲んで選ぶためのモードなので、うっかり掴んで
// バーが動いてしまうのを防ぐ。
//
// Shift 単独を範囲選択に使わないのは、バー上の Shift+ダブルクリックが
// 「実績バーの作成」に割り当て済みで、その1回目の mousedown と衝突するため。
import { useCallback } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { RootState } from '../reduxStoreAndSlices/store';
import {
  clearSelectedBarRows,
  setSelectedBarRows,
  toggleSelectedBarRow,
} from '../reduxStoreAndSlices/uiFlagSlice';
import { filterVisibleRows } from '../utils/CommonUtils';
import { isSeparatorRow } from '../types/DataTypes';

export const useBarSelection = (rowId: string) => {
  const dispatch = useDispatch();
  const store = useStore<RootState>();
  // 出力中(PDF/Excel/単体HTML)は選択枠を描かない。出力は画面をそのまま写し取るので、
  // 作業中の選択がそのまま成果物に残ってしまう。
  const isBarSelected = useSelector((state: RootState) => (
    !state.uiFlags.isExporting && state.uiFlags.selectedBarRowIds.includes(rowId)
  ));

  /**
   * 選択操作として処理したら true を返す(その場合バーのドラッグは始めない)。
   * false のときは呼び出し側がそのままドラッグへ進む。
   */
  const handleSelectionMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>): boolean => {
    if (event.button !== 0) return false;
    const state = store.getState();
    if (state.history?.isViewingPast) return false;

    const isBarSelectionMode = state.uiFlags.isBarSelectionMode;
    const isToggleModifier = event.ctrlKey || event.metaKey;
    if (isToggleModifier && event.shiftKey) {
      event.stopPropagation();
      const anchorRowId = state.uiFlags.lastSelectedBarRowId;
      if (!anchorRowId || anchorRowId === rowId) {
        dispatch(setSelectedBarRows({ rowIds: [rowId], anchorRowId: rowId }));
        return true;
      }
      // 範囲は「画面に出ている行」の並びで取る。バーを持たないセパレータは含めない。
      const visibleIds = filterVisibleRows(state.wbsData.data)
        .filter(([, entry]) => !isSeparatorRow(entry))
        .map(([id]) => id);
      const anchorIndex = visibleIds.indexOf(anchorRowId);
      const targetIndex = visibleIds.indexOf(rowId);
      if (anchorIndex === -1 || targetIndex === -1) {
        dispatch(setSelectedBarRows({ rowIds: [rowId], anchorRowId: rowId }));
        return true;
      }
      const [from, to] = anchorIndex <= targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
      // 起点は動かさないので、続けて別の行を Ctrl+Shift+クリックすれば範囲を伸縮できる
      dispatch(setSelectedBarRows({ rowIds: visibleIds.slice(from, to + 1) }));
      return true;
    }

    if (isToggleModifier) {
      event.stopPropagation();
      dispatch(toggleSelectedBarRow(rowId));
      return true;
    }

    const selectedBarRowIds = state.uiFlags.selectedBarRowIds;
    if (isBarSelectionMode) {
      // 選択モード中: 選択済みのバーはそのまま一括ドラッグへ、そうでなければ選ぶだけ
      if (selectedBarRowIds.includes(rowId)) return false;
      event.stopPropagation();
      dispatch(setSelectedBarRows({ rowIds: [rowId], anchorRowId: rowId }));
      return true;
    }

    // 修飾なしで選択外のバーを掴んだら、選択を捨てて単体ドラッグに戻す(Excel/Figma と同じ)
    if (selectedBarRowIds.length > 0 && !selectedBarRowIds.includes(rowId)) {
      dispatch(clearSelectedBarRows());
    }
    return false;
  }, [dispatch, rowId, store]);

  return { isBarSelected, handleSelectionMouseDown };
};
