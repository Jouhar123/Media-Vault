import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    uploadModalOpen: false,
    fileDetailModalOpen: false,
    sidebarOpen: false,
    notifications: [],
  },
  reducers: {
    openUploadModal: (state) => { state.uploadModalOpen = true; },
    closeUploadModal: (state) => { state.uploadModalOpen = false; },
    openFileDetailModal: (state) => { state.fileDetailModalOpen = true; },
    closeFileDetailModal: (state) => { state.fileDetailModalOpen = false; },
    toggleSidebar: (state) => { state.sidebarOpen = !state.sidebarOpen; },
    addNotification: (state, action) => {
      state.notifications.unshift({ id: Date.now(), ...action.payload });
      if (state.notifications.length > 10) state.notifications.pop();
    },
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
  },
});

export const {
  openUploadModal, closeUploadModal,
  openFileDetailModal, closeFileDetailModal,
  toggleSidebar,
  addNotification, removeNotification,
} = uiSlice.actions;
export default uiSlice.reducer;
