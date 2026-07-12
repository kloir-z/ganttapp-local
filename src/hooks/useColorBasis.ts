// useColorBasis.ts
// 色分け基準列(Color列/テキスト列1〜7)の候補一覧と切り替え操作をまとめたフック。
// トップバーのクイック切替・右クリックメニュー・チャート設定モーダルで共用する。
// 切り替え時は対象列のユニーク値を集め、未登録の値へ自動で色を割り当てる。
import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../reduxStoreAndSlices/store';
import {
  COLOR_BASIS_COLUMN_IDS,
  collectBasisValues,
  switchColorBasis,
  autoAssignColors,
} from '../reduxStoreAndSlices/colorSlice';

export interface ColorBasisCandidate {
  columnId: string;
  label: string;
}

export const useColorBasis = () => {
  const dispatch = useDispatch();
  const basisColumnId = useSelector((state: RootState) => state.color.basisColumnId);
  const columns = useSelector((state: RootState) => state.wbsData.columns);
  const data = useSelector((state: RootState) => state.wbsData.data);

  // 候補は実在する列だけ。ラベルはユーザーがリネームした列名をそのまま使う
  // (例: Text1 → 「担当会社」)。
  const candidates: ColorBasisCandidate[] = useMemo(() =>
    COLOR_BASIS_COLUMN_IDS
      .map((columnId): ColorBasisCandidate | null => {
        const column = columns.find(c => c.columnId === columnId);
        return column ? { columnId, label: column.columnName || columnId } : null;
      })
      .filter((c): c is ColorBasisCandidate => c !== null),
    [columns]);

  const switchTo = useCallback((columnId: string) => {
    const uniqueValues = collectBasisValues(Object.values(data), columnId);
    dispatch(switchColorBasis({ columnId, uniqueValues }));
  }, [data, dispatch]);

  // アクティブな基準列に対して、(選択行があればその範囲の)ユニーク値へ
  // 自動で色を割り当てる。
  const autoAssign = useCallback((targetRowIds?: string[]) => {
    const uniqueValues = collectBasisValues(
      Object.values(data),
      basisColumnId,
      targetRowIds && targetRowIds.length > 0 ? targetRowIds : undefined,
    );
    dispatch(autoAssignColors({ uniqueValues }));
  }, [data, basisColumnId, dispatch]);

  return { basisColumnId, candidates, switchTo, autoAssign };
};
