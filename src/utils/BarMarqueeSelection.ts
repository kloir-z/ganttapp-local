// BarMarqueeSelection.ts
//
// 選択モードでの矩形(ラバーバンド)選択の当たり判定。
//
// 判定は DOM ではなくデータから行う。行の y は「表示順の添字 × rowHeight」、バーの x は
// 「日付の列インデックス × cellWidth」で決まるので、仮想化でまだマウントされていない行も
// 正しく拾える(RowNoteConnector のように DOM 矩形を読む方式だと、画面外の行を取りこぼす)。
import { WBSData, isChartRow, isEventRow } from '../types/DataTypes';
import { BarType, barKeyOf } from '../reduxStoreAndSlices/uiFlagSlice';
import { resolveActualEndDate } from './CommonUtils';

/** チャート内容座標(px)での矩形。left/top はスクロール内容の原点から測る。 */
export interface MarqueeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SelectableBar {
  /** 'planned' / 'actual'。予定バーと実績バーは別々に選べる。 */
  barType: BarType;
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
 * 行が持つ「選択の当たり判定に使うバー」。一括移動できないセパレータ行は対象外。
 * チャート行は予定バーと実績バー、イベント行は各イベントを、それぞれ種別つきで返す。
 */
export const selectableBars = (
  entry: WBSData,
  extendActualBarToToday: boolean,
  todayString: string
): SelectableBar[] => {
  const bars: SelectableBar[] = [];
  if (isChartRow(entry)) {
    if (entry.plannedStartDate && entry.plannedEndDate) {
      bars.push({ barType: 'planned', start: entry.plannedStartDate, end: entry.plannedEndDate });
    }
    // 実績終了日が未入力の行は、画面に見えている(当日まで伸ばした)バーで判定する
    const actualEnd = resolveActualEndDate(
      entry.actualStartDate ?? '', entry.actualEndDate ?? '', extendActualBarToToday, todayString
    );
    if (entry.actualStartDate && actualEnd) {
      bars.push({ barType: 'actual', start: entry.actualStartDate, end: actualEnd });
    }
    return bars;
  }
  if (isEventRow(entry)) {
    (entry.eventData || []).forEach(event => {
      if (event.startDate && event.endDate) {
        bars.push({ barType: event.isPlanned ? 'planned' : 'actual', start: event.startDate, end: event.endDate });
      }
    });
  }
  return bars;
};

/** 矩形に少しでも重なったバーの選択キーを、表示順で重複なく返す。 */
export const collectBarsInMarquee = ({
  filteredData, dateIndex, dateKeys, toKey, rect, cellWidth, rowHeight, extendActualBarToToday, todayString,
}: CollectParams): string[] => {
  if (dateKeys.length === 0 || rect.width <= 0 || rect.height <= 0) return [];
  const firstKey = dateKeys[0];
  const lastKey = dateKeys[dateKeys.length - 1];
  const rectRight = rect.x + rect.width;
  const rectBottom = rect.y + rect.height;

  const barKeys: string[] = [];
  filteredData.forEach(([rowId, entry], index) => {
    const rowTop = index * rowHeight;
    const rowBottom = rowTop + rowHeight;
    if (rowBottom <= rect.y || rowTop >= rectBottom) return;

    selectableBars(entry, extendActualBarToToday, todayString).forEach(bar => {
      const key = barKeyOf(rowId, bar.barType);
      if (barKeys.includes(key)) return;
      const startKey = toKey(bar.start);
      const endKey = toKey(bar.end);
      if (!startKey || !endKey) return;
      // 表示期間から完全に外れているバーは無視し、またぐ場合は端でクランプする
      if (startKey > lastKey || endKey < firstKey) return;
      const s = startKey < firstKey ? 0 : dateIndex[startKey];
      const e = endKey > lastKey ? dateKeys.length - 1 : dateIndex[endKey];
      if (s === undefined || e === undefined || e < s) return;
      const barLeft = s * cellWidth;
      const barRight = (e + 1) * cellWidth;
      if (barRight > rect.x && barLeft < rectRight) {
        barKeys.push(key);
      }
    });
  });
  return barKeys;
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
