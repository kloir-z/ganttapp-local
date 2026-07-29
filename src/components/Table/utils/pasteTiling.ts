// pasteTiling.ts
// 「選択範囲いっぱいに繰り返し貼り付ける」(Excel ライク)ためのクリップボード加工。
//
// ReactGrid の貼り付け(pasteData)は、選択範囲の左上を起点にコピー元のブロックサイズぶんだけ
// 書き込む。コピー元が1セルのときだけは ReactGrid 自身が選択範囲全体を埋めるが、
// 「1行ぶんの予定開始/終了(1行×2列)をコピー → 複数行を選択して貼り付け」では
// 先頭行にしか入らない。
//
// ここではクリップボードの中身自体を選択範囲のサイズまでタイル状に複製する。
// 加工後の内容で貼り付けイベントを投げ直せば、セルの型解決・正規化・undo 処理は
// ReactGrid と既存の handleGridChanges の経路をそのまま通せる。

export interface PasteTarget {
  /** 貼り付け先として選択されている行数 */
  rowCount: number;
  /** 貼り付け先として選択されている列数 */
  columnCount: number;
}

// ReactGrid が自身のコピー内容につける目印(コピー元セルの型情報が data-reactgrid に載る)
const CLIPBOARD_MARKER = 'reactgrid-content';

const parseHtml = (html: string): Document => new DOMParser().parseFromString(html, 'text/html');

// ReactGrid の貼り付け処理と同じ判定(body の先頭要素が目印つきの table か)
const getReactGridTable = (html: string): Element | null => {
  if (!html) return null;
  const root = parseHtml(html).body.firstElementChild;
  return root?.getAttribute('data-reactgrid') === CLIPBOARD_MARKER ? root : null;
};

/** ReactGrid 自身がコピーした HTML(セルの型情報つき)かどうか */
export const isReactGridClipboardHtml = (html: string): boolean => getReactGridTable(html) !== null;

/** 選択範囲がコピー元より広いときだけ複製する(1セルのコピーは ReactGrid 側が範囲を埋める) */
const needsTiling = (sourceRowCount: number, sourceColumnCount: number, target: PasteTarget): boolean => {
  if (sourceRowCount === 0 || sourceColumnCount === 0) return false;
  if (sourceRowCount === 1 && sourceColumnCount === 1) return false;
  return target.rowCount > sourceRowCount || target.columnCount > sourceColumnCount;
};

/**
 * ReactGrid 形式の HTML クリップボードを選択範囲のサイズまで繰り返す。
 * 加工不要(コピー元が選択範囲以上/1セル/ReactGrid 形式でない)なら null。
 */
export const tileClipboardHtml = (html: string, target: PasteTarget): string | null => {
  const table = getReactGridTable(html);
  // table > tbody > tr > td(td の data-reactgrid にセルの JSON が入る)
  const rowsParent = table?.firstElementChild;
  if (!table || !rowsParent) return null;

  const sourceRows = Array.from(rowsParent.children).map(row => ({ row, cells: Array.from(row.children) }));
  const sourceRowCount = sourceRows.length;
  const sourceColumnCount = sourceRows.reduce((max, { cells }) => Math.max(max, cells.length), 0);
  if (!needsTiling(sourceRowCount, sourceColumnCount, target)) return null;

  const rowCount = Math.max(sourceRowCount, target.rowCount);
  const columnCount = Math.max(sourceColumnCount, target.columnCount);
  const tiledParent = rowsParent.cloneNode(false);
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    const { row, cells } = sourceRows[rowIndex % sourceRowCount];
    const tiledRow = row.cloneNode(false);
    for (let columnIndex = 0; cells.length > 0 && columnIndex < columnCount; columnIndex++) {
      tiledRow.appendChild(cells[columnIndex % cells.length].cloneNode(true));
    }
    tiledParent.appendChild(tiledRow);
  }
  table.replaceChild(tiledParent, rowsParent);
  return table.outerHTML;
};

/**
 * プレーンテキスト(Excel などからの TSV)を選択範囲のサイズまで繰り返す。
 * 加工不要なら null。
 */
export const tileClipboardText = (text: string, target: PasteTarget): string | null => {
  if (!text) return null;
  // 末尾の改行(Excel は "\r\n" で終わる)は空行として数えない
  const sourceRows = text
    .replace(/(\r?\n)+$/, '')
    .split('\n')
    .map(line => line.replace(/\r$/, '').split('\t'));
  const sourceRowCount = sourceRows.length;
  const sourceColumnCount = sourceRows.reduce((max, cells) => Math.max(max, cells.length), 0);
  if (!needsTiling(sourceRowCount, sourceColumnCount, target)) return null;

  const rowCount = Math.max(sourceRowCount, target.rowCount);
  const columnCount = Math.max(sourceColumnCount, target.columnCount);
  const tiledRows: string[] = [];
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    const cells = sourceRows[rowIndex % sourceRowCount];
    const tiledCells: string[] = [];
    for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
      tiledCells.push(cells[columnIndex % cells.length]);
    }
    tiledRows.push(tiledCells.join('\t'));
  }
  return tiledRows.join('\n');
};
