// uiFlagsSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface UIFlagsState {
  activeModal: string | null;
  isContextMenuOpen: boolean;
  isLoading: boolean;
}

const initialState: UIFlagsState = {
  activeModal: null,
  isContextMenuOpen: false,
  isLoading: true,
};

const uiFlagsSlice = createSlice({
  name: "uiFlags",
  initialState,
  reducers: {
    setActiveModal(state, action: PayloadAction<string | null>) {
      if (state.activeModal === action.payload && action.payload !== 'welcome') {
        state.activeModal = null;
      } else {
        state.activeModal = action.payload;
      }
    },
    setIsContextMenuOpen(state, action: PayloadAction<boolean>) {
      state.isContextMenuOpen = action.payload;
    },
    setIsLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
  },
});

export const { setActiveModal, setIsContextMenuOpen, setIsLoading } = uiFlagsSlice.actions;
export default uiFlagsSlice.reducer;
