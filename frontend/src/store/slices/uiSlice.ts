import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface UiState {
  sidebarCollapsed: boolean;
}

const uiSlice = createSlice({
  name: "ui",
  initialState: { sidebarCollapsed: false } as UiState,
  reducers: {
    toggleSidebarCollapsed: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },
  },
});

export const { toggleSidebarCollapsed, setSidebarCollapsed } = uiSlice.actions;
export default uiSlice.reducer;
