// colorSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ColorInfo {
  alias: string;
  color: string;
}

export interface ColorState {
  colors: { [id: number]: ColorInfo };
  fallbackColor: string;
  isSavedChanges: boolean;
}

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
  999: { alias: '', color: '#0000003d' }
};

const initialState: ColorState = {
  colors: { ...defaultColorValues },
  fallbackColor: '#76ff7051',
  isSavedChanges: true,
};

const colorSlice = createSlice({
  name: 'color',
  initialState,
  reducers: {
    updateColor: (state, action: PayloadAction<{ id: number; color: string; }>) => {
      if (JSON.stringify(state.colors[action.payload.id].color) !== JSON.stringify(action.payload.color)) {
        state.colors[action.payload.id].color = action.payload.color;
        state.isSavedChanges = false;
      }
    },
    updateAlias: (state, action: PayloadAction<{ id: number; alias: string; }>) => {
      if (JSON.stringify(state.colors[action.payload.id].alias) !== JSON.stringify(action.payload.alias)) {
        state.colors[action.payload.id].alias = action.payload.alias;
        state.isSavedChanges = false;
      }
    },
    updateFallbackColor: (state, action: PayloadAction<string>) => {
      if (state.fallbackColor !== action.payload) {
        state.fallbackColor = action.payload;
        state.isSavedChanges = false;
      }
    },
    updateEntireColorSettings: (state, action: PayloadAction<{ [id: number]: Omit<ColorInfo, 'id'> }>) => {
      state.colors = action.payload;
      state.isSavedChanges = false;
    },
    resetColor: (state) => {
      state.colors = initialState.colors;
      state.fallbackColor = initialState.fallbackColor;
      state.isSavedChanges = true;
    },
    resetToDefaultColors: (state) => {
      state.colors = { ...defaultColorValues };
      state.fallbackColor = '#76ff7051';
      state.isSavedChanges = false;
    },
    setIsSavedChangesColor(state, action: PayloadAction<boolean>) {
      state.isSavedChanges = action.payload;
    },
  },
});

export const { updateColor, updateAlias, updateFallbackColor, updateEntireColorSettings, resetColor, resetToDefaultColors, setIsSavedChangesColor } = colorSlice.actions;
export default colorSlice.reducer;