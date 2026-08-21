import { createSlice } from "@reduxjs/toolkit";

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
  },
});

export const { toggleSidebarCollapsed } = uiSlice.actions;
export default uiSlice.reducer;
