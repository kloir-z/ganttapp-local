// コピー内容の組み立て(タブ区切りテキスト / ReactGrid 形式 HTML)のテスト。
import { buildClipboardHtml, buildClipboardTsv, cellToClipboardText } from './clipboardCopy';
import { isReactGridClipboardHtml, tileClipboardHtml } from './pasteTiling';

const options = { showYear: true, dateFormat: 'yyyy/MM/dd' } as const;

const toCells = (rows: { cell: unknown }[][]) =>
  rows.map(cells => cells.map(({ cell }) => ({ cell, text: cellToClipboardText(cell, options) })));

describe('cellToClipboardText', () => {
  test('日付セルは表示書式(年つき)にする', () => {
    expect(cellToClipboardText({ type: 'customDate', text: '2026/07/05' }, options)).toBe('2026/07/05');
    expect(cellToClipboardText({ type: 'customDate', text: '2026/07/05' }, { showYear: true, dateFormat: 'M/d/yyyy' }))
      .toBe('7/5/2026');
  });

  test('年を隠す設定なら画面表示どおり年なしにする', () => {
    expect(cellToClipboardText({ type: 'customDate', text: '2026/07/05' }, { showYear: false, dateFormat: 'yyyy/MM/dd' }))
      .toBe('07/05');
  });

  test('日付が空なら空文字', () => {
    expect(cellToClipboardText({ type: 'customDate', text: '' }, options)).toBe('');
  });

  test('番号セルは値を、チェックボックスは TRUE/FALSE を返す', () => {
    expect(cellToClipboardText({ type: 'number', value: 12 }, options)).toBe('12');
    expect(cellToClipboardText({ type: 'checkbox', checked: true }, options)).toBe('TRUE');
    expect(cellToClipboardText({ type: 'checkbox', checked: false }, options)).toBe('FALSE');
  });

  test('テキスト系セルは text をそのまま返す', () => {
    expect(cellToClipboardText({ type: 'customText', text: '設計' }, options)).toBe('設計');
    expect(cellToClipboardText({ type: 'separator', text: '第1章' }, options)).toBe('第1章');
  });
});

describe('buildClipboardTsv', () => {
  test('列はタブ、行は改行で区切る', () => {
    const tsv = buildClipboardTsv(toCells([
      [{ cell: { type: 'customText', text: '設計' } }, { cell: { type: 'customDate', text: '2026/07/05' } }],
      [{ cell: { type: 'customText', text: '製造' } }, { cell: { type: 'customDate', text: '2026/07/06' } }],
    ]));
    expect(tsv).toBe('設計\t2026/07/05\r\n製造\t2026/07/06');
  });

  test('タブや改行を含むセルは引用符で囲む', () => {
    const tsv = buildClipboardTsv([
      [{ cell: {}, text: '1行目\n2行目' }, { cell: {}, text: 'a"b' }],
    ]);
    expect(tsv).toBe('"1行目\n2行目"\t"a""b"');
  });
});

describe('buildClipboardHtml', () => {
  const rows = toCells([
    [{ cell: { type: 'customText', text: '設計' } }, { cell: { type: 'customDate', text: '2026/07/05' } }],
    [{ cell: { type: 'customText', text: '製造' } }, { cell: { type: 'customDate', text: '2026/07/06' } }],
  ]);

  test('ReactGrid 形式(貼り付け時に型を解決できる HTML)になる', () => {
    const html = buildClipboardHtml(rows);
    expect(isReactGridClipboardHtml(html)).toBe(true);

    const table = new DOMParser().parseFromString(html, 'text/html').body.firstElementChild!;
    const firstCell = table.querySelector('td')!;
    expect(JSON.parse(firstCell.getAttribute('data-reactgrid')!)).toEqual({ type: 'customText', text: '設計' });
    expect(table.querySelectorAll('tr')).toHaveLength(2);
    expect(table.querySelectorAll('tr')[0].children).toHaveLength(2);
  });

  test('範囲貼り付けのタイル化(pasteTiling)がそのまま使える', () => {
    const tiled = tileClipboardHtml(buildClipboardHtml(rows), { rowCount: 4, columnCount: 2 });
    const table = new DOMParser().parseFromString(tiled!, 'text/html').body.firstElementChild!;
    expect(table.querySelectorAll('tr')).toHaveLength(4);
    expect(table.querySelectorAll('tr')[2].children[0].textContent).toBe('設計');
  });
});
