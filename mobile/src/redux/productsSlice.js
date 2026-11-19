import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../api/client';

const normalizeProductsPayload = (data) => {
  if (Array.isArray(data)) {
    return {
      products: data,
      page: 1,
      total: data.length,
      hasMore: false,
      activePromoCount: null,
    };
  }
  const products = Array.isArray(data?.products) ? data.products : [];
  return {
    products,
    page: Number(data?.page) || 1,
    total: Number(data?.total) || products.length,
    hasMore: Boolean(data?.hasMore),
    activePromoCount:
      typeof data?.activePromoCount === 'number' ? data.activePromoCount : null,
  };
};

const mergeProducts = (existing, incoming) => {
  const seen = new Set(existing.map((item) => item._id));
  const merged = [...existing];
  for (const product of incoming) {
    if (!seen.has(product._id)) {
      seen.add(product._id);
      merged.push(product);
    }
  }
  return merged;
};

const syncProductAcrossLists = (state, product) => {
  if (!product?._id) {
    return;
  }
  if (state.selectedProduct?._id === product._id) {
    state.selectedProduct = product;
  }
  const shopIndex = state.items.findIndex((item) => item._id === product._id);
  if (shopIndex !== -1) {
    state.items[shopIndex] = product;
  }
  const adminIndex = state.adminItems.findIndex(
    (item) => item._id === product._id
  );
  if (adminIndex !== -1) {
    state.adminItems[adminIndex] = product;
  }
};

const applyOrderStockDelta = (state, orderItems, multiplier) => {
  if (!Array.isArray(orderItems) || orderItems.length === 0) {
    return;
  }
  const deltaMap = new Map();
  orderItems.forEach((item) => {
    const id = item?.product?._id || item?.product;
    const qty = Number(item?.quantity) || 0;
    if (id && qty > 0) {
      deltaMap.set(
        String(id),
        (deltaMap.get(String(id)) || 0) + qty * multiplier
      );
    }
  });
  const updateTarget = (product) => {
    if (!product?._id) {
      return;
    }
    const delta = deltaMap.get(String(product._id));
    if (typeof delta === 'number') {
      product.stock = Math.max(0, (Number(product.stock) || 0) + delta);
    }
  };
  updateTarget(state.selectedProduct);
  state.items.forEach(updateTarget);
  state.adminItems.forEach(updateTarget);
};

