// 選択範囲いっぱいに繰り返し貼り付けるためのクリップボード加工のテスト。
// 「1行ぶんの予定開始/終了をコピー → 複数行を選択して貼り付けると先頭行にしか入らない」
// という挙動の回帰テストを兼ねる。
import { isReactGridClipboardHtml, tileClipboardHtml, tileClipboardText } from './pasteTiling';

const cell = (text: string) =>
  `<td data-reactgrid="${JSON.stringify({ type: 'customDate', text }).replace(/"/g, '&quot;')}">${text}</td>`;

const reactGridHtml = (rows: string[][]): string =>
  `<table data-reactgrid="reactgrid-content" empty-cells="show"><tbody>${rows
    .map(row => `<tr>${row.map(cell).join('')}</tr>`)
    .join('')}</tbody></table>`;

// 加工後の HTML を ReactGrid の貼り付け処理と同じ手順で 2次元配列へ戻す
const parseTiled = (html: string): string[][] => {
  const table = new DOMParser().parseFromString(html, 'text/html').body.firstElementChild;
  expect(table?.getAttribute('data-reactgrid')).toBe('reactgrid-content');
  const rowsParent = table?.firstElementChild;
  return Array.from(rowsParent?.children ?? []).map(row =>
    Array.from(row.children).map(td => JSON.parse(td.getAttribute('data-reactgrid') ?? '{}').text)
  );
};

describe('tileClipboardHtml', () => {
  it('1行×2列のコピーを、選択した4行×2列すべてに繰り返す', () => {
    const html = reactGridHtml([['2026-07-01', '2026-07-03']]);
    const tiled = tileClipboardHtml(html, { rowCount: 4, columnCount: 2 });
    expect(tiled).not.toBeNull();
    expect(parseTiled(tiled as string)).toEqual([
      ['2026-07-01', '2026-07-03'],
      ['2026-07-01', '2026-07-03'],
      ['2026-07-01', '2026-07-03'],
      ['2026-07-01', '2026-07-03'],
    ]);
  });

  it('複数行のコピーは一塊のまま選択範囲内で繰り返す', () => {
    const html = reactGridHtml([
      ['a1', 'b1'],
      ['a2', 'b2'],
    ]);
    const tiled = tileClipboardHtml(html, { rowCount: 5, columnCount: 2 });
    expect(parseTiled(tiled as string)).toEqual([
      ['a1', 'b1'],
      ['a2', 'b2'],
      ['a1', 'b1'],
      ['a2', 'b2'],
      // 割り切れない場合は途中で切れる(選択範囲を超えて貼り付けない)
      ['a1', 'b1'],
    ]);
  });

  it('列方向にも繰り返す', () => {
    const html = reactGridHtml([['a', 'b']]);
    const tiled = tileClipboardHtml(html, { rowCount: 1, columnCount: 5 });
    expect(parseTiled(tiled as string)).toEqual([['a', 'b', 'a', 'b', 'a']]);
  });

  it('セルの型情報(data-reactgrid)を保ったまま複製する', () => {
    const html = reactGridHtml([['2026-07-01', '2026-07-03']]);
    const tiled = tileClipboardHtml(html, { rowCount: 2, columnCount: 2 }) as string;
    const table = new DOMParser().parseFromString(tiled, 'text/html').body.firstElementChild;
    const cells = Array.from(table?.querySelectorAll('td') ?? []);
    expect(cells).toHaveLength(4);
    cells.forEach(td => expect(JSON.parse(td.getAttribute('data-reactgrid') ?? '{}').type).toBe('customDate'));
  });

  it('1セルのコピーは加工しない(ReactGrid 自身が選択範囲を埋めるため)', () => {
    expect(tileClipboardHtml(reactGridHtml([['a']]), { rowCount: 4, columnCount: 1 })).toBeNull();
  });

  it('選択範囲がコピー元以下なら加工しない', () => {
    const html = reactGridHtml([
      ['a1', 'b1'],
      ['a2', 'b2'],
    ]);
    expect(tileClipboardHtml(html, { rowCount: 2, columnCount: 2 })).toBeNull();
    expect(tileClipboardHtml(html, { rowCount: 1, columnCount: 1 })).toBeNull();
  });

  it('ReactGrid 形式でない HTML は加工しない', () => {
    expect(tileClipboardHtml('<table><tbody><tr><td>a</td><td>b</td></tr></tbody></table>', { rowCount: 3, columnCount: 2 })).toBeNull();
    expect(tileClipboardHtml('', { rowCount: 3, columnCount: 2 })).toBeNull();
  });
});

describe('tileClipboardText', () => {
  it('Excel からの TSV(末尾 CRLF)を選択行数ぶん繰り返す', () => {
    expect(tileClipboardText('2026-07-01\t2026-07-03\r\n', { rowCount: 3, columnCount: 2 })).toBe(
      '2026-07-01\t2026-07-03\n2026-07-01\t2026-07-03\n2026-07-01\t2026-07-03'
    );
  });

  it('複数行の TSV を一塊のまま繰り返す', () => {
    expect(tileClipboardText('a1\tb1\r\na2\tb2\r\n', { rowCount: 4, columnCount: 2 })).toBe(
      'a1\tb1\na2\tb2\na1\tb1\na2\tb2'
    );
  });

  it('列方向にも繰り返す', () => {
    expect(tileClipboardText('a\tb', { rowCount: 1, columnCount: 5 })).toBe('a\tb\ta\tb\ta');
  });

  it('1セルのコピーや選択範囲がコピー元以下なら加工しない', () => {
    expect(tileClipboardText('a\r\n', { rowCount: 5, columnCount: 1 })).toBeNull();
    expect(tileClipboardText('a\tb', { rowCount: 1, columnCount: 2 })).toBeNull();
    expect(tileClipboardText('', { rowCount: 5, columnCount: 2 })).toBeNull();
  });
});

describe('isReactGridClipboardHtml', () => {
  it('ReactGrid のコピー内容だけを見分ける', () => {
    expect(isReactGridClipboardHtml(reactGridHtml([['a']]))).toBe(true);
    expect(isReactGridClipboardHtml('<table><tbody><tr><td>a</td></tr></tbody></table>')).toBe(false);
    expect(isReactGridClipboardHtml('')).toBe(false);
  });
});
