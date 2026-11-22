import * as SQLite from 'expo-sqlite';

let databaseInstance = null;

const getDatabase = () => {
  if (!databaseInstance) {
    databaseInstance = SQLite.openDatabaseSync('saturation_point.db');
  }
  return databaseInstance;
};

const normalizeOwnerId = (ownerId) => (ownerId ? String(ownerId) : 'guest');

const mapCartRow = (row) => ({
  product: row.product_id,
  name: row.name,
  price: row.price,
  originalPrice: row.original_price ?? row.price,
  discountPercent: row.discount_percent || 0,
  quantity: row.quantity,
  image: row.image,
  brand: row.brand,
  stock: row.stock,
});

export const initDatabase = () => {
  const db = getDatabase();
  const columns = db.getAllSync('PRAGMA table_info(cart_items);');
  if (columns.length > 0 && !columns.some((col) => col.name === 'owner_id')) {
    db.execSync('DROP TABLE IF EXISTS cart_items;');
  }
  db.execSync(`
    CREATE TABLE IF NOT EXISTS cart_items (
      owner_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      original_price REAL,
      discount_percent INTEGER DEFAULT 0,
      quantity INTEGER NOT NULL,
      image TEXT,
      brand TEXT,
      stock INTEGER,
      PRIMARY KEY (owner_id, product_id)
    );
  `);
};

export const getCartItemsFromDatabase = (ownerId = 'guest') => {
  const db = getDatabase();
  const scopedOwner = normalizeOwnerId(ownerId);
  const rows = db.getAllSync(
    'SELECT * FROM cart_items WHERE owner_id = ?;',
    [scopedOwner]
  );
  return rows.map(mapCartRow);
};

export const saveCartItemToDatabase = (item, ownerId = 'guest') => {
  const db = getDatabase();
  const scopedOwner = normalizeOwnerId(ownerId);
  db.runSync(
    `INSERT OR REPLACE INTO cart_items (owner_id, product_id, name, price, original_price, discount_percent, quantity, image, brand, stock)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      scopedOwner,
      item.product,
      item.name,
      item.price,
      item.originalPrice ?? item.price,
      item.discountPercent || 0,
      item.quantity,
      item.image || '',
      item.brand || '',
      item.stock || 0,
    ]
  );
};

export const removeCartItemFromDatabase = (productId, ownerId = 'guest') => {
  const db = getDatabase();
  const scopedOwner = normalizeOwnerId(ownerId);
  db.runSync(
    'DELETE FROM cart_items WHERE owner_id = ? AND product_id = ?;',
    [scopedOwner, productId]
  );
};

export const clearCartDatabase = (ownerId = 'guest') => {
  const db = getDatabase();
  const scopedOwner = normalizeOwnerId(ownerId);
  db.runSync('DELETE FROM cart_items WHERE owner_id = ?;', [scopedOwner]);
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
