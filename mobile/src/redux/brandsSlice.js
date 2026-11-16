import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../api/client';
import { fetchProductFilters } from './productsSlice';

const getApiErrorMessage = (error, fallback) =>
  error.response?.data?.message || error.message || fallback;

export const fetchBrands = createAsyncThunk(
  'brands/fetchBrands',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/brands');
      return response.data;
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, 'Failed to load brands'));
    }
  }
);

export const createBrand = createAsyncThunk(
  'brands/createBrand',
  async (payload, { dispatch, rejectWithValue }) => {
    try {
      const response = await apiClient.post('/brands', payload);
      dispatch(fetchProductFilters());
      return response.data;
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, 'Failed to create brand'));
    }
  }
);

export const updateBrand = createAsyncThunk(
  'brands/updateBrand',
  async ({ id, data }, { dispatch, rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/brands/${id}`, data);
      dispatch(fetchProductFilters());
      return response.data;
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, 'Failed to update brand'));
    }
  }
);

export const deleteBrand = createAsyncThunk(
  'brands/deleteBrand',
  async (id, { dispatch, rejectWithValue }) => {
    try {
      await apiClient.delete(`/brands/${id}`);
      dispatch(fetchProductFilters());
      return id;
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, 'Failed to delete brand'));
    }
  }
);

const brandsSlice = createSlice({
  name: 'brands',
  initialState: {
    items: [],
    loading: false,
    submitting: false,
    error: null,
  },
  reducers: {
    clearBrandError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBrands.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBrands.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchBrands.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createBrand.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(createBrand.fulfilled, (state, action) => {
        state.submitting = false;
        state.items.push(action.payload);
        state.items.sort((a, b) => a.name.localeCompare(b.name));
      })
      .addCase(createBrand.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })
      .addCase(updateBrand.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(updateBrand.fulfilled, (state, action) => {
        state.submitting = false;
        const idx = state.items.findIndex((b) => b._id === action.payload._id);
        if (idx !== -1) {
          state.items[idx] = action.payload;
        }
        state.items.sort((a, b) => a.name.localeCompare(b.name));
      })
      .addCase(updateBrand.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })
      .addCase(deleteBrand.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(deleteBrand.fulfilled, (state, action) => {
        state.submitting = false;
        state.items = state.items.filter((b) => b._id !== action.payload);
      })
      .addCase(deleteBrand.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      });
  },
});

export const { clearBrandError } = brandsSlice.actions;

export default brandsSlice.reducer;
