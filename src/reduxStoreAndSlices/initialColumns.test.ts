// initialColumns.test.ts
// 旧プロジェクトの列リストへ後付け列(Text4〜7)を注入する移行関数のテスト。
import { ensureExtendedTextColumns, initialColumns, TEXT_COLUMN_IDS } from './initialColumns';

describe('ensureExtendedTextColumns', () => {
  const legacyColumns = [
    { columnId: 'no', columnName: 'No', visible: true },
    { columnId: 'displayName', columnName: 'DisplayName', visible: true },
    { columnId: 'textColumn1', columnName: 'Text1', visible: true },
    { columnId: 'textColumn2', columnName: 'Text2', visible: true },
    { columnId: 'textColumn3', columnName: 'Text3', visible: true },
    { columnId: 'isIncludeHolidays', columnName: 'IncHol', visible: true },
  ];

  test('旧列リストに Text4〜7 を非表示で注入する(Text3 の直後)', () => {
    const result = ensureExtendedTextColumns(legacyColumns);
    const ids = result.map(c => c.columnId);
    expect(ids).toEqual([
      'no', 'displayName', 'textColumn1', 'textColumn2', 'textColumn3',
      'textColumn4', 'textColumn5', 'textColumn6', 'textColumn7', 'isIncludeHolidays',
    ]);
    const injected = result.filter(c => ['textColumn4', 'textColumn5', 'textColumn6', 'textColumn7'].includes(c.columnId));
    injected.forEach(c => {
      expect((c as { visible?: boolean }).visible).toBe(false);
    });
  });

  test('冪等: すでに全列がある場合は変更しない', () => {
    const result = ensureExtendedTextColumns(initialColumns);
    expect(result).toBe(initialColumns);
  });

  test('テキスト列が1つもない列リストでは isIncludeHolidays の前に注入する', () => {
    const cols = [
      { columnId: 'no', columnName: 'No', visible: true },
      { columnId: 'isIncludeHolidays', columnName: 'IncHol', visible: true },
    ];
    const result = ensureExtendedTextColumns(cols);
    const ids = result.map(c => c.columnId);
    expect(ids.indexOf('textColumn1')).toBeLessThan(ids.indexOf('isIncludeHolidays'));
    expect(ids).toEqual(expect.arrayContaining([...TEXT_COLUMN_IDS]));
  });

  test('initialColumns は Text4〜7 をデフォルト非表示で含む', () => {
    const t4to7 = initialColumns.filter(c => ['textColumn4', 'textColumn5', 'textColumn6', 'textColumn7'].includes(c.columnId));
    expect(t4to7).toHaveLength(4);
    t4to7.forEach(c => expect(c.visible).toBe(false));
  });
});
