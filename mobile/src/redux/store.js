import { configureStore } from '@reduxjs/toolkit';
import productsReducer from './productsSlice';
import ordersReducer from './ordersSlice';
import reviewsReducer from './reviewsSlice';
import cartReducer from './cartSlice';
import authReducer from './authSlice';
import categoriesReducer from './categoriesSlice';
import brandsReducer from './brandsSlice';

export const store = configureStore({
  reducer: {
    products: productsReducer,
    orders: ordersReducer,
    reviews: reviewsReducer,
    cart: cartReducer,
    auth: authReducer,
    categories: categoriesReducer,
    brands: brandsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;
