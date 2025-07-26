// colorSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ColorInfo {
  alias: string;
  color: string;
}

export interface ColorState {
  colors: { [id: number]: ColorInfo };
  isSavedChanges: boolean;
}

const initialState: ColorState = {
  colors: {
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
  },
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
    updateEntireColorSettings: (state, action: PayloadAction<{ [id: number]: Omit<ColorInfo, 'id'> }>) => {
      state.colors = action.payload;
      state.isSavedChanges = false;
    },
    resetColor: (state) => {
      state.colors = initialState.colors;
      state.isSavedChanges = true;
    },
    setIsSavedChangesColor(state, action: PayloadAction<boolean>) {
      state.isSavedChanges = action.payload;
    },
  },
});

export const { updateColor, updateAlias, updateEntireColorSettings, resetColor, setIsSavedChangesColor } = colorSlice.actions;
export default colorSlice.reducer;