export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (filterParams = {}, { rejectWithValue, signal }) => {
    const { target = 'shop', ...queryParams } = filterParams;
    try {
      const response = await apiClient.get('/products', {
        params: queryParams,
        signal,
      });
      return {
        ...normalizeProductsPayload(response.data),
        requestedPage: Number(queryParams.page) || 1,
        target,
      };
    } catch (error) {
      if (
        signal?.aborted ||
        error?.code === 'ERR_CANCELED' ||
        error?.name === 'CanceledError'
      ) {
        return rejectWithValue({ canceled: true, target });
      }
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

export const fetchActivePromotions = createAsyncThunk(
  'products/fetchActivePromotions',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/promotions/active');
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Unable to load promotions.'
      );
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
    page: 1,
    total: 0,
    hasMore: false,
    loading: false,
    loadingMore: false,
    error: null,
    activeShopRequestId: null,
    adminItems: [],
    adminPage: 1,
    adminTotal: 0,
    adminHasMore: false,
    adminLoading: false,
    adminLoadingMore: false,
    adminError: null,
    activeAdminRequestId: null,
    categories: ['All', 'Fountain Pens', 'Inks', 'Paper'],
    brands: ['All'],
    selectedProduct: null,
    detailLoading: false,
    detailError: null,
    detailErrorTargetId: null,
    activeDetailRequestId: null,
    searchKeyword: '',
    selectedCategory: 'All',
    selectedBrand: 'All',
    minPrice: '',
    maxPrice: '',
    minRating: '',
    onSaleOnly: false,
    activePromoCount: 0,
    activePromotions: [],
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
    setMinRating: (state, action) => {
      state.minRating = action.payload;
    },
    setOnSaleOnly: (state, action) => {
      state.onSaleOnly = Boolean(action.payload);
    },
    resetFilters: (state) => {
      state.searchKeyword = '';
      state.selectedCategory = 'All';
      state.selectedBrand = 'All';
      state.minPrice = '';
      state.maxPrice = '';
      state.minRating = '';
      state.onSaleOnly = false;
    },
    clearSelectedProduct: (state) => {
      state.selectedProduct = null;
      state.detailLoading = false;
      state.detailError = null;
      state.detailErrorTargetId = null;
      state.activeDetailRequestId = null;
    },
    syncProductSnapshot: (state, action) => {
      syncProductAcrossLists(state, action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state, action) => {
        const arg = action.meta.arg || {};
        const target = arg.target || 'shop';
        const requestedPage = Number(arg.page) || 1;
        if (target === 'admin') {
          state.activeAdminRequestId = action.meta.requestId;
          state.adminError = null;
          if (requestedPage > 1) {
            state.adminLoadingMore = true;
          } else {
            state.adminLoading = true;
            state.adminLoadingMore = false;
          }
          return;
        }
        state.activeShopRequestId = action.meta.requestId;
        state.error = null;
        if (requestedPage > 1) {
          state.loadingMore = true;
        } else {
          state.loading = true;
          state.loadingMore = false;
        }
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        const {
          target,
          requestedPage,
          products,
          page,
          total,
          hasMore,
          activePromoCount,
        } = action.payload;
        if (typeof activePromoCount === 'number') {
          state.activePromoCount = activePromoCount;
        }
        if (target === 'admin') {
          if (state.activeAdminRequestId && state.activeAdminRequestId !== action.meta.requestId) {
            return;
          }
          state.adminLoading = false;
          state.adminLoadingMore = false;
          state.adminError = null;
          state.adminPage = page;
          state.adminTotal = total;
          state.adminHasMore = hasMore;
          state.adminItems =
            requestedPage > 1 ? mergeProducts(state.adminItems, products) : products;
          return;
        }
        if (state.activeShopRequestId && state.activeShopRequestId !== action.meta.requestId) {
          return;
        }
        state.loading = false;
        state.loadingMore = false;
        state.error = null;
        state.page = page;
        state.total = total;
        state.hasMore = hasMore;
        state.items =
          requestedPage > 1 ? mergeProducts(state.items, products) : products;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        const arg = action.meta.arg || {};
        const target = arg.target || 'shop';
        if (target === 'admin') {
          if (state.activeAdminRequestId && state.activeAdminRequestId !== action.meta.requestId) {
            return;
          }
          state.adminLoading = false;
          state.adminLoadingMore = false;
          if (!action.meta.aborted && !action.payload?.canceled) {
            state.adminError = action.payload;
          }
          return;
        }
        if (state.activeShopRequestId && state.activeShopRequestId !== action.meta.requestId) {
          return;
        }
        state.loading = false;
        state.loadingMore = false;
        if (!action.meta.aborted && !action.payload?.canceled) {
          state.error = action.payload;
        }
      })
      .addCase(fetchProductFilters.fulfilled, (state, action) => {
        if (action.payload?.categories?.length > 0) {
          state.categories = ['All', ...action.payload.categories];
        }
        if (action.payload?.brands?.length > 0) {
          state.brands = ['All', ...action.payload.brands];
        }
      })
      .addCase(fetchActivePromotions.fulfilled, (state, action) => {
        const list = Array.isArray(action.payload?.promotions)
          ? action.payload.promotions
          : [];
        state.activePromotions = list;
        if (typeof action.payload?.activeProductCount === 'number') {
          state.activePromoCount = action.payload.activeProductCount;
        }
      })
      .addCase(fetchProductDetails.pending, (state, action) => {
        state.detailLoading = true;
        state.detailError = null;
        state.detailErrorTargetId = null;
        state.activeDetailRequestId = action.meta.requestId;
      })
      .addCase(fetchProductDetails.fulfilled, (state, action) => {
        if (
          state.activeDetailRequestId &&
          state.activeDetailRequestId !== action.meta.requestId
        ) {
          return;
        }
        state.detailLoading = false;
        state.detailError = null;
        state.detailErrorTargetId = null;
        state.selectedProduct = action.payload;
        syncProductAcrossLists(state, action.payload);
      })
      .addCase(fetchProductDetails.rejected, (state, action) => {
        if (
          state.activeDetailRequestId &&
          state.activeDetailRequestId !== action.meta.requestId
        ) {
          return;
        }
        state.detailLoading = false;
        state.detailError = action.payload;
        state.detailErrorTargetId = action.meta.arg || null;
      })
      .addCase(createProduct.fulfilled, (state, action) => {
        const matchesCategory =
          state.selectedCategory === 'All' ||
          action.payload.category === state.selectedCategory;
        const matchesBrand =
          state.selectedBrand === 'All' ||
          action.payload.brand === state.selectedBrand;
        if (matchesCategory && matchesBrand && !state.searchKeyword) {
          state.items.unshift(action.payload);
          state.total += 1;
        }
        state.adminItems.unshift(action.payload);
        state.adminTotal += 1;
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        const index = state.items.findIndex((item) => item._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        const adminIndex = state.adminItems.findIndex((item) => item._id === action.payload._id);
        if (adminIndex !== -1) {
          state.adminItems[adminIndex] = action.payload;
        }
        if (state.selectedProduct?._id === action.payload._id) {
          state.selectedProduct = action.payload;
        }
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        const prevLen = state.items.length;
        state.items = state.items.filter((item) => item._id !== action.payload);
        if (state.items.length < prevLen && state.total > 0) {
          state.total -= 1;
        }
        const prevAdminLen = state.adminItems.length;
        state.adminItems = state.adminItems.filter((item) => item._id !== action.payload);
        if (state.adminItems.length < prevAdminLen && state.adminTotal > 0) {
          state.adminTotal -= 1;
        }
        if (state.selectedProduct?._id === action.payload) {
          state.selectedProduct = null;
        }
      })
      .addCase('orders/createOrder/fulfilled', (state, action) => {
        applyOrderStockDelta(state, action.payload?.orderItems, -1);
      })
      .addCase('orders/cancelMyOrder/fulfilled', (state, action) => {
        applyOrderStockDelta(state, action.payload?.orderItems, 1);
      })
      .addCase('orders/updateOrderStatus/fulfilled', (state, action) => {
        const order = action.payload;
        if (
          order &&
          String(order.status || '').toLowerCase() === 'cancelled'
        ) {
          applyOrderStockDelta(state, order.orderItems, 1);
        }
      })
      .addCase('auth/logout/fulfilled', (state) => {
        state.selectedProduct = null;
      })
      .addCase('auth/updateProfile/fulfilled', (state, action) => {
        const updatedUser = action.payload;
        if (!updatedUser?._id) {
          return;
        }
        const targetId = String(updatedUser._id);
        const nextName = updatedUser.displayName;
        const nextPhoto = updatedUser.photoURL;
        const patchReviews = (product) => {
          if (!product || !Array.isArray(product.reviews)) {
            return;
          }
          product.reviews.forEach((rev) => {
            if (rev?.user && String(rev.user) === targetId) {
              if (nextName) {
                rev.name = nextName;
              }
              if (nextPhoto !== undefined) {
                rev.photoURL = nextPhoto;
              }
            }
          });
        };
        patchReviews(state.selectedProduct);
        state.items.forEach(patchReviews);
        state.adminItems.forEach(patchReviews);
      });
  },
});

export const {
  setSearchKeyword,
  setSelectedCategory,
  setSelectedBrand,
  setPriceFilter,
  setMinRating,
  setOnSaleOnly,
  resetFilters,
  clearSelectedProduct,
  syncProductSnapshot,
} = productsSlice.actions;

export default productsSlice.reducer;
