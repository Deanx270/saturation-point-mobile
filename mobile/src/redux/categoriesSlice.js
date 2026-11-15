import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../api/client';
import { fetchProductFilters } from './productsSlice';

const getApiErrorMessage = (error, fallback) =>
  error.response?.data?.message || error.message || fallback;

export const fetchCategories = createAsyncThunk(
  'categories/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/categories');
      return response.data;
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, 'Failed to load categories'));
    }
  }
);

export const createCategory = createAsyncThunk(
  'categories/createCategory',
  async (payload, { dispatch, rejectWithValue }) => {
    try {
      const response = await apiClient.post('/categories', payload);
      dispatch(fetchProductFilters());
      return response.data;
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, 'Failed to create category'));
    }
  }
);

export const updateCategory = createAsyncThunk(
  'categories/updateCategory',
  async ({ id, data }, { dispatch, rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/categories/${id}`, data);
      dispatch(fetchProductFilters());
      return response.data;
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, 'Failed to update category'));
    }
  }
);

export const deleteCategory = createAsyncThunk(
  'categories/deleteCategory',
  async (id, { dispatch, rejectWithValue }) => {
    try {
      await apiClient.delete(`/categories/${id}`);
      dispatch(fetchProductFilters());
      return id;
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, 'Failed to delete category'));
    }
  }
);

const categoriesSlice = createSlice({
  name: 'categories',
  initialState: {
    items: [],
    loading: false,
    submitting: false,
    error: null,
  },
  reducers: {
    clearCategoryError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createCategory.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        state.submitting = false;
        state.items.push(action.payload);
        state.items.sort((a, b) => a.name.localeCompare(b.name));
      })
      .addCase(createCategory.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })
      .addCase(updateCategory.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        state.submitting = false;
        const idx = state.items.findIndex((c) => c._id === action.payload._id);
        if (idx !== -1) {
          state.items[idx] = action.payload;
        }
        state.items.sort((a, b) => a.name.localeCompare(b.name));
      })
      .addCase(updateCategory.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })
      .addCase(deleteCategory.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.submitting = false;
        state.items = state.items.filter((c) => c._id !== action.payload);
      })
      .addCase(deleteCategory.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      });
  },
});

export const { clearCategoryError } = categoriesSlice.actions;

export default categoriesSlice.reducer;
