// useBarSelection.ts
//
// チャートバーの複数選択。一括移動(useMultiBarDrag)の対象を決めるための、
// クリック操作の意味づけだけを受け持つ。
//
// 選択の単位は **バー**(行 × 予定/実績)で、予定バーを選んでも同じ行の実績バーは選ばれない。
//
// 操作:
//   クリック(動かさずに離す) … そのバーだけを選ぶ
//   Ctrl(⌘)+クリック         … 選択に追加/解除(飛び飛びに選べる)
//   Shift+クリック            … 起点からの範囲選択(表示順・同じ種別のバー)
//   ドラッグ                  … 選択済みのバーなら一括移動、そうでなければ単体で移動
//
// 選択モード(uiFlags.isBarSelectionMode)中だけは、修飾なしクリックも追加/解除になる。
// 囲んで選ぶためのモードなので、選択を積み増す操作のほうが自然なため。
import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { RootState } from '../reduxStoreAndSlices/store';
import {
  BarType,
  barKeyOf,
  barTypeOfBarKey,
  clearSelectedBars,
  rowIdOfBarKey,
  setSelectedBars,
  toggleSelectedBar,
} from '../reduxStoreAndSlices/uiFlagSlice';
import { filterVisibleRows } from '../utils/CommonUtils';
import { isSeparatorRow } from '../types/DataTypes';

export const useBarSelection = (rowId: string, barType: BarType) => {
  const dispatch = useDispatch();
  const store = useStore<RootState>();
  const barKey = barKeyOf(rowId, barType);
  // 出力中(PDF/Excel/単体HTML)は選択枠を描かない。出力は画面をそのまま写し取るので、
  // 作業中の選択がそのまま成果物に残ってしまう。
  const isBarSelected = useSelector((state: RootState) => (
    !state.uiFlags.isExporting && state.uiFlags.selectedBarKeys.includes(barKey)
  ));

  const selectRange = useCallback((anchorBarKey: string) => {
    const state = store.getState();
    // 範囲は「画面に出ている行」の並びで取る。バーを持たないセパレータは含めない。
    const visibleIds = filterVisibleRows(state.wbsData.data)
      .filter(([, entry]) => !isSeparatorRow(entry))
      .map(([id]) => id);
    const anchorIndex = visibleIds.indexOf(rowIdOfBarKey(anchorBarKey));
    const targetIndex = visibleIds.indexOf(rowId);
    if (anchorIndex === -1 || targetIndex === -1) {
      dispatch(setSelectedBars({ barKeys: [barKey], anchorBarKey: barKey }));
      return;
    }
    // 範囲は起点と同じ種別のバーで取る(予定の範囲選択に実績を巻き込まない)
    const rangeBarType = barTypeOfBarKey(anchorBarKey);
    const [from, to] = anchorIndex <= targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
    const rangeKeys = visibleIds.slice(from, to + 1).map(id => barKeyOf(id, rangeBarType));
    // 起点は動かさないので、続けて別のバーを Shift+クリックすれば範囲を伸縮できる
    dispatch(setSelectedBars({ barKeys: rangeKeys }));
  }, [barKey, dispatch, rowId, store]);

  /**
   * 選択操作として処理しきったら true を返す(その場合バーのドラッグは始めない)。
   * false のときは呼び出し側がそのままドラッグへ進む。
   */
  const handleSelectionMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>): boolean => {
    if (event.button !== 0) return false;
    const state = store.getState();
    if (state.history?.isViewingPast) return false;

    // Shift は範囲選択、Ctrl(⌘)は1本ずつの追加/解除。
    // Shift に起点が無ければ、そのバーを選ぶところから始める。
    if (event.shiftKey) {
      event.stopPropagation();
      const anchorBarKey = state.uiFlags.lastSelectedBarKey;
      if (anchorBarKey && anchorBarKey !== barKey && state.uiFlags.selectedBarKeys.length > 0) {
        selectRange(anchorBarKey);
      } else {
        dispatch(toggleSelectedBar(barKey));
      }
      return true;
    }
    if (event.ctrlKey || event.metaKey) {
      event.stopPropagation();
      dispatch(toggleSelectedBar(barKey));
      return true;
    }

    const selectedBarKeys = state.uiFlags.selectedBarKeys;
    if (state.uiFlags.isBarSelectionMode) {
      // 選択モード中: 選択済みのバーはそのまま一括ドラッグへ。未選択のバーは
      // ここで選び、ドラッグは始めない(囲んで選ぶ最中にバーが動くのを防ぐ)。
      if (selectedBarKeys.includes(barKey)) return false;
      event.stopPropagation();
      dispatch(toggleSelectedBar(barKey));
      return true;
    }

    // 修飾なしで選択外のバーを掴んだら、選択を捨てて単体ドラッグに戻す(Excel/Figma と同じ)
    if (selectedBarKeys.length > 0 && !selectedBarKeys.includes(barKey)) {
      dispatch(clearSelectedBars());
    }
    return false;
  }, [barKey, dispatch, selectRange, store]);

  /**
   * 動かさずに離したドラッグ(=クリック)を選択として扱う。
   * ドラッグ終了時に呼び、実際に動かしていたら何もしない。
   */
  const handleSelectionClick = useCallback((moved: boolean) => {
    if (moved) return;
    const state = store.getState();
    if (state.history?.isViewingPast) return;
    if (state.uiFlags.isBarSelectionMode) {
      // モード中のクリックは追加/解除(選択済みのバーを押したら外れる)
      dispatch(toggleSelectedBar(barKey));
      return;
    }
    dispatch(setSelectedBars({ barKeys: [barKey], anchorBarKey: barKey }));
  }, [barKey, dispatch, store]);

  return { isBarSelected, handleSelectionMouseDown, handleSelectionClick };
};

/**
 * 選択中のバーが属する行IDを、重複なく選択順で返す。
 * チャートの右クリックメニューに渡して、選択したバーの行に対して
 * 行削除・コピー・色分け・注釈追加などの操作をかけられるようにする。
 * data は購読しない(全行が再レンダーされるのを避けるため)。
 */
export const useSelectedBarRowIds = (): string[] => {
  const selectedBarKeys = useSelector((state: RootState) => state.uiFlags.selectedBarKeys);
  return useMemo(() => {
    const rowIds: string[] = [];
    selectedBarKeys.forEach(key => {
      const rowId = rowIdOfBarKey(key);
      if (!rowIds.includes(rowId)) rowIds.push(rowId);
    });
    return rowIds;
  }, [selectedBarKeys]);
};
