const STORAGE_KEY = 'saturation_point_carts_by_owner';
const LEGACY_STORAGE_KEY = 'saturation_point_cart_items';

const normalizeOwnerId = (ownerId) => (ownerId ? String(ownerId) : 'guest');

const readCartMap = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch (error) {
    return {};
  }
};

const writeCartMap = (map) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (error) {}
};

export const initDatabase = () => {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch (error) {}
};

export const getCartItemsFromDatabase = (ownerId = 'guest') => {
  const scopedOwner = normalizeOwnerId(ownerId);
  const map = readCartMap();
  return Array.isArray(map[scopedOwner]) ? map[scopedOwner] : [];
};

export const saveCartItemToDatabase = (item, ownerId = 'guest') => {
  const scopedOwner = normalizeOwnerId(ownerId);
  const map = readCartMap();
  const items = Array.isArray(map[scopedOwner]) ? [...map[scopedOwner]] : [];
  const existingIndex = items.findIndex((i) => i.product === item.product);
  if (existingIndex !== -1) {
    items[existingIndex] = item;
  } else {
    items.push(item);
  }
  map[scopedOwner] = items;
  writeCartMap(map);
};

export const removeCartItemFromDatabase = (productId, ownerId = 'guest') => {
  const scopedOwner = normalizeOwnerId(ownerId);
  const map = readCartMap();
  const items = Array.isArray(map[scopedOwner]) ? map[scopedOwner] : [];
  map[scopedOwner] = items.filter((i) => i.product !== productId);
  writeCartMap(map);
};

export const clearCartDatabase = (ownerId = 'guest') => {
  const scopedOwner = normalizeOwnerId(ownerId);
  const map = readCartMap();
  delete map[scopedOwner];
  writeCartMap(map);
};

export const mergeGuestCartToUserInDatabase = (userId) => {
  const targetOwner = normalizeOwnerId(userId);
  if (targetOwner === 'guest') {
    return getCartItemsFromDatabase('guest');
  }

  const guestItems = getCartItemsFromDatabase('guest');
  if (guestItems.length === 0) {
    return getCartItemsFromDatabase(targetOwner);
  }

  const userItems = getCartItemsFromDatabase(targetOwner);
  for (const guestItem of guestItems) {
    const existing = userItems.find((item) => item.product === guestItem.product);
    if (existing) {
      const availableStock = Number(
        guestItem.stock !== undefined ? guestItem.stock : existing.stock
      );
      const rawNext = existing.quantity + guestItem.quantity;
      const cappedNext =
        availableStock > 0 ? Math.min(availableStock, rawNext) : rawNext;
      saveCartItemToDatabase(
        {
          ...existing,
          ...guestItem,
          quantity: Math.max(1, cappedNext),
        },
        targetOwner
      );
    } else {
      saveCartItemToDatabase(guestItem, targetOwner);
    }
  }

  clearCartDatabase('guest');
  return getCartItemsFromDatabase(targetOwner);
};
