// CpArrowsOverlay.tsx
// クリティカルパス表示 ON のとき、CPリンク(cpPredecessors)をバー間の矢印として
// 1枚の SVG オーバーレイに描画する。行コンポーネントは仮想化(可視範囲のみマウント)
// されているため、リンクはコンポーネント外の filteredData から全件を直接計算する。
// 折りたたみで非表示の行が絡むリンクは filteredData に含まれないので自然に描かれない。
import React, { memo, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { cdate } from 'cdate';
import { RootState } from '../../reduxStoreAndSlices/store';
import { selectCriticalPath } from '../../reduxStoreAndSlices/criticalPathSelectors';
import { WBSData, isChartRow } from '../../types/DataTypes';
import { sanitizeCpPredecessors, cpLinkKey } from '../../utils/CriticalPath';

interface CpArrowsOverlayProps {
  filteredData: [string, WBSData][];
  dateArray: ReturnType<typeof cdate>[];
}

const CRITICAL_COLOR = 'rgba(229, 57, 53, 0.9)'; // StyledBar の $isCpCritical と同色
const NORMAL_COLOR = 'rgba(120, 120, 120, 0.55)';

const CpArrowsOverlay: React.FC<CpArrowsOverlayProps> = memo(({ filteredData, dateArray }) => {
  const showCriticalPath = useSelector((state: RootState) => state.uiFlags.showCriticalPath);
  const isViewingPast = useSelector((state: RootState) => state.history?.isViewingPast || false);
  const cellWidth = useSelector((state: RootState) => state.baseSettings.cellWidth);
  const rowHeight = useSelector((state: RootState) => state.baseSettings.rowHeight);
  // 表示 OFF・履歴プレビュー中はセレクタ自体を評価しない(バー側の表示条件と同じ)。
  const criticalLinkKeys = useSelector((state: RootState) =>
    showCriticalPath && !isViewingPast ? selectCriticalPath(state).criticalLinkKeys : null
  );

  const paths = useMemo(() => {
    if (!criticalLinkKeys) return [];

    // 日付文字列 → dateArray インデックス(全日が連続している前提で O(1) 参照)。
    const dateIndex: { [key: string]: number } = {};
    dateArray.forEach((date, index) => {
      dateIndex[date.format('YYYY-MM-DD')] = index;
    });
    const first = dateArray[0];
    const last = dateArray[dateArray.length - 1];

    // バーの占有セル範囲(ChartBar と同じ丸め)。範囲外にはみ出す分はクランプする。
    const barRange = (startDate: string, endDate: string): { startIndex: number, endIndex: number } | null => {
      const start = cdate(startDate).startOf('day');
      const end = cdate(endDate).startOf('day');
      if (isNaN(+start.toDate()) || isNaN(+end.toDate())) return null;
      if (+start > +last || +end < +first) return null;
      const startIndex = +start < +first ? 0 : dateIndex[start.format('YYYY-MM-DD')];
      const endIndex = +end > +last ? dateArray.length - 1 : dateIndex[end.format('YYYY-MM-DD')];
      if (startIndex === undefined || endIndex === undefined || endIndex < startIndex) return null;
      return { startIndex, endIndex };
    };

    // 可視行のうち ChartRow の表示位置とバー範囲を先に索引化する。
    const rowGeometry: { [id: string]: { rowIndex: number, startIndex: number, endIndex: number } } = {};
    filteredData.forEach(([, entry], rowIndex) => {
      if (!isChartRow(entry) || !entry.plannedStartDate || !entry.plannedEndDate) return;
      const range = barRange(entry.plannedStartDate, entry.plannedEndDate);
      if (!range) return;
      rowGeometry[entry.id] = { rowIndex, ...range };
    });

    const result: { key: string, d: string, isCritical: boolean }[] = [];
    filteredData.forEach(([, entry]) => {
      if (!isChartRow(entry)) return;
      const succ = rowGeometry[entry.id];
      if (!succ) return;
      sanitizeCpPredecessors(entry.cpPredecessors, entry.id).forEach(pred => {
        const predGeo = rowGeometry[pred.predecessorId];
        if (!predGeo) return;
        const predEndX = (predGeo.endIndex + 1) * cellWidth;
        const predY = predGeo.rowIndex * rowHeight + rowHeight / 2;
        const succStartX = succ.startIndex * cellWidth;
        const succY = succ.rowIndex * rowHeight + rowHeight / 2;
        const stub = Math.max(4, Math.min(10, cellWidth / 2));
        let d: string;
        if (succStartX >= predEndX + stub * 2) {
          // 通常ルート: 右に出て、先行終了+stub の位置で垂直、後続開始へ水平。
          d = `M ${predEndX} ${predY} H ${predEndX + stub} V ${succY} H ${succStartX}`;
        } else {
          // 後続の開始が先行の終了より左(リード等): 一旦行境界まで降りて左へ回り込む。
          const edgeY = succY > predY
            ? (predGeo.rowIndex + 1) * rowHeight
            : predGeo.rowIndex * rowHeight;
          d = `M ${predEndX} ${predY} H ${predEndX + stub} V ${edgeY} H ${succStartX - stub} V ${succY} H ${succStartX}`;
        }
        result.push({
          key: `${pred.predecessorId}->${entry.id}`,
          d,
          isCritical: criticalLinkKeys.has(cpLinkKey(pred.predecessorId, entry.id)),
        });
      });
    });
    return result;
  }, [criticalLinkKeys, filteredData, dateArray, cellWidth, rowHeight]);

  if (!criticalLinkKeys || paths.length === 0) return null;

  return (
    <svg
      width={dateArray.length * cellWidth}
      height={filteredData.length * rowHeight}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 5, // バー(z-index なし)より上、行ノートのポップオーバー(6)や依存ハイライト(24)より下
        overflow: 'visible',
      }}
    >
      <defs>
        <marker id="cp-arrow-critical" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 8 4 L 0 8 z" fill={CRITICAL_COLOR} />
        </marker>
        <marker id="cp-arrow-normal" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 8 4 L 0 8 z" fill={NORMAL_COLOR} />
        </marker>
      </defs>
      {paths.map(path => (
        <path
          key={path.key}
          d={path.d}
          fill="none"
          stroke={path.isCritical ? CRITICAL_COLOR : NORMAL_COLOR}
          strokeWidth={path.isCritical ? 1.8 : 1.2}
          markerEnd={path.isCritical ? 'url(#cp-arrow-critical)' : 'url(#cp-arrow-normal)'}
        />
      ))}
    </svg>
  );
});

CpArrowsOverlay.displayName = 'CpArrowsOverlay';

export default CpArrowsOverlay;
