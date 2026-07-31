// clipboardCopy.ts
// 選択範囲のコピー内容(text/html と text/plain)を組み立てる。
//
// ReactGrid のコピーは text/plain にコピー用テーブルの textContent をそのまま書くため、
// 区切り文字が一切入らずメモ帳などに貼ると1行の長い文字列になってしまう。
// ここで行=改行・列=タブ(TSV)のプレーンテキストを自前で組み立てる。
// text/html は ReactGrid と同じ形式(テーブルに data-reactgrid="reactgrid-content"、
// 各セルに元セルの JSON)で作るので、アプリ内へ貼り戻したときの型解決や
// 範囲貼り付けのタイル化(pasteTiling.ts)はこれまで通り動く。

import { DateFormatType } from '../../../types/DataTypes';
import { standardizeLongDateFormat, standardizeLongDateFormatText, standardizeShortDateFormat } from './wbsHelpers';

export interface ClipboardCell {
  /** 元のセル(貼り戻したときの型解決のため data-reactgrid にそのまま載せる) */
  cell: unknown;
  /** プレーンテキスト側に書く表示テキスト */
  text: string;
}

export interface ClipboardTextOptions {
  showYear: boolean;
  dateFormat: DateFormatType;
}

// ReactGrid が自身のコピー内容につける目印(pasteTiling.ts と同じ)
const CLIPBOARD_MARKER = 'reactgrid-content';

/** セルを画面表示どおりのテキストにする(日付は年表示の設定に従う) */
export const cellToClipboardText = (cell: unknown, { showYear, dateFormat }: ClipboardTextOptions): string => {
  const source = (cell ?? {}) as { type?: string; text?: unknown; value?: unknown; checked?: boolean };
  switch (source.type) {
    case 'customDate': {
      const normalized = standardizeLongDateFormatText(String(source.text ?? ''), dateFormat) || '';
      if (!normalized) return '';
      const formatted = showYear
        ? standardizeLongDateFormat(normalized, dateFormat)
        : standardizeShortDateFormat(normalized, dateFormat);
      return formatted || '';
    }
    case 'checkbox':
      return source.checked ? 'TRUE' : 'FALSE';
    case 'number': {
      const value = source.value;
      return typeof value === 'number' && !Number.isNaN(value) ? String(value) : '';
    }
    default:
      return String(source.text ?? '');
  }
};

// タブ・改行・引用符を含むセルは Excel と同じ規則で引用符で囲む
const escapeTsvField = (text: string): string =>
  /[\t\r\n"]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;

/** 行=改行(CRLF)・列=タブのプレーンテキスト */
export const buildClipboardTsv = (rows: ClipboardCell[][]): string =>
  rows.map(cells => cells.map(({ text }) => escapeTsvField(text)).join('\t')).join('\r\n');

/** ReactGrid 形式(セルの型情報つき)の HTML */
export const buildClipboardHtml = (rows: ClipboardCell[][]): string => {
  const table = document.createElement('table');
  table.setAttribute('empty-cells', 'show');
  table.setAttribute('data-reactgrid', CLIPBOARD_MARKER);
  const tbody = document.createElement('tbody');
  rows.forEach(cells => {
    const tableRow = document.createElement('tr');
    cells.forEach(({ cell, text }) => {
      const tableCell = document.createElement('td');
      // 空セルもセルとして残すため、ReactGrid と同じく空文字は空白1つにする
      tableCell.textContent = text || ' ';
      tableCell.setAttribute('data-reactgrid', JSON.stringify(cell ?? { type: 'text', text: '' }));
      tableRow.appendChild(tableCell);
    });
    tbody.appendChild(tableRow);
  });
  table.appendChild(tbody);
  return table.outerHTML;
};
