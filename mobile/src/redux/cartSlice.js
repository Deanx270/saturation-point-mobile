import { createSlice } from '@reduxjs/toolkit';
import {
  getCartItemsFromDatabase,
  saveCartItemToDatabase,
  removeCartItemFromDatabase,
  clearCartDatabase,
} from '../services/sqliteService';
import { resolveProductPricing } from '../utils/formatters';

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
        if (incomingItem.price !== undefined) {
          existingItem.price = incomingItem.price;
        }
        if (incomingItem.originalPrice !== undefined) {
          existingItem.originalPrice = incomingItem.originalPrice;
        }
        if (incomingItem.discountPercent !== undefined) {
          existingItem.discountPercent = incomingItem.discountPercent;
        }
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
          originalPrice: incomingItem.originalPrice ?? incomingItem.price,
          discountPercent: incomingItem.discountPercent || 0,
          quantity: Math.max(1, cappedQty),
        };
        state.items.push(newItem);
        saveCartItemToDatabase(newItem);
      }
    },
    syncCartProductPricing: (state, action) => {
      const latest = action.payload;
      if (!latest?._id) {
        return;
      }
      const existingItem = state.items.find(
        (item) => item.product === latest._id
      );
      if (!existingItem) {
        return;
      }
      const pricing = resolveProductPricing(latest);
      existingItem.price = pricing.effectivePrice;
      existingItem.originalPrice = pricing.basePrice;
      existingItem.discountPercent = pricing.discountPercent;
      if (latest.name) {
        existingItem.name = latest.name;
      }
      if (latest.brand) {
        existingItem.brand = latest.brand;
      }
      if (latest.images?.[0]) {
        existingItem.image = latest.images[0];
      }
      if (latest.stock !== undefined) {
        existingItem.stock = Math.max(0, Number(latest.stock) || 0);
      }
      saveCartItemToDatabase(existingItem);
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
    restoreCartItems: (state, action) => {
      const list = Array.isArray(action.payload)
        ? action.payload
        : action.payload
        ? [action.payload]
        : [];
      for (const entry of list) {
        if (!entry?.product) {
          continue;
        }
        const alreadyExists = state.items.some(
          (item) => item.product === entry.product
        );
        if (!alreadyExists) {
          const normalized = {
            ...entry,
            quantity: Math.max(1, Number(entry.quantity) || 1),
          };
          state.items.push(normalized);
          saveCartItemToDatabase(normalized);
        }
      }
    },
  },
});

export const {
  hydrateCart,
  addToCart,
  syncCartProductPricing,
  updateQuantity,
  removeFromCart,
  clearCart,
  restoreCartItems,
} = cartSlice.actions;

export const selectCartItems = (state) => state.cart.items;
export const selectCartCount = (state) =>
  state.cart.items.reduce((acc, item) => acc + item.quantity, 0);
export const selectCartTotal = (state) =>
  state.cart.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
export const selectCartSavings = (state) =>
  state.cart.items.reduce((acc, item) => {
    const base = Number(item.originalPrice) || item.price;
    return acc + Math.max(0, base - item.price) * item.quantity;
  }, 0);

export default cartSlice.reducer;
