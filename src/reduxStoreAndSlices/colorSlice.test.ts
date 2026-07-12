// colorSlice.test.ts
// 色分け基準列(カラースキーム)まわりのリデューサとヘルパーのテスト。
import reducer, {
  switchColorBasis,
  autoAssignColors,
  updateColor,
  updateAlias,
  updateEntireColorSettings,
  setEntireColorState,
  addColorInfo,
  removeColorInfo,
  getColorSourceValue,
  resolveColorFromPalette,
  collectBasisValues,
  generateAutoColor,
  ColorState,
} from './colorSlice';
import { ChartRow, WBSData } from '../types/DataTypes';

const initial = (): ColorState => reducer(undefined, { type: '@@INIT' });

const chartRow = (id: string, over: Partial<ChartRow> = {}): ChartRow => ({
  rowType: 'Chart',
  no: 1,
  id,
  displayName: '',
  textColumn1: '',
  textColumn2: '',
  textColumn3: '',
  color: '',
  plannedStartDate: '',
  plannedEndDate: '',
  plannedDays: null,
  actualStartDate: '',
  actualEndDate: '',
  progress: '',
  dependentId: '',
  dependency: '',
  isIncludeHolidays: false,
  ...over,
});

describe('colorSlice: switchColorBasis', () => {
  test('新しい基準列に切り替えるとスキームが作られ、ユニーク値へ自動で色が割り当てられる', () => {
    const state = reducer(initial(), switchColorBasis({
      columnId: 'textColumn1',
      uniqueValues: ['A社', 'B社'],
    }));
    expect(state.basisColumnId).toBe('textColumn1');
    const aliases = Object.entries(state.colors)
      .filter(([id]) => Number(id) !== 999)
      .map(([, info]) => info.alias);
    expect(aliases).toContain('A社');
    expect(aliases).toContain('B社');
    // 実績色(999)は引き継がれる
    expect(state.colors[999]).toBeDefined();
    // 元の color スキームは保持されている
    expect(state.schemes.color).toBeDefined();
  });

  test('切り替え前のパレットは基準列ごとに保持され、往復しても失われない', () => {
    let state = reducer(initial(), updateAlias({ id: 1, alias: '重要' }));
    const originalColor1 = state.colors[1].color;
    state = reducer(state, switchColorBasis({ columnId: 'textColumn2', uniqueValues: ['佐藤'] }));
    // 別スキームを編集
    state = reducer(state, updateAlias({ id: 1, alias: '鈴木' }));
    // color 基準に戻す
    state = reducer(state, switchColorBasis({ columnId: 'color', uniqueValues: [] }));
    expect(state.basisColumnId).toBe('color');
    expect(state.colors[1].alias).toBe('重要');
    expect(state.colors[1].color).toBe(originalColor1);
    // textColumn2 側の編集も残っている
    expect(state.schemes.textColumn2.colors[1].alias).toBe('鈴木');
  });

  test('既存スキームへの切り替えでは未登録の値だけが追記される', () => {
    let state = reducer(initial(), switchColorBasis({ columnId: 'textColumn1', uniqueValues: ['A'] }));
    state = reducer(state, switchColorBasis({ columnId: 'color', uniqueValues: [] }));
    state = reducer(state, switchColorBasis({ columnId: 'textColumn1', uniqueValues: ['A', 'B'] }));
    const aliases = Object.entries(state.colors)
      .filter(([id]) => Number(id) !== 999)
      .map(([, info]) => info.alias);
    expect(aliases.filter(a => a === 'A')).toHaveLength(1);
    expect(aliases).toContain('B');
  });

  test('不正な列IDは無視される', () => {
    const before = initial();
    const state = reducer(before, switchColorBasis({ columnId: 'progress', uniqueValues: ['x'] }));
    expect(state.basisColumnId).toBe('color');
  });
});

describe('colorSlice: autoAssignColors', () => {
  test('空きスロットから順に埋め、足りなければエントリを追加する', () => {
    // 初期パレットは10スロット(全て alias 空)
    const state = reducer(initial(), autoAssignColors({
      uniqueValues: Array.from({ length: 12 }, (_, i) => `値${i}`),
    }));
    const entries = Object.entries(state.colors).filter(([id]) => Number(id) !== 999);
    expect(entries.length).toBe(12);
    const aliases = entries.map(([, info]) => info.alias);
    expect(aliases).toContain('値0');
    expect(aliases).toContain('値11');
    // 既存エイリアスと重複する値は追加されない
    const again = reducer(state, autoAssignColors({ uniqueValues: ['値0'] }));
    expect(Object.keys(again.colors).length).toBe(Object.keys(state.colors).length);
  });

  test('カンマ区切りエイリアスに含まれる値は登録済みとして扱う', () => {
    let state = reducer(initial(), updateAlias({ id: 1, alias: 'A, B' }));
    state = reducer(state, autoAssignColors({ uniqueValues: ['B', 'C'] }));
    const aliases = Object.entries(state.colors)
      .filter(([id]) => Number(id) !== 999)
      .map(([, info]) => info.alias);
    // B は既存(スロット1)に含まれるので新規登録されない
    expect(aliases.filter(a => a === 'B')).toHaveLength(0);
    expect(aliases).toContain('C');
  });
});

