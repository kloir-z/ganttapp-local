// utils/wbsHelpers.ts
import { v4 as uuidv4 } from 'uuid';
import { DateFormatType, WBSData } from '../../../types/DataTypes';
import { parse, format } from 'date-fns';

export const assignIds = (data: WBSData[]): { [id: string]: WBSData } => {
  const dataWithIdsAndNos: { [id: string]: WBSData } = {};
  data.forEach((row, index) => {
    const id = row.id || uuidv4();
    dataWithIdsAndNos[id] = { ...row, id, no: index + 1 };
  });
  return dataWithIdsAndNos;
};

export const reorderArray = <T extends { id: string }>(arr: T[], indexesToMove: number[], newIndex: number): T[] => {
  const itemsToMove = indexesToMove.map(index => arr[index]);
  const remainingItems = arr.filter((_, index) => !indexesToMove.includes(index));
  const maxIndexToMove = Math.max(...indexesToMove);

  if (maxIndexToMove < newIndex) {
    newIndex -= indexesToMove.length - 1;
  }

  if (newIndex > arr.length - indexesToMove.length) {
    newIndex = arr.length - indexesToMove.length;
  } else if (newIndex < 0) {
    newIndex = 0;
  }

  const start = remainingItems.slice(0, newIndex);
  const end = remainingItems.slice(newIndex);

  return [...start, ...itemsToMove, ...end];
};

const dateCache = {
  text: new Map<string, string>(),
  longFormat: new Map<string, string>(),
  shortFormat: new Map<string, string>()
};

export function standardizeShortDateFormat(dateStr: string, dateFormat: DateFormatType) {
  if (dateCache.shortFormat.has(dateStr)) {
    return dateCache.shortFormat.get(dateStr);
  }
  const formatMap = {
    'yyyy/MM/dd': 'MM/dd',
    'MM/dd/yyyy': 'MM/dd',
    'dd/MM/yyyy': 'dd/MM',
    'yyyy/M/d': 'M/d',
    'M/d/yyyy': 'M/d',
    'd/M/yyyy': 'd/M',
  };

  const targetFormat = formatMap[dateFormat];
  let result = dateStr;

  const parsedDate = parse(dateStr, 'yyyy/MM/dd', new Date());
  if (!isNaN(parsedDate.getTime())) {
    result = format(parsedDate, targetFormat);
  }

  dateCache.shortFormat.set(`${dateFormat}${dateStr}`, result);
  return result;
}

export function standardizeLongDateFormatText(dateStr: string, dateFormat: DateFormatType) {
  if (dateCache.text.has(dateStr)) {
    return dateCache.text.get(dateStr);
  }

  const formatMap = {
    'yyyy/MM/dd': ['yyyy/MM/dd', 'yyyy-MM-dd'],
    'MM/dd/yyyy': ['MM/dd/yyyy', 'MM-dd-yyyy'],
    'dd/MM/yyyy': ['dd/MM/yyyy', 'dd-MM-yyyy'],
    'yyyy/M/d': ['yyyy/M/d', 'yyyy-M-d'],
    'M/d/yyyy': ['M/d/yyyy', 'M-d-yyyy'],
    'd/M/yyyy': ['d/M/yyyy', 'd-M-yyyy']
  };
  const targetFormats = formatMap[dateFormat] || [];
  let result = dateStr;

  for (const fmt of targetFormats) {
    try {
      const parsedDate = parse(dateStr, fmt, new Date());
      if (!isNaN(parsedDate.getTime())) {
        result = format(parsedDate, 'yyyy/M/d');
        break;
      }
    } catch (e) {
      result = '';
      continue;
    }
  }

  dateCache.text.set(`${dateFormat}${dateStr}`, result);
  return result;
}

