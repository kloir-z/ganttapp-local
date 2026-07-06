// CriticalPath.ts
// クリティカルパス用の論理依存ネットワーク(ChartRow.cpPredecessors)の計算と入出力。
// 既存の依存機能(dependency/dependentId、日付の自動計算)とは完全に独立しており、
// このネットワークを編集しても日付は一切変化しない。
//
// 計算方針: 「日付は正、ネットワークは注釈」。所要日数から日程を合成する古典的CPMでは
// なく、画面に引かれている実際の plannedStartDate/plannedEndDate に対して後退パスで
// トータルフロートを求め、フロートが 0 以下のタスクをクリティカルとする。
// 稼働日の判定はプロジェクト全体の holidays / regularDaysOff を用いる
// (行ごとの isIncludeHolidays はフロート計算では考慮しない簡略化)。
import { cdate } from 'cdate';
import { ChartRow, CpPredecessor, WBSData, isChartRow } from '../types/DataTypes';
import { isHoliday, isRegularDaysOff } from './CommonUtils';

export interface CriticalPathResult {
  criticalIds: Set<string>;
  // ネットワーク参加タスクのトータルフロート(稼働日)。0 以下がクリティカル。
  floatByTaskId: { [id: string]: number };
  hasCycle: boolean;
}

export const EMPTY_CRITICAL_PATH_RESULT: CriticalPathResult = {
  criticalIds: new Set<string>(),
  floatByTaskId: {},
  hasCycle: false,
};

const MAX_LAG = 999;
// gapWorkdays の暴走ガード(日付異常時に無限走査しないため)。10年相当。
const MAX_GAP_SCAN_DAYS = 3660;

const isWorkday = (date: cdate.CDate, holidays: string[], regularDaysOff: number[]): boolean =>
  !isRegularDaysOff(date.toDate().getDay(), regularDaysOff) && !isHoliday(date, holidays);

const hasValidPlannedDates = (row: ChartRow): boolean => {
  if (!row.plannedStartDate || !row.plannedEndDate) return false;
  const start = +cdate(row.plannedStartDate).toDate();
  const end = +cdate(row.plannedEndDate).toDate();
  return !isNaN(start) && !isNaN(end) && start <= end;
};

// (from, to] に含まれる稼働日数(符号付き)。from === to は 0、to < from は負値。
export const gapWorkdays = (
  fromString: string,
  toString: string,
  holidays: string[],
  regularDaysOff: number[]
): number => {
  const from = cdate(fromString).startOf('day');
  const to = cdate(toString).startOf('day');
  if (isNaN(+from.toDate()) || isNaN(+to.toDate()) || +from === +to) return 0;
  const sign = +to > +from ? 1 : -1;
  let current = sign === 1 ? from : to;
  const limit = sign === 1 ? to : from;
  let count = 0;
  let scanned = 0;
  while (+current < +limit && scanned++ < MAX_GAP_SCAN_DAYS) {
    current = current.add(1, 'day');
    if (isWorkday(current, holidays, regularDaysOff)) count++;
  }
  return sign * count;
};

// 保存データや JSON 直編集で入り得る不正値を除去する(非配列・自己参照・重複・不正 lag)。
export const sanitizeCpPredecessors = (value: unknown, selfId: string): CpPredecessor[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: CpPredecessor[] = [];
  value.forEach(item => {
    if (!item || typeof item !== 'object') return;
    const predecessorId = (item as { predecessorId?: unknown }).predecessorId;
    if (typeof predecessorId !== 'string' || predecessorId === '' || predecessorId === selfId || seen.has(predecessorId)) return;
    const rawLag = (item as { lag?: unknown }).lag;
    const lag = typeof rawLag === 'number' && Number.isFinite(rawLag)
      ? Math.max(-MAX_LAG, Math.min(MAX_LAG, Math.trunc(rawLag)))
      : 0;
    seen.add(predecessorId);
    result.push(lag === 0 ? { predecessorId } : { predecessorId, lag });
  });
  return result;
};

interface CpLink {
  predId: string;
  succId: string;
  lag: number;
}

