import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

export const searchFiles = createAsyncThunk('search/search', async (params, { rejectWithValue }) => {
  try {
    const res = await api.get('/search', { params });
    return res.data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Search failed');
  }
});

export const fetchSuggestions = createAsyncThunk('search/suggestions', async (query, { rejectWithValue }) => {
  try {
    const res = await api.get('/search/suggestions', { params: { query } });
    return res.data.data.suggestions;
  } catch (err) {
    return rejectWithValue([]);
  }
});

const searchSlice = createSlice({
  name: 'search',
  initialState: {
    query: '',
    results: [],
    suggestions: [],
    pagination: { total: 0, page: 1, pages: 1, limit: 12 },
    filters: { fileType: '', sortBy: 'relevance', order: 'desc', dateFrom: '', dateTo: '', tags: '' },
    loading: false,
    error: null,
    hasSearched: false,
  },
  reducers: {
    setQuery: (state, action) => { state.query = action.payload; },
    setFilter: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearSearch: (state) => {
      state.query = '';
      state.results = [];
      state.hasSearched = false;
      state.error = null;
    },
    clearSuggestions: (state) => { state.suggestions = []; },
  },
  extraReducers: (builder) => {
    builder.addCase(searchFiles.pending, (state) => { state.loading = true; state.error = null; });
    builder.addCase(searchFiles.fulfilled, (state, action) => {
      state.loading = false;
      state.results = action.payload.files;
      state.pagination = action.payload.pagination;
      state.hasSearched = true;
    });
    builder.addCase(searchFiles.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload;
    });
    builder.addCase(fetchSuggestions.fulfilled, (state, action) => {
      state.suggestions = action.payload;
    });
  },
});

export const { setQuery, setFilter, clearSearch, clearSuggestions } = searchSlice.actions;
export default searchSlice.reducer;
