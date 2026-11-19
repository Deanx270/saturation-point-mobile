import * as SQLite from 'expo-sqlite';

let databaseInstance = null;

const getDatabase = () => {
  if (!databaseInstance) {
    databaseInstance = SQLite.openDatabaseSync('saturation_point.db');
  }
  return databaseInstance;
};

export const initDatabase = () => {
  const db = getDatabase();
  db.execSync(`
    CREATE TABLE IF NOT EXISTS cart_items (
      product_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      original_price REAL,
      discount_percent INTEGER DEFAULT 0,
      quantity INTEGER NOT NULL,
      image TEXT,
      brand TEXT,
      stock INTEGER
    );
  `);
  try {
    db.execSync('ALTER TABLE cart_items ADD COLUMN original_price REAL;');
  } catch (e) {}
  try {
    db.execSync(
      'ALTER TABLE cart_items ADD COLUMN discount_percent INTEGER DEFAULT 0;'
    );
  } catch (e) {}
};

export const getCartItemsFromDatabase = () => {
  const db = getDatabase();
  const rows = db.getAllSync('SELECT * FROM cart_items;');
  return rows.map((row) => ({
    product: row.product_id,
    name: row.name,
    price: row.price,
    originalPrice: row.original_price ?? row.price,
    discountPercent: row.discount_percent || 0,
    quantity: row.quantity,
    image: row.image,
    brand: row.brand,
    stock: row.stock,
  }));
};

export const saveCartItemToDatabase = (item) => {
  const db = getDatabase();
  db.runSync(
    `INSERT OR REPLACE INTO cart_items (product_id, name, price, original_price, discount_percent, quantity, image, brand, stock)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
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

export const removeCartItemFromDatabase = (productId) => {
  const db = getDatabase();
  db.runSync('DELETE FROM cart_items WHERE product_id = ?;', [productId]);
};

export const clearCartDatabase = () => {
  const db = getDatabase();
  db.runSync('DELETE FROM cart_items;');
};