export const computeCriticalPath = (
  data: { [id: string]: WBSData },
  holidays: string[],
  regularDaysOff: number[]
): CriticalPathResult => {
  // 両端が日付を持つ ChartRow 同士のリンクだけがネットワークに参加する。
  const links: CpLink[] = [];
  const nodeIds = new Set<string>();
  Object.values(data).forEach(row => {
    if (!isChartRow(row) || !hasValidPlannedDates(row)) return;
    sanitizeCpPredecessors(row.cpPredecessors, row.id).forEach(pred => {
      const predRow = data[pred.predecessorId];
      if (!isChartRow(predRow) || !hasValidPlannedDates(predRow)) return;
      links.push({ predId: predRow.id, succId: row.id, lag: pred.lag ?? 0 });
      nodeIds.add(predRow.id);
      nodeIds.add(row.id);
    });
  });
  if (nodeIds.size === 0) {
    return EMPTY_CRITICAL_PATH_RESULT;
  }

  const linksByPred: { [id: string]: CpLink[] } = {};
  const linksBySucc: { [id: string]: CpLink[] } = {};
  links.forEach(link => {
    (linksByPred[link.predId] = linksByPred[link.predId] || []).push(link);
    (linksBySucc[link.succId] = linksBySucc[link.succId] || []).push(link);
  });

  // Kahn 法で「後続がすべて処理済みになってから先行を処理する」順序を作る。
  // 循環に巻き込まれたノード(とその上流)は order に入らず、判定対象から外れる。
  const remainingSuccessors: { [id: string]: number } = {};
  nodeIds.forEach(id => {
    remainingSuccessors[id] = linksByPred[id] ? linksByPred[id].length : 0;
  });
  const queue: string[] = [];
  nodeIds.forEach(id => {
    if (remainingSuccessors[id] === 0) queue.push(id);
  });
  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift() as string;
    order.push(id);
    (linksBySucc[id] || []).forEach(link => {
      remainingSuccessors[link.predId]--;
      if (remainingSuccessors[link.predId] === 0) queue.push(link.predId);
    });
  }
  const hasCycle = order.length < nodeIds.size;

  const endOf = (id: string) => (data[id] as ChartRow).plannedEndDate;
  const startOf = (id: string) => (data[id] as ChartRow).plannedStartDate;

  // プロジェクト終了日 = ネットワーク参加タスクの最遅終了日。
  let projectEnd = '';
  order.forEach(id => {
    if (projectEnd === '' || +cdate(endOf(id)) > +cdate(projectEnd)) {
      projectEnd = endOf(id);
    }
  });

  // 後退パス: TF = min(プロジェクト終了日までの余裕, 各後続の TF + リンクスラック)。
  // リンクスラック = 先行終了と後続開始の間の稼働日数 - 1 - lag
  // (後続が先行終了の翌稼働日に開始し lag 0 ならスラック 0)。
  const floatByTaskId: { [id: string]: number } = {};
  order.forEach(id => {
    let totalFloat = gapWorkdays(endOf(id), projectEnd, holidays, regularDaysOff);
    (linksByPred[id] || []).forEach(link => {
      const succFloat = floatByTaskId[link.succId];
      if (succFloat === undefined) return; // 後続が循環に巻き込まれている場合
      const linkSlack = gapWorkdays(endOf(id), startOf(link.succId), holidays, regularDaysOff) - 1 - link.lag;
      totalFloat = Math.min(totalFloat, succFloat + linkSlack);
    });
    floatByTaskId[id] = totalFloat;
  });

  const criticalIds = new Set<string>();
  order.forEach(id => {
    if (floatByTaskId[id] <= 0) criticalIds.add(id);
  });
  return { criticalIds, floatByTaskId, hasCycle };
};

// セル表示用テキスト: 先行タスクの現在の行番号(No)で表す。"3, 5+2, 7-1" 形式。
export const formatCpPredecessorsText = (
  row: ChartRow,
  data: { [id: string]: WBSData }
): string => {
  return sanitizeCpPredecessors(row.cpPredecessors, row.id)
    .filter(pred => isChartRow(data[pred.predecessorId]))
    .map(pred => {
      const no = data[pred.predecessorId].no;
      const lag = pred.lag ?? 0;
      if (lag === 0) return `${no}`;
      return lag > 0 ? `${no}+${lag}` : `${no}${lag}`;
    })
    .join(', ');
};

export const buildCpDisplayTextMap = (
  data: { [id: string]: WBSData }
): { [id: string]: string } => {
  const map: { [id: string]: string } = {};
  Object.values(data).forEach(row => {
    if (isChartRow(row) && row.cpPredecessors && row.cpPredecessors.length > 0) {
      map[row.id] = formatCpPredecessorsText(row, data);
    }
  });
  return map;
};

// セル入力のパース: 行番号(+/-lag 付き)のカンマ・空白区切り。"3, 5+2 7-1" など。
// 解釈できないトークン・存在しない行番号・自己参照・重複は黙って捨てる
// (アプリ全体の寛容な入力解釈と同じ方針)。
export const parseCpPredecessorsText = (
  text: string,
  data: { [id: string]: WBSData },
  selfId: string
): CpPredecessor[] => {
  const noToId: { [no: number]: string } = {};
  Object.values(data).forEach(row => {
    if (isChartRow(row)) noToId[row.no] = row.id;
  });
  const seen = new Set<string>();
  const result: CpPredecessor[] = [];
  text.split(/[,、\s]+/).forEach(token => {
    const match = token.match(/^(\d{1,4})(?:([+-])(\d{1,3}))?$/);
    if (!match) return;
    const predecessorId = noToId[parseInt(match[1], 10)];
    if (!predecessorId || predecessorId === selfId || seen.has(predecessorId)) return;
    seen.add(predecessorId);
    const lag = match[2] ? (match[2] === '-' ? -1 : 1) * parseInt(match[3], 10) : 0;
    result.push(lag === 0 ? { predecessorId } : { predecessorId, lag });
  });
  return result;
};
