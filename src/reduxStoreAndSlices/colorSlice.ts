// colorSlice.ts
//
// チャートバーの色分けを管理する。従来は「色(Color)列の値 ⇔ エイリアス」の
// 1パレットだけだったが、色分けの基準列(Color列/テキスト列1〜7)を切り替えられる
// ように、基準列ごとに独立したパレット(スキーム)を保持する。
//
// 後方互換のため、既存コードが参照する `colors` / `fallbackColor` は常に
// 「アクティブな基準列のパレット」を指し、全ての変更は schemes[basisColumnId]
// にも同時に反映される(schemes は常に最新)。
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ChartRow, EventRow, WBSData, isChartRow, isEventRow } from '../types/DataTypes';

export interface ColorInfo {
  alias: string;
  color: string;
}

export interface ColorScheme {
  colors: { [id: number]: ColorInfo };
  fallbackColor: string;
}

export interface ColorState {
  colors: { [id: number]: ColorInfo };
  fallbackColor: string;
  // 色分けの基準列: 'color' | 'textColumn1'〜'textColumn7'
  basisColumnId: string;
  // 基準列ごとの保存済みパレット。アクティブ分も常に同期されている。
  schemes: { [columnId: string]: ColorScheme };
  isSavedChanges: boolean;
}

export const COLOR_BASIS_COLUMN_IDS = [
  'color', 'textColumn1', 'textColumn2', 'textColumn3',
  'textColumn4', 'textColumn5', 'textColumn6', 'textColumn7',
] as const;

// 実績バー用の特別ID(基準列に関係なく全スキームで同じ色を共有する)
export const ACTUAL_COLOR_ID = 999;

const DEFAULT_FALLBACK_COLOR = '#76ff7051';
const DEFAULT_ACTUAL_COLOR = '#0000003d';
// 自動割当てで作るエントリ数の上限(超えた値はフォールバック色のまま)
const MAX_AUTO_COLOR_ENTRIES = 30;

const defaultColorValues = {
  1: { alias: '', color: '#70ecff51' },
  2: { alias: '', color: '#70b0ff51' },
  3: { alias: '', color: '#8a70ff51' },
  4: { alias: '', color: '#ff70ea51' },
  5: { alias: '', color: '#ff707051' },
  6: { alias: '', color: '#fffe7051' },
  7: { alias: '', color: '#76ff7051' },
  8: { alias: '', color: '#76ff7051' },
  9: { alias: '', color: '#76ff7051' },
  10: { alias: '', color: '#76ff7051' },
  999: { alias: '', color: DEFAULT_ACTUAL_COLOR }
};

// 行から「色分け基準列の値」を取り出す(チャート・イベント行のみ)。
export const getColorSourceValue = (
  row: ChartRow | EventRow,
  basisColumnId: string,
): string => {
  if (basisColumnId === 'color') return row.color || '';
  const value = (row as unknown as { [key: string]: unknown })[basisColumnId];
  return typeof value === 'string' ? value : '';
};

// パレットからエイリアス一致で色を解決する(チャート/Excel出力と同一ロジック)。
export const resolveColorFromPalette = (
  sourceValue: string,
  colors: { [id: number]: ColorInfo },
  fallbackColor: string,
): string => {
  if (sourceValue === '') return fallbackColor;
  const colorInfo = Object.entries(colors).find(([id, info]) =>
    Number(id) !== ACTUAL_COLOR_ID &&
    info.alias.split(',').map(alias => alias.trim()).includes(sourceValue)
  );
  return colorInfo ? colorInfo[1].color : fallbackColor;
};

// データ配列から基準列のユニーク値を表示順に集める(空値は除外)。
export const collectBasisValues = (
  rows: WBSData[],
  basisColumnId: string,
  targetRowIds?: string[],
): string[] => {
  const seen = new Set<string>();
  const values: string[] = [];
  rows.forEach(row => {
    if (!isChartRow(row) && !isEventRow(row)) return;
    if (targetRowIds && !targetRowIds.includes(row.id)) return;
    const value = getColorSourceValue(row, basisColumnId).trim();
    if (value !== '' && !seen.has(value)) {
      seen.add(value);
      values.push(value);
    }
  });
  return values;
};

