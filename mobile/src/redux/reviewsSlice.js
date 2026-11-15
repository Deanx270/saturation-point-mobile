import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../api/client';
import { fetchProductDetails } from './productsSlice';

export const checkEligibility = createAsyncThunk(
  'reviews/checkEligibility',
  async (productId, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/reviews/${productId}/eligibility`);
      return response.data.eligible;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to check eligibility');
    }
  }
);

export const submitReview = createAsyncThunk(
  'reviews/submitReview',
  async ({ productId, rating, comment }, { dispatch, rejectWithValue }) => {
    try {
      const response = await apiClient.post(`/reviews/${productId}`, { rating, comment });
      dispatch(fetchProductDetails(productId));
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to submit review');
    }
  }
);

export const editReview = createAsyncThunk(
  'reviews/editReview',
  async ({ productId, reviewId, rating, comment }, { dispatch, rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/reviews/${productId}/${reviewId}`, {
        rating,
        comment,
      });
      dispatch(fetchProductDetails(productId));
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update review');
    }
  }
);

export const removeReview = createAsyncThunk(
  'reviews/removeReview',
  async ({ productId, reviewId }, { dispatch, rejectWithValue }) => {
    try {
      await apiClient.delete(`/reviews/${productId}/${reviewId}`);
      dispatch(fetchProductDetails(productId));
      return reviewId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete review');
    }
  }
);

const reviewsSlice = createSlice({
  name: 'reviews',
  initialState: {
    isEligible: false,
    loading: false,
    submitting: false,
    error: null,
    submitSuccess: false,
  },
  reducers: {
    resetReviewStatus: (state) => {
      state.submitSuccess = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkEligibility.pending, (state) => {
        state.loading = true;
      })
      .addCase(checkEligibility.fulfilled, (state, action) => {
        state.loading = false;
        state.isEligible = action.payload;
      })
      .addCase(checkEligibility.rejected, (state, action) => {
        state.loading = false;
        state.isEligible = false;
        state.error = action.payload;
      })
      .addCase(submitReview.pending, (state) => {
        state.submitting = true;
        state.error = null;
        state.submitSuccess = false;
      })
      .addCase(submitReview.fulfilled, (state) => {
        state.submitting = false;
        state.submitSuccess = true;
      })
      .addCase(submitReview.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })
      .addCase(editReview.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(editReview.fulfilled, (state) => {
        state.submitting = false;
        state.submitSuccess = true;
      })
      .addCase(editReview.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      });
  },
});

export const { resetReviewStatus } = reviewsSlice.actions;

export default reviewsSlice.reducer;
