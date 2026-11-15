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
      const incomingQty = incomingItem.quantity || 1;
      const existingItem = state.items.find(
        (item) => item.product === incomingItem.product
      );

      if (existingItem) {
        const availableStock = Number(
          incomingItem.stock !== undefined ? incomingItem.stock : existingItem.stock
        );
        const rawNext = existingItem.quantity + incomingQty;
        const cappedNext =
          availableStock > 0 ? Math.min(availableStock, rawNext) : rawNext;
        existingItem.quantity = Math.max(1, cappedNext);
        if (incomingItem.stock !== undefined) {
          existingItem.stock = incomingItem.stock;
        }
        saveCartItemToDatabase(existingItem);
      } else {
        const availableStock = Number(incomingItem.stock);
        const cappedQty =
          availableStock > 0 ? Math.min(availableStock, incomingQty) : incomingQty;
        const newItem = {
          ...incomingItem,
          quantity: Math.max(1, cappedQty),
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