// 自動割当て用の色を生成する。黄金角で色相を回すので、隣り合う番号でも
// 見分けやすい色になる。既存パレットと同じ半透明(α≒0.32)の rgba で返す。
export const generateAutoColor = (index: number): string => {
  const hue = (index * 137.508) % 360;
  const s = 0.62;
  const l = 0.72;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (hue < 60) { r = c; g = x; }
  else if (hue < 120) { r = x; g = c; }
  else if (hue < 180) { g = c; b = x; }
  else if (hue < 240) { g = x; b = c; }
  else if (hue < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const to255 = (v: number) => Math.round((v + m) * 255);
  return `rgba(${to255(r)}, ${to255(g)}, ${to255(b)}, 0.32)`;
};

// スキーム内で既にエイリアスとして登録済みの値の集合。
const collectAliasedValues = (colors: { [id: number]: ColorInfo }): Set<string> => {
  const values = new Set<string>();
  Object.entries(colors).forEach(([id, info]) => {
    if (Number(id) === ACTUAL_COLOR_ID) return;
    info.alias.split(',').forEach(alias => {
      const trimmed = alias.trim();
      if (trimmed !== '') values.add(trimmed);
    });
  });
  return values;
};

const nextColorId = (colors: { [id: number]: ColorInfo }): number => {
  const ids = Object.keys(colors).map(Number).filter(id => id !== ACTUAL_COLOR_ID);
  return ids.length === 0 ? 1 : Math.max(...ids) + 1;
};

// values のうち未登録のものをスキームに追記する(1値=1エントリで自動色)。
// 既存エントリのうちエイリアスが空のものから順に埋め、足りなければ追加する。
const ensureValuesInScheme = (scheme: ColorScheme, values: string[]): void => {
  const aliased = collectAliasedValues(scheme.colors);
  const missing = values.filter(v => !aliased.has(v));
  if (missing.length === 0) return;
  const emptySlotIds = Object.entries(scheme.colors)
    .filter(([id, info]) => Number(id) !== ACTUAL_COLOR_ID && info.alias.trim() === '')
    .map(([id]) => Number(id))
    .sort((a, b) => a - b);
  let autoIndex = Object.keys(scheme.colors).filter(id => Number(id) !== ACTUAL_COLOR_ID).length;
  let added = 0;
  for (const value of missing) {
    if (added >= MAX_AUTO_COLOR_ENTRIES) break;
    const emptyId = emptySlotIds.shift();
    if (emptyId !== undefined) {
      scheme.colors[emptyId] = { ...scheme.colors[emptyId], alias: value };
    } else {
      scheme.colors[nextColorId(scheme.colors)] = { alias: value, color: generateAutoColor(autoIndex) };
      autoIndex += 1;
    }
    added += 1;
  }
};

const createEmptyScheme = (base?: ColorScheme): ColorScheme => ({
  colors: {
    [ACTUAL_COLOR_ID]: { alias: '', color: base?.colors[ACTUAL_COLOR_ID]?.color ?? DEFAULT_ACTUAL_COLOR },
  },
  fallbackColor: base?.fallbackColor ?? DEFAULT_FALLBACK_COLOR,
});

const initialState: ColorState = {
  colors: { ...defaultColorValues },
  fallbackColor: DEFAULT_FALLBACK_COLOR,
  basisColumnId: 'color',
  schemes: {
    color: { colors: { ...defaultColorValues }, fallbackColor: DEFAULT_FALLBACK_COLOR },
  },
  isSavedChanges: true,
};

// アクティブなパレットを schemes[basisColumnId] に写す(常時同期の要)。
const mirrorActiveToScheme = (state: ColorState): void => {
  state.schemes[state.basisColumnId] = {
    colors: state.colors,
    fallbackColor: state.fallbackColor,
  };
};

const colorSlice = createSlice({
  name: 'color',
  initialState,
  reducers: {
    updateColor: (state, action: PayloadAction<{ id: number; color: string; }>) => {
      const { id, color } = action.payload;
      if (!state.colors[id] || state.colors[id].color === color) return;
      state.colors[id].color = color;
      if (id === ACTUAL_COLOR_ID) {
        // 実績バー色は基準列に依らず共通なので全スキームへ反映する。
        Object.values(state.schemes).forEach(scheme => {
          if (scheme.colors[ACTUAL_COLOR_ID]) scheme.colors[ACTUAL_COLOR_ID].color = color;
          else scheme.colors[ACTUAL_COLOR_ID] = { alias: '', color };
        });
      }
      mirrorActiveToScheme(state);
      state.isSavedChanges = false;
    },
    updateAlias: (state, action: PayloadAction<{ id: number; alias: string; }>) => {
      const { id, alias } = action.payload;
      if (!state.colors[id] || state.colors[id].alias === alias) return;
      state.colors[id].alias = alias;
      mirrorActiveToScheme(state);
      state.isSavedChanges = false;
    },
    updateFallbackColor: (state, action: PayloadAction<string>) => {
      if (state.fallbackColor !== action.payload) {
        state.fallbackColor = action.payload;
        mirrorActiveToScheme(state);
        state.isSavedChanges = false;
      }
    },
    // パレットに空エントリを1つ追加する。
    addColorInfo: (state) => {
      state.colors[nextColorId(state.colors)] = { alias: '', color: generateAutoColor(Object.keys(state.colors).length) };
      mirrorActiveToScheme(state);
      state.isSavedChanges = false;
    },
    // パレットからエントリを削除する(実績色999は削除不可)。
    removeColorInfo: (state, action: PayloadAction<number>) => {
      const id = action.payload;
      if (id === ACTUAL_COLOR_ID || !state.colors[id]) return;
      delete state.colors[id];
      mirrorActiveToScheme(state);
      state.isSavedChanges = false;
    },
    // 色分け基準列を切り替える。切替先のスキームが無ければ作成し、
    // uniqueValues(その列のユニーク値)のうち未登録の値へ自動で色を割り当てる。
    switchColorBasis: (state, action: PayloadAction<{ columnId: string; uniqueValues: string[] }>) => {
      const { columnId, uniqueValues } = action.payload;
      if (!(COLOR_BASIS_COLUMN_IDS as readonly string[]).includes(columnId)) return;
      mirrorActiveToScheme(state);
      const isNewBasis = state.basisColumnId !== columnId;
      const scheme = state.schemes[columnId]
        ?? createEmptyScheme(state.schemes[state.basisColumnId]);
      ensureValuesInScheme(scheme, uniqueValues);
      state.schemes[columnId] = scheme;
      state.basisColumnId = columnId;
      state.colors = scheme.colors;
      state.fallbackColor = scheme.fallbackColor;
      if (isNewBasis) state.isSavedChanges = false;
    },
    // アクティブな基準列のユニーク値のうち未登録のものへ自動で色を割り当てる。
    autoAssignColors: (state, action: PayloadAction<{ uniqueValues: string[] }>) => {
      const scheme: ColorScheme = { colors: state.colors, fallbackColor: state.fallbackColor };
      ensureValuesInScheme(scheme, action.payload.uniqueValues);
      mirrorActiveToScheme(state);
      state.isSavedChanges = false;
    },
    // 旧形式(単一パレット)の読込。基準列は Color 列へ戻し、スキームも作り直す。
    updateEntireColorSettings: (state, action: PayloadAction<{ [id: number]: Omit<ColorInfo, 'id'> }>) => {
      state.colors = action.payload;
      state.basisColumnId = 'color';
      state.schemes = { color: { colors: action.payload, fallbackColor: state.fallbackColor } };
      state.isSavedChanges = false;
    },
    // 新形式(基準列ごとのスキーム一式)の読込。
    setEntireColorState: (state, action: PayloadAction<{ schemes: { [columnId: string]: ColorScheme }; basisColumnId: string }>) => {
      const { schemes, basisColumnId } = action.payload;
      const validBasis = (COLOR_BASIS_COLUMN_IDS as readonly string[]).includes(basisColumnId) && schemes[basisColumnId]
        ? basisColumnId
        : 'color';
      state.schemes = schemes;
      if (!state.schemes[validBasis]) {
        state.schemes[validBasis] = { colors: { ...defaultColorValues }, fallbackColor: DEFAULT_FALLBACK_COLOR };
      }
      state.basisColumnId = validBasis;
      state.colors = state.schemes[validBasis].colors;
      state.fallbackColor = state.schemes[validBasis].fallbackColor;
      state.isSavedChanges = false;
    },
    resetColor: (state) => {
      state.colors = initialState.colors;
      state.fallbackColor = initialState.fallbackColor;
      state.basisColumnId = initialState.basisColumnId;
      state.schemes = {
        color: { colors: { ...defaultColorValues }, fallbackColor: DEFAULT_FALLBACK_COLOR },
      };
      state.isSavedChanges = true;
    },
    resetToDefaultColors: (state) => {
      state.colors = { ...defaultColorValues };
      state.fallbackColor = DEFAULT_FALLBACK_COLOR;
      mirrorActiveToScheme(state);
      state.isSavedChanges = false;
    },
    setIsSavedChangesColor(state, action: PayloadAction<boolean>) {
      state.isSavedChanges = action.payload;
    },
  },
});

export const {
  updateColor,
  updateAlias,
  updateFallbackColor,
  addColorInfo,
  removeColorInfo,
  switchColorBasis,
  autoAssignColors,
  updateEntireColorSettings,
  setEntireColorState,
  resetColor,
  resetToDefaultColors,
  setIsSavedChangesColor,
} = colorSlice.actions;
export default colorSlice.reducer;
