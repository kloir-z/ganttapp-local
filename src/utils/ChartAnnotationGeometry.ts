// ChartAnnotationGeometry.ts
//
// チャート注釈の配置計算。純粋関数(DOM非依存)にしてあるのは、画面描画と Excel
// 出力の両方から同じ計算を使うため。Excel 側もオートシェイプの位置を同じ座標系
// (px)で求めてから EMU に換算する。
//
// 位置は「行インデックス × rowHeight」「日付インデックス × cellWidth」の算術だけで
// 決まるので、行が仮想化されて DOM に無くても正しい位置が出る。
import { WBSData, isChartRow, isEventRow, isSeparatorRow, ChartAnnotation } from '../types/DataTypes';

// 見た目の定数。画面と Excel で同じ値を使う。
export const BRACKET_WIDTH = 8;
export const BRACKET_GAP = 6;    // バー右端とブラケットの間隔
export const LEADER_LENGTH = 24; // ブラケットとカードの間の引き出し線
export const CARD_WIDTH = 200;

export interface BarRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnnotationGeometry {
  id: string;
  // 対象行(表示順インデックス)
  rowStart: number;
  rowEnd: number;
  // 強調表示する対象バーの矩形
  bars: BarRect[];
  // ブラケット(対象行を括る右向きの括弧)
  bracketX: number;
  bracketY: number;
  bracketHeight: number;
  // 引き出し線の始点(ブラケットの右辺中央)
  leaderX: number;
  leaderY: number;
  // カードの左上。offsetX/offsetY を加味済み。縦はカード中央を leaderY に合わせる
  // 前提で、描画側が translateY(-50%) するためのアンカーを返す。
  cardX: number;
  cardCenterY: number;
}

// 行が持つ「バーの日付範囲」。チャート行は計画バー、イベント行は全イベントの外周、
// セパレータ行は集計済みの範囲を使う。
export const rowBarDates = (entry: WBSData): { start: string; end: string } | null => {
  if (isChartRow(entry)) {
    if (!entry.plannedStartDate || !entry.plannedEndDate) return null;
    return { start: entry.plannedStartDate, end: entry.plannedEndDate };
  }
  if (isEventRow(entry)) {
    const dates = (entry.eventData || []).filter(e => e.startDate && e.endDate);
    if (dates.length === 0) return null;
    return {
      start: dates.reduce((min, e) => (e.startDate < min ? e.startDate : min), dates[0].startDate),
      end: dates.reduce((max, e) => (e.endDate > max ? e.endDate : max), dates[0].endDate),
    };
  }
  if (isSeparatorRow(entry)) {
    if (!entry.minStartDate || !entry.maxEndDate) return null;
    return { start: entry.minStartDate, end: entry.maxEndDate };
  }
  return null;
};

interface ComputeParams {
  annotation: ChartAnnotation;
  // 表示順の [行ID, 行データ]。折りたたみで隠れた行は含まれない。
  filteredData: [string, WBSData][];
  // 日付キー(YYYY-MM-DD) → 列インデックス
  dateIndex: { [key: string]: number };
  // 日付キーの昇順配列(範囲外クランプの判定に使う)
  dateKeys: string[];
  // 行データの日付を上のキー形式へ正規化する関数(cdate 依存を外に出すため)
  toKey: (dateStr: string) => string;
  cellWidth: number;
  rowHeight: number;
}

// 注釈1件分の配置を求める。対象行が1つも表示されていなければ null(描画しない)。
export const computeAnnotationGeometry = ({
  annotation, filteredData, dateIndex, dateKeys, toKey, cellWidth, rowHeight,
}: ComputeParams): AnnotationGeometry | null => {
  if (dateKeys.length === 0) return null;
  const firstKey = dateKeys[0];
  const lastKey = dateKeys[dateKeys.length - 1];

  const indexOfRow = (rowId: string) => filteredData.findIndex(([key]) => key === rowId);
  const startIdx = indexOfRow(annotation.startRowId);
  const endIdx = indexOfRow(annotation.endRowId);
  // 片方の行が消えた/折りたたまれたら残った方に縮退し、両方無ければ描かない。
  const present = [startIdx, endIdx].filter(i => i !== -1);
  if (present.length === 0) return null;
  const rowStart = Math.min(...present);
  const rowEnd = Math.max(...present);

  // 対象行のうちバーを持つものを集める(強調表示とブラケット位置の両方に使う)。
  const bars: BarRect[] = [];
  let barRightEdge = 0;
  for (let i = rowStart; i <= rowEnd; i += 1) {
    const entry = filteredData[i]?.[1];
    if (!entry) continue;
    const dates = rowBarDates(entry);
    if (!dates) continue;
    const startKey = toKey(dates.start);
    const endKey = toKey(dates.end);
    if (!startKey || !endKey) continue;
    // 表示期間の外に完全に出ているバーは対象外。またぐ場合は端でクランプする。
    if (startKey > lastKey || endKey < firstKey) continue;
    const s = startKey < firstKey ? 0 : dateIndex[startKey];
    const e = endKey > lastKey ? dateKeys.length - 1 : dateIndex[endKey];
    if (s === undefined || e === undefined || e < s) continue;
    const x = s * cellWidth;
    const width = (e - s + 1) * cellWidth;
    bars.push({ x, y: i * rowHeight, width, height: rowHeight });
    barRightEdge = Math.max(barRightEdge, x + width);
  }

  const bracketX = barRightEdge + BRACKET_GAP;
  const bracketY = rowStart * rowHeight;
  const bracketHeight = (rowEnd - rowStart + 1) * rowHeight;
  const leaderX = bracketX + BRACKET_WIDTH;
  const leaderY = bracketY + bracketHeight / 2;

  return {
    id: annotation.id,
    rowStart,
    rowEnd,
    bars,
    bracketX,
    bracketY,
    bracketHeight,
    leaderX,
    leaderY,
    cardX: leaderX + LEADER_LENGTH + annotation.offsetX,
    cardCenterY: leaderY + annotation.offsetY,
  };
};
