import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../api/client';

export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (filterParams = {}, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/products', { params: filterParams });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          'Unable to load products. Make sure the backend server is running and reachable.'
      );
    }
  }
);

export const fetchProductFilters = createAsyncThunk(
  'products/fetchProductFilters',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/products/meta/filters');
      return response.data;
    } catch (error) {
      return rejectWithValue('Failed to load product filters');
    }
  }
);

export const fetchProductDetails = createAsyncThunk(
  'products/fetchProductDetails',
  async (productId, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/products/${productId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Unable to load product details.'
      );
    }
  }
);

export const createProduct = createAsyncThunk(
  'products/createProduct',
  async (productData, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/products', productData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create product'
      );
    }
  }
);

export const updateProduct = createAsyncThunk(
  'products/updateProduct',
  async ({ productId, productData }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/products/${productId}`, productData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update product'
      );
    }
  }
);

export const deleteProduct = createAsyncThunk(
  'products/deleteProduct',
  async (productId, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/products/${productId}`);
      return productId;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to delete product'
      );
    }
  }
);

const productsSlice = createSlice({
  name: 'products',
  initialState: {
    items: [],
    categories: ['All', 'Fountain Pens', 'Inks', 'Paper'],
    brands: ['All'],
    selectedProduct: null,
    loading: false,
    error: null,
    searchKeyword: '',
    selectedCategory: 'All',
    selectedBrand: 'All',
    minPrice: '',
    maxPrice: '',
  },
  reducers: {
    setSearchKeyword: (state, action) => {
      state.searchKeyword = action.payload;
    },
    setSelectedCategory: (state, action) => {
      state.selectedCategory = action.payload;
    },
    setSelectedBrand: (state, action) => {
      state.selectedBrand = action.payload;
    },
    setPriceFilter: (state, action) => {
      state.minPrice = action.payload.minPrice;
      state.maxPrice = action.payload.maxPrice;
    },
    resetFilters: (state) => {
      state.searchKeyword = '';
      state.selectedCategory = 'All';
      state.selectedBrand = 'All';
      state.minPrice = '';
      state.maxPrice = '';
    },
    clearSelectedProduct: (state) => {
      state.selectedProduct = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.items = action.payload;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchProductFilters.fulfilled, (state, action) => {
        if (action.payload?.categories?.length > 0) {
          state.categories = ['All', ...action.payload.categories];
        }
        if (action.payload?.brands?.length > 0) {
          state.brands = ['All', ...action.payload.brands];
        }
      })
      .addCase(fetchProductDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedProduct = action.payload;
      })
      .addCase(fetchProductDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createProduct.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        const index = state.items.findIndex((item) => item._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedProduct?._id === action.payload._id) {
          state.selectedProduct = action.payload;
        }
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item._id !== action.payload);
        if (state.selectedProduct?._id === action.payload) {
          state.selectedProduct = null;
        }
      });
  },
});

export const {
  setSearchKeyword,
  setSelectedCategory,
  setSelectedBrand,
  setPriceFilter,
  resetFilters,
  clearSelectedProduct,
} = productsSlice.actions;

export default productsSlice.reducer;
