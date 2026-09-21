import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MAX_ROWS } from '../types/DataTypes';

interface RowDialogState {
    isOpen: boolean;
    rowType: 'Chart' | 'Event' | null;
    insertAtId: string;
    maxRows: number;
}

const initialState: RowDialogState = {
    isOpen: false,
    rowType: null,
    insertAtId: '',
    maxRows: MAX_ROWS,
};

const rowDialogSlice = createSlice({
    name: 'rowDialog',
    initialState,
    reducers: {
        openRowDialog: (state, action: PayloadAction<{
            rowType: 'Chart' | 'Event';
            insertAtId: string;
            maxRows: number;
        }>) => {
            state.isOpen = true;
            state.rowType = action.payload.rowType;
            state.insertAtId = action.payload.insertAtId;
            state.maxRows = action.payload.maxRows;
        },
        closeRowDialog: (state) => {
            state.isOpen = false;
            state.rowType = null;
            state.insertAtId = '';
        },
    },
});

export const { openRowDialog, closeRowDialog } = rowDialogSlice.actions;
export default rowDialogSlice.reducer;