describe('colorSlice: 実績色(999)と永続化', () => {
  test('999の色変更は全スキームへ反映される', () => {
    let state = reducer(initial(), switchColorBasis({ columnId: 'textColumn1', uniqueValues: [] }));
    state = reducer(state, updateColor({ id: 999, color: '#12345678' }));
    expect(state.schemes.color.colors[999].color).toBe('#12345678');
    expect(state.schemes.textColumn1.colors[999].color).toBe('#12345678');
  });

  test('updateEntireColorSettings(旧形式読込)は color 基準へ戻す', () => {
    let state = reducer(initial(), switchColorBasis({ columnId: 'textColumn3', uniqueValues: ['x'] }));
    const legacy = { 1: { alias: 'red', color: '#f00' }, 999: { alias: '', color: '#0003' } };
    state = reducer(state, updateEntireColorSettings(legacy));
    expect(state.basisColumnId).toBe('color');
    expect(state.colors[1].alias).toBe('red');
    expect(state.schemes.textColumn3).toBeUndefined();
  });

  test('setEntireColorState(新形式読込)はスキーム一式と基準列を復元する', () => {
    const schemes = {
      color: { colors: { 1: { alias: '', color: '#aaa' }, 999: { alias: '', color: '#0003' } }, fallbackColor: '#ccc' },
      textColumn1: { colors: { 1: { alias: 'A社', color: '#bbb' }, 999: { alias: '', color: '#0003' } }, fallbackColor: '#ddd' },
    };
    const state = reducer(initial(), setEntireColorState({ schemes, basisColumnId: 'textColumn1' }));
    expect(state.basisColumnId).toBe('textColumn1');
    expect(state.colors[1].alias).toBe('A社');
    expect(state.fallbackColor).toBe('#ddd');
  });

  test('setEntireColorState は不正な基準列を color にフォールバックする', () => {
    const schemes = {
      color: { colors: { 999: { alias: '', color: '#0003' } }, fallbackColor: '#ccc' },
    };
    const state = reducer(initial(), setEntireColorState({ schemes, basisColumnId: 'bogus' }));
    expect(state.basisColumnId).toBe('color');
  });
});

describe('colorSlice: エントリの追加と削除', () => {
  test('addColorInfo / removeColorInfo', () => {
    let state = reducer(initial(), addColorInfo());
    const ids = Object.keys(state.colors).map(Number).filter(id => id !== 999);
    expect(ids).toContain(11);
    state = reducer(state, removeColorInfo(11));
    expect(state.colors[11]).toBeUndefined();
    // 999 は削除できない
    state = reducer(state, removeColorInfo(999));
    expect(state.colors[999]).toBeDefined();
  });
});

describe('colorSlice: ヘルパー', () => {
  test('getColorSourceValue は基準列の値を返す', () => {
    const row = chartRow('r1', { color: 'red', textColumn1: 'A社', textColumn5: '設計' });
    expect(getColorSourceValue(row, 'color')).toBe('red');
    expect(getColorSourceValue(row, 'textColumn1')).toBe('A社');
    expect(getColorSourceValue(row, 'textColumn5')).toBe('設計');
    // 旧データで textColumn4 が無い場合は空文字
    expect(getColorSourceValue(chartRow('r2'), 'textColumn4')).toBe('');
  });

  test('resolveColorFromPalette はエイリアス一致で色を返し、未一致はフォールバック', () => {
    const colors = {
      1: { alias: 'A社, B社', color: '#111' },
      999: { alias: 'A社', color: '#999' }, // 999 は照合対象外
    };
    expect(resolveColorFromPalette('A社', colors, '#fb')).toBe('#111');
    expect(resolveColorFromPalette('B社', colors, '#fb')).toBe('#111');
    expect(resolveColorFromPalette('C社', colors, '#fb')).toBe('#fb');
    expect(resolveColorFromPalette('', colors, '#fb')).toBe('#fb');
  });

  test('collectBasisValues は表示順のユニーク値(空値除外)を返す', () => {
    const rows: WBSData[] = [
      chartRow('r1', { textColumn1: 'B' }),
      chartRow('r2', { textColumn1: 'A' }),
      chartRow('r3', { textColumn1: 'B' }),
      chartRow('r4', { textColumn1: '  ' }),
    ];
    expect(collectBasisValues(rows, 'textColumn1')).toEqual(['B', 'A']);
    expect(collectBasisValues(rows, 'textColumn1', ['r2'])).toEqual(['A']);
  });

  test('generateAutoColor は半透明の rgba 文字列を返す', () => {
    expect(generateAutoColor(0)).toMatch(/^rgba\(\d+, \d+, \d+, 0\.32\)$/);
    expect(generateAutoColor(1)).not.toBe(generateAutoColor(2));
  });
});
