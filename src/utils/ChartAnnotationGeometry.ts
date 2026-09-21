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
// バーのラベル(タスク名・進捗)の左右の余白。AutoWidthInputBox の padding 4px ×2 と、
// 名前と進捗の間の分。
export const LABEL_PADDING = 8;

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
  // 強調表示する対象バーの矩形(セパレータ行は含まない)
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
  // 折りたたみ前の全行ID(表示順)。端点が折りたたみで隠れたとき、それを含む
  // セパレータ行へ付け替えるのに使う。省略時は隠れた端点を「消えた」扱いにする。
  allRowIds?: string[];
  // 日付キー(YYYY-MM-DD) → 列インデックス
  dateIndex: { [key: string]: number };
  // 日付キーの昇順配列(範囲外クランプの判定に使う)
  dateKeys: string[];
  // 行データの日付を上のキー形式へ正規化する関数(cdate 依存を外に出すため)
  toKey: (dateStr: string) => string;
  cellWidth: number;
  rowHeight: number;
  // ラベル文字列の描画幅(px)。渡されるとブラケットをバーの右端ではなくラベルの
  // 右端の先に置く(ラベルはバーの左端から始まり、短いバーでははみ出すので、
  // バーの右端に置くと括弧や線が文字に重なる)。省略時はバーの右端だけを見る。
  measureText?: (text: string) => number;
}

// 行のラベルが届く右端(px)。チャート行はバー左端から「タスク名 + 進捗」、
// イベント行は予定イベントごとに開始位置から名前が描かれる(実績側は名前を出さない)。
const labelRightEdge = (
  entry: WBSData,
  columnOf: (dateStr: string) => number | undefined,
  cellWidth: number,
  measureText: (text: string) => number,
): number => {
  const textWidth = (...parts: (string | undefined)[]) => {
    const texts = parts.filter((part): part is string => Boolean(part));
    if (texts.length === 0) return 0;
    return texts.reduce((sum, text) => sum + measureText(text), 0) + LABEL_PADDING * texts.length;
  };
  if (isChartRow(entry)) {
    const s = columnOf(entry.plannedStartDate);
    if (s === undefined) return 0;
    return s * cellWidth + textWidth(entry.displayName, entry.progress);
  }
  if (isEventRow(entry)) {
    return (entry.eventData || []).reduce((max, event) => {
      if (!event.isPlanned || !event.eachDisplayName) return max;
      const s = columnOf(event.startDate);
      return s === undefined ? max : Math.max(max, s * cellWidth + textWidth(event.eachDisplayName));
    }, 0);
  }
  return 0;
};

// 注釈1件分の配置を求める。対象行が1つも表示されていなければ null(描画しない)。
export const computeAnnotationGeometry = ({
  annotation, filteredData, allRowIds, dateIndex, dateKeys, toKey, cellWidth, rowHeight, measureText,
}: ComputeParams): AnnotationGeometry | null => {
  if (dateKeys.length === 0) return null;
  const firstKey = dateKeys[0];
  const lastKey = dateKeys[dateKeys.length - 1];

  const visibleIndex = new Map<string, number>();
  filteredData.forEach(([key], index) => { visibleIndex.set(key, index); });
  // 端点の表示位置。折りたたみで隠れた行は、全行順で直前にある表示行 ── つまり
  // それを畳んでいるセパレータ行 ── に付け替える。こうしないと範囲の片側が消えて、
  // 残った端点の1行だけを指す注釈になってしまう。
  const indexOfRow = (rowId: string) => {
    const visible = visibleIndex.get(rowId);
    if (visible !== undefined) return visible;
    const pos = allRowIds ? allRowIds.indexOf(rowId) : -1;
    for (let p = pos - 1; p >= 0; p -= 1) {
      const ancestor = visibleIndex.get(allRowIds![p]);
      if (ancestor !== undefined) return ancestor;
    }
    return -1;
  };
  const startIdx = indexOfRow(annotation.startRowId);
  const endIdx = indexOfRow(annotation.endRowId);
  // 片方の行が削除されたら残った方に縮退し、両方無ければ描かない。
  const present = [startIdx, endIdx].filter(i => i !== -1);
  if (present.length === 0) return null;
  const rowStart = Math.min(...present);
  const rowEnd = Math.max(...present);

  // 対象行のうちバーを持つものを集める(強調表示とブラケット位置の両方に使う)。
  const bars: BarRect[] = [];
  let barRightEdge = 0;
  // 表示期間外の開始日は左端に寄せる(ラベルもそこから描かれる)。
  const columnOf = (dateStr: string) => {
    const key = toKey(dateStr);
    if (!key || key > lastKey) return undefined;
    return key < firstKey ? 0 : dateIndex[key];
  };
  for (let i = rowStart; i <= rowEnd; i += 1) {
    const entry = filteredData[i]?.[1];
    if (!entry) continue;
    if (measureText) {
      barRightEdge = Math.max(barRightEdge, labelRightEdge(entry, columnOf, cellWidth, measureText));
    }
    // 展開中のセパレータは配下の行が個別に表示されているので、位置決めに使わない。
    // 集計範囲は範囲外の配下タスクまで含むため、使うと括弧が遠くへ押し出される。
    // 折りたたみ中はそのセパレータが配下の代わりなので、集計範囲を使う。
    if (isSeparatorRow(entry) && !entry.isCollapsed) continue;
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
    // セパレータ行は集計範囲をブラケット位置にだけ使い、枠は付けない。帯の全幅を
    // 囲むと「バー」に見えてしまい、配下のバーの枠と二重になる。
    if (!isSeparatorRow(entry)) bars.push({ x, y: i * rowHeight, width, height: rowHeight });
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
