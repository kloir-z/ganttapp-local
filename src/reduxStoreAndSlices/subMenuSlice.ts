// menuSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface MenuState {
  openSubMenus: string[];
}

const initialState: MenuState = {
  openSubMenus: [],
};

export const subMenuSlice = createSlice({
  name: 'subMenu',
  initialState,
  reducers: {
    setOpenSubMenu: (state, action: PayloadAction<string>) => {
      const path = action.payload;
      const paths = path.split('.');
      const activePaths: string[] = [];
      paths.forEach((_, idx) => {
        activePaths.push(paths.slice(0, idx + 1).join('.'));
      });
      state.openSubMenus = activePaths;
    },
    closeSubMenus: (state, action: PayloadAction<number>) => {
      const level = action.payload;
      state.openSubMenus = state.openSubMenus.filter(menu => menu.split('.').length <= level);
    },
    closeAllSubMenus: (state) => {
      state.openSubMenus = [];
    },
  },
});

export const { setOpenSubMenu, closeSubMenus, closeAllSubMenus } = subMenuSlice.actions;
export default subMenuSlice.reducer;
