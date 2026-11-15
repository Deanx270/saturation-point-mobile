const STORAGE_KEY = 'saturation_point_cart_items';

export const initDatabase = () => {};

export const getCartItemsFromDatabase = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
};

export const saveCartItemToDatabase = (item) => {
  try {
    const items = getCartItemsFromDatabase();
    const existingIndex = items.findIndex((i) => i.product === item.product);
    if (existingIndex !== -1) {
      items[existingIndex] = item;
    } else {
      items.push(item);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (error) {}
};

export const removeCartItemFromDatabase = (productId) => {
  try {
    const items = getCartItemsFromDatabase();
    const updated = items.filter((i) => i.product !== productId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {}
};

export const clearCartDatabase = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {}
};