export function standardizeLongDateFormat(dateStr: string, dateFormat: DateFormatType) {
  if (dateCache.longFormat.has(dateStr)) {
    return dateCache.longFormat.get(dateStr);
  }
  const formatMap = {
    'yyyy/MM/dd': 'yyyy/MM/dd',
    'MM/dd/yyyy': 'MM/dd/yyyy',
    'dd/MM/yyyy': 'dd/MM/yyyy',
    'yyyy/M/d': 'yyyy/M/d',
    'M/d/yyyy': 'M/d/yyyy',
    'd/M/yyyy': 'd/M/yyyy'
  };
  const targetFormat = formatMap[dateFormat];
  let result = dateStr;

  const parsedDate = parse(dateStr, 'yyyy/MM/dd', new Date());
  if (!isNaN(parsedDate.getTime())) {
    result = format(parsedDate, targetFormat);
  }

  dateCache.longFormat.set(`${dateFormat}${dateStr}`, result);
  return result;
}

/**
 * ユーザーが手入力した日付文字列を柔軟に解釈し、正準形 'yyyy/MM/dd' を返す(解釈不能なら null)。
 * Excelライクな省略入力に対応する:
 *   - 'yyyy/m/d'(または現在の dateFormat の並び)      → そのまま
 *   - 4桁の年トークンがあればその並びに関わらず年として扱う('2026/8/4' など)
 *   - 'yyyy/mm'(年＋月の2要素)                         → 日を 1 に補完
 *   - 'm/d'(年を含まない2要素)                          → fallbackYear で年を補完
 *   - 'yyyymmdd'(8桁連結)                              → 分解
 * 区切りは '/' '-' '.' 空白いずれも許容。
 */
export function parseFlexibleDate(
  input: string,
  dateFormat: DateFormatType,
  fallbackYear: number
): string | null {
  if (!input) return null;
  const cleaned = input
    .trim()
    .replace(/[.\-\s]+/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\/|\/$/g, '');
  if (!cleaned) return null;

  let parts: string[];
  if (/^\d{8}$/.test(cleaned)) {
    parts = [cleaned.slice(0, 4), cleaned.slice(4, 6), cleaned.slice(6, 8)];
  } else {
    parts = cleaned.split('/');
  }
  if (parts.length < 2 || parts.length > 3) return null;
  if (parts.some(p => !/^\d{1,4}$/.test(p))) return null;
  const nums = parts.map(Number);

  const dayFirst = dateFormat === 'dd/MM/yyyy' || dateFormat === 'd/M/yyyy';
  const monthFirst = dateFormat === 'MM/dd/yyyy' || dateFormat === 'M/d/yyyy';
  const yearIdx = parts.findIndex(p => p.length === 4);

  let year: number;
  let month: number;
  let day: number;

  if (nums.length === 3) {
    if (yearIdx === 1) {
      // 年が真ん中(月/年/日 等)は曖昧なので不可
      return null;
    } else if (yearIdx === 0) {
      // 年が先頭 → ISO並び(年/月/日)とみなす
      [year, month, day] = nums;
    } else if (yearIdx === 2) {
      // 年が末尾 → 先頭2つは dateFormat の並びに従う
      year = nums[2];
      if (dayFirst) { [day, month] = nums; } else { [month, day] = nums; }
    } else if (dayFirst) {
      [day, month, year] = nums;
    } else if (monthFirst) {
      [month, day, year] = nums;
    } else {
      [year, month, day] = nums;
    }
  } else {
    // 2要素
    if (yearIdx !== -1) {
      year = nums[yearIdx];
      month = nums[yearIdx === 0 ? 1 : 0];
      day = 1;
    } else {
      year = fallbackYear;
      if (dayFirst) { [day, month] = nums; } else { [month, day] = nums; }
    }
  }

  if (year < 100) year += 2000;
  if (!month || month < 1 || month > 12) return null;
  if (!day || day < 1 || day > 31) return null;

  // 月末日の妥当性(2/30 などを弾く)
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return null;
  }

  return `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
}