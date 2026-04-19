import * as SQLite from 'expo-sqlite';
import { generateId } from './id';

// Initialize the database asynchronously, but we return the reference
export const db = SQLite.openDatabaseSync('rxpense.db');

export const initDb = () => {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      type TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      categoryId TEXT,
      categoryName TEXT,
      title TEXT,
      note TEXT,
      location TEXT,
      withPerson TEXT,
      date INTEGER NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );
  `);

  // Check if categories are empty, if so, seed default categories
  const row = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM categories;');
  if (row && row.count === 0) {
    const defaultCategories = [
      { id: generateId(), name: 'Food', icon: 'pizza', type: 'expense' },
      { id: generateId(), name: 'Travel', icon: 'car', type: 'expense' },
      { id: generateId(), name: 'Shopping', icon: 'shopping-bag', type: 'expense' },
      { id: generateId(), name: 'Bills', icon: 'receipt', type: 'expense' },
      { id: generateId(), name: 'Health', icon: 'activity', type: 'expense' },
      { id: generateId(), name: 'Salary', icon: 'banknote', type: 'income' },
      { id: generateId(), name: 'Misc', icon: 'package', type: 'expense' }
    ];

    const statement = db.prepareSync('INSERT INTO categories (id, name, icon, type, createdAt) VALUES (?, ?, ?, ?, ?)');
    for (const cat of defaultCategories) {
      statement.executeSync([cat.id, cat.name, cat.icon, cat.type, Date.now()]);
    }
    statement.finalizeSync();
  }
};
