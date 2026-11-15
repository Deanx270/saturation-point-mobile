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
      quantity INTEGER NOT NULL,
      image TEXT,
      brand TEXT,
      stock INTEGER
    );
  `);
};

export const getCartItemsFromDatabase = () => {
  const db = getDatabase();
  const rows = db.getAllSync('SELECT * FROM cart_items;');
  return rows.map((row) => ({
    product: row.product_id,
    name: row.name,
    price: row.price,
    quantity: row.quantity,
    image: row.image,
    brand: row.brand,
    stock: row.stock,
  }));
};

export const saveCartItemToDatabase = (item) => {
  const db = getDatabase();
  db.runSync(
    `INSERT OR REPLACE INTO cart_items (product_id, name, price, quantity, image, brand, stock)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [
      item.product,
      item.name,
      item.price,
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
