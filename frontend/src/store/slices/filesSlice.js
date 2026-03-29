import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

export const fetchFiles = createAsyncThunk('files/fetchAll', async (params = {}, { rejectWithValue }) => {
  try {
    const res = await api.get('/files', { params });
    return res.data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch files');
  }
});

export const fetchFile = createAsyncThunk('files/fetchOne', async (id, { rejectWithValue }) => {
  try {
    const res = await api.get(`/files/${id}`);
    return res.data.data.file;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch file');
  }
});

export const uploadFile = createAsyncThunk('files/upload', async (formData, { rejectWithValue }) => {
  try {
    const res = await api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        // Progress is handled separately via callback
      },
    });
    return res.data.data.file;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Upload failed');
  }
});

export const deleteFile = createAsyncThunk('files/delete', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/files/${id}`);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Delete failed');
  }
});

export const updateFile = createAsyncThunk('files/update', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.patch(`/files/${id}`, data);
    return res.data.data.file;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Update failed');
  }
});

const filesSlice = createSlice({
  name: 'files',
  initialState: {
    items: [],
    currentFile: null,
    pagination: { total: 0, page: 1, pages: 1, limit: 12 },
    loading: false,
    uploading: false,
    uploadProgress: 0,
    error: null,
  },
  reducers: {
    clearError: (state) => { state.error = null; },
    setUploadProgress: (state, action) => { state.uploadProgress = action.payload; },
    addFileRealtime: (state, action) => {
      state.items.unshift(action.payload);
      state.pagination.total += 1;
    },
    clearCurrentFile: (state) => { state.currentFile = null; },
  },
  extraReducers: (builder) => {
    // Fetch all
    builder.addCase(fetchFiles.pending, (state) => { state.loading = true; state.error = null; });
    builder.addCase(fetchFiles.fulfilled, (state, action) => {
      state.loading = false;
      state.items = action.payload.files;
      state.pagination = action.payload.pagination;
    });
    builder.addCase(fetchFiles.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload;
    });

    // Fetch one
    builder.addCase(fetchFile.pending, (state) => { state.loading = true; });
    builder.addCase(fetchFile.fulfilled, (state, action) => {
      state.loading = false;
      state.currentFile = action.payload;
    });
    builder.addCase(fetchFile.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload;
    });

    // Upload
    builder.addCase(uploadFile.pending, (state) => { state.uploading = true; state.error = null; state.uploadProgress = 0; });
    builder.addCase(uploadFile.fulfilled, (state, action) => {
      state.uploading = false;
      state.uploadProgress = 100;
      state.items.unshift(action.payload);
      state.pagination.total += 1;
    });
    builder.addCase(uploadFile.rejected, (state, action) => {
      state.uploading = false;
      state.error = action.payload;
    });

    // Delete
    builder.addCase(deleteFile.fulfilled, (state, action) => {
      state.items = state.items.filter(f => f._id !== action.payload);
      state.pagination.total -= 1;
    });

    // Update
    builder.addCase(updateFile.fulfilled, (state, action) => {
      const idx = state.items.findIndex(f => f._id === action.payload._id);
      if (idx !== -1) state.items[idx] = action.payload;
      if (state.currentFile?._id === action.payload._id) state.currentFile = action.payload;
    });
  },
});

export const { clearError, setUploadProgress, addFileRealtime, clearCurrentFile } = filesSlice.actions;
export default filesSlice.reducer;
