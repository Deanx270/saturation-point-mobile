import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../api/client';
import { clearCart } from './cartSlice';
import { logout } from './authSlice';

const getApiErrorMessage = (error, fallback) => {
  return (
    error.response?.data?.message ||
    error.message ||
    fallback
  );
};

export const createOrder = createAsyncThunk(
  'orders/createOrder',
  async (orderPayload, { dispatch, rejectWithValue }) => {
    try {
      const response = await apiClient.post('/orders', orderPayload);
      dispatch(clearCart());
      return response.data;
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, 'Failed to place order'));
    }
  }
);

export const fetchMyOrders = createAsyncThunk(
  'orders/fetchMyOrders',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/orders/myorders');
      return response.data;
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, 'Failed to load orders'));
    }
  }
);

export const fetchAllOrders = createAsyncThunk(
  'orders/fetchAllOrders',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/orders');
      return response.data;
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, 'Failed to load orders'));
    }
  }
);

export const fetchOrderById = createAsyncThunk(
  'orders/fetchOrderById',
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/orders/${orderId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, 'Failed to load order details'));
    }
  }
);

export const updateOrderStatus = createAsyncThunk(
  'orders/updateOrderStatus',
  async ({ orderId, status }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/orders/${orderId}/status`, { status });
      return response.data;
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, 'Failed to update order status'));
    }
  }
);

export const cancelMyOrder = createAsyncThunk(
  'orders/cancelMyOrder',
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/orders/${orderId}/cancel`);
      return response.data;
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, 'Failed to cancel order'));
    }
  }
);

const syncOrderInState = (state, updatedOrder) => {
  if (!updatedOrder?._id) {
    return;
  }
  const index = state.allOrders.findIndex((o) => o._id === updatedOrder._id);
  if (index !== -1) {
    state.allOrders[index] = updatedOrder;
  }
  const myIndex = state.myOrders.findIndex((o) => o._id === updatedOrder._id);
  if (myIndex !== -1) {
    state.myOrders[myIndex] = updatedOrder;
  }
  if (state.selectedOrder?._id === updatedOrder._id) {
    state.selectedOrder = updatedOrder;
  }
};

const ordersSlice = createSlice({
  name: 'orders',
  initialState: {
    myOrders: [],
    allOrders: [],
    selectedOrder: null,
    loading: false,
    updatingOrderId: null,
    error: null,
    checkoutSuccess: false,
  },
  reducers: {
    resetCheckoutStatus: (state) => {
      state.checkoutSuccess = false;
      state.error = null;
    },
    clearSelectedOrder: (state) => {
      state.selectedOrder = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.checkoutSuccess = false;
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.checkoutSuccess = true;
        state.myOrders.unshift(action.payload);
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.checkoutSuccess = false;
      })
      .addCase(fetchMyOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.myOrders = action.payload;
      })
      .addCase(fetchMyOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchAllOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.allOrders = action.payload;
      })
      .addCase(fetchAllOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchOrderById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrderById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedOrder = action.payload;
      })
      .addCase(fetchOrderById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateOrderStatus.pending, (state, action) => {
        state.updatingOrderId = action.meta.arg?.orderId || null;
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        state.updatingOrderId = null;
        syncOrderInState(state, action.payload);
      })
      .addCase(updateOrderStatus.rejected, (state) => {
        state.updatingOrderId = null;
      })
      .addCase(cancelMyOrder.pending, (state, action) => {
        state.updatingOrderId = action.meta.arg || null;
      })
      .addCase(cancelMyOrder.fulfilled, (state, action) => {
        state.updatingOrderId = null;
        syncOrderInState(state, action.payload);
      })
      .addCase(cancelMyOrder.rejected, (state) => {
        state.updatingOrderId = null;
      })
      .addCase(logout.fulfilled, (state) => {
        state.myOrders = [];
        state.allOrders = [];
        state.selectedOrder = null;
        state.updatingOrderId = null;
        state.checkoutSuccess = false;
        state.error = null;
      });
  },
});

export const { resetCheckoutStatus, clearSelectedOrder } = ordersSlice.actions;

export default ordersSlice.reducer;
