// BarMarqueeSelection.ts
//
// 選択モードでの矩形(ラバーバンド)選択の当たり判定。
//
// 判定は DOM ではなくデータから行う。行の y は「表示順の添字 × rowHeight」、バーの x は
// 「日付の列インデックス × cellWidth」で決まるので、仮想化でまだマウントされていない行も
// 正しく拾える(RowNoteConnector のように DOM 矩形を読む方式だと、画面外の行を取りこぼす)。
import { WBSData, isChartRow, isEventRow } from '../types/DataTypes';
import { resolveActualEndDate } from './CommonUtils';

/** チャート内容座標(px)での矩形。left/top はスクロール内容の原点から測る。 */
export interface MarqueeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DateRange {
  start: string;
  end: string;
}

interface CollectParams {
  /** 表示順の [行ID, 行データ]。折りたたみで隠れた行は含まれない。 */
  filteredData: [string, WBSData][];
  /** 日付キー(YYYY-MM-DD) → 列インデックス */
  dateIndex: { [key: string]: number };
  /** 日付キーの昇順配列(表示期間の外にあるバーを判定するのに使う) */
  dateKeys: string[];
  /** 行データの日付をキー形式へ正規化する関数(cdate 依存を外に出すため) */
  toKey: (dateStr: string) => string;
  rect: MarqueeRect;
  cellWidth: number;
  rowHeight: number;
  extendActualBarToToday: boolean;
  todayString: string;
}

/**
 * 行が持つ「選択の当たり判定に使うバーの範囲」。一括移動できないセパレータ行は対象外。
 * チャート行は予定バーと実績バー、イベント行は各イベントをそれぞれ別の範囲として返す。
 */
export const selectableBarRanges = (
  entry: WBSData,
  extendActualBarToToday: boolean,
  todayString: string
): DateRange[] => {
  const ranges: DateRange[] = [];
  if (isChartRow(entry)) {
    if (entry.plannedStartDate && entry.plannedEndDate) {
      ranges.push({ start: entry.plannedStartDate, end: entry.plannedEndDate });
    }
    // 実績終了日が未入力の行は、画面に見えている(当日まで伸ばした)バーで判定する
    const actualEnd = resolveActualEndDate(
      entry.actualStartDate ?? '', entry.actualEndDate ?? '', extendActualBarToToday, todayString
    );
    if (entry.actualStartDate && actualEnd) {
      ranges.push({ start: entry.actualStartDate, end: actualEnd });
    }
    return ranges;
  }
  if (isEventRow(entry)) {
    (entry.eventData || []).forEach(event => {
      if (event.startDate && event.endDate) {
        ranges.push({ start: event.startDate, end: event.endDate });
      }
    });
  }
  return ranges;
};

/** 矩形に少しでも重なったバーを持つ行のIDを、表示順で返す。 */
export const collectRowsInMarquee = ({
  filteredData, dateIndex, dateKeys, toKey, rect, cellWidth, rowHeight, extendActualBarToToday, todayString,
}: CollectParams): string[] => {
  if (dateKeys.length === 0 || rect.width <= 0 || rect.height <= 0) return [];
  const firstKey = dateKeys[0];
  const lastKey = dateKeys[dateKeys.length - 1];
  const rectRight = rect.x + rect.width;
  const rectBottom = rect.y + rect.height;

  const rowIds: string[] = [];
  filteredData.forEach(([rowId, entry], index) => {
    const rowTop = index * rowHeight;
    const rowBottom = rowTop + rowHeight;
    if (rowBottom <= rect.y || rowTop >= rectBottom) return;

    const hit = selectableBarRanges(entry, extendActualBarToToday, todayString).some(range => {
      const startKey = toKey(range.start);
      const endKey = toKey(range.end);
      if (!startKey || !endKey) return false;
      // 表示期間から完全に外れているバーは無視し、またぐ場合は端でクランプする
      if (startKey > lastKey || endKey < firstKey) return false;
      const s = startKey < firstKey ? 0 : dateIndex[startKey];
      const e = endKey > lastKey ? dateKeys.length - 1 : dateIndex[endKey];
      if (s === undefined || e === undefined || e < s) return false;
      const barLeft = s * cellWidth;
      const barRight = (e + 1) * cellWidth;
      return barRight > rect.x && barLeft < rectRight;
    });
    if (hit) rowIds.push(rowId);
  });
  return rowIds;
};

/** ドラッグの始点と現在点から、正規化した(幅・高さが正の)矩形を作る。 */
export const normalizeMarquee = (
  start: { x: number; y: number },
  current: { x: number; y: number }
): MarqueeRect => ({
  x: Math.min(start.x, current.x),
  y: Math.min(start.y, current.y),
  width: Math.abs(current.x - start.x),
  height: Math.abs(current.y - start.y),
});
