import { createSlice } from '@reduxjs/toolkit';
import {
  getCartItemsFromDatabase,
  saveCartItemToDatabase,
  removeCartItemFromDatabase,
  clearCartDatabase,
} from '../services/sqliteService';

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: [],
    hydrated: false,
  },
  reducers: {
    hydrateCart: (state) => {
      try {
        state.items = getCartItemsFromDatabase();
      } catch (error) {
        state.items = [];
      }
      state.hydrated = true;
    },
    addToCart: (state, action) => {
      const incomingItem = action.payload;
      const existingItem = state.items.find(
        (item) => item.product === incomingItem.product
      );

      if (existingItem) {
        existingItem.quantity += incomingItem.quantity || 1;
        saveCartItemToDatabase(existingItem);
      } else {
        const newItem = {
          ...incomingItem,
          quantity: incomingItem.quantity || 1,
        };
        state.items.push(newItem);
        saveCartItemToDatabase(newItem);
      }
    },
    updateQuantity: (state, action) => {
      const { product, quantity } = action.payload;
      const existingItem = state.items.find((item) => item.product === product);

      if (existingItem) {
        if (quantity <= 0) {
          state.items = state.items.filter((item) => item.product !== product);
          removeCartItemFromDatabase(product);
        } else {
          existingItem.quantity = quantity;
          saveCartItemToDatabase(existingItem);
        }
      }
    },
    removeFromCart: (state, action) => {
      const productId = action.payload;
      state.items = state.items.filter((item) => item.product !== productId);
      removeCartItemFromDatabase(productId);
    },
    clearCart: (state) => {
      state.items = [];
      clearCartDatabase();
    },
  },
});

export const {
  hydrateCart,
  addToCart,
  updateQuantity,
  removeFromCart,
  clearCart,
} = cartSlice.actions;

export const selectCartItems = (state) => state.cart.items;
export const selectCartCount = (state) =>
  state.cart.items.reduce((acc, item) => acc + item.quantity, 0);
export const selectCartTotal = (state) =>
  state.cart.items.reduce((acc, item) => acc + item.price * item.quantity, 0);

export default cartSlice.reducer;
