// copiedRowsSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { WBSData } from '../types/DataTypes';

interface CopiedRowsState {
  rows: WBSData[];
}

const initialState: CopiedRowsState = {
  rows: [],
};

const copiedRowsSlice = createSlice({
  name: 'copiedRows',
  initialState,
  reducers: {
    setCopiedRows(state, action: PayloadAction<WBSData[]>) {
      state.rows = action.payload;
    },
    clearCopiedRows(state) {
      state.rows = [];
    },
  },
});

export const { setCopiedRows, clearCopiedRows } = copiedRowsSlice.actions;
export default copiedRowsSlice.reducer;