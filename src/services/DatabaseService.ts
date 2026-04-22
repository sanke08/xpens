import * as SQLite from "expo-sqlite";
import { generateId } from "../utils/id";

/**
 * DatabaseService implements the Singleton pattern.
 * It manages the SQLite database connection and initialization,
 * ensuring only one instance accesses the database directly.
 */
class DatabaseService {
  private static instance: DatabaseService;
  private db: SQLite.SQLiteDatabase;

  private constructor() {
    this.db = SQLite.openDatabaseSync("rxpense.db");
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public getDb(): SQLite.SQLiteDatabase {
    return this.db;
  }

  public initDb(): void {
    this.db.execSync(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        type TEXT NOT NULL,
        createdAt INTEGER NOT NULL
      );
    `);

    this.db.execSync(`
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

    this.db.execSync(`
      CREATE TABLE IF NOT EXISTS recurring_transactions (
        id TEXT PRIMARY KEY NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        categoryId TEXT,
        categoryName TEXT,
        title TEXT,
        note TEXT,
        location TEXT,
        withPerson TEXT,
        interval TEXT NOT NULL,
        startDate INTEGER NOT NULL,
        lastGeneratedDate INTEGER,
        isActive INTEGER NOT NULL DEFAULT 1,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );
    `);

    // Performance Indices
    this.db.execSync(`
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
      CREATE INDEX IF NOT EXISTS idx_transactions_categoryId ON transactions(categoryId);
      CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
      CREATE INDEX IF NOT EXISTS idx_recurring_isActive ON recurring_transactions(isActive);
    `);

    // Seed default categories if empty
    const row = this.db.getFirstSync<{ count: number }>(
      "SELECT COUNT(*) as count FROM categories;",
    );
    if (row && row.count === 0) {
      const defaultCategories = [
        { id: generateId(), name: "Food", icon: "pizza", type: "expense" },
        { id: generateId(), name: "Travel", icon: "car", type: "expense" },
        {
          id: generateId(),
          name: "Shopping",
          icon: "shopping-bag",
          type: "expense",
        },
        { id: generateId(), name: "Bills", icon: "receipt", type: "expense" },
        { id: generateId(), name: "Health", icon: "activity", type: "expense" },
        { id: generateId(), name: "Salary", icon: "banknote", type: "income" },
        { id: generateId(), name: "Misc", icon: "package", type: "expense" },
      ];

      const statement = this.db.prepareSync(
        "INSERT INTO categories (id, name, icon, type, createdAt) VALUES (?, ?, ?, ?, ?)",
      );
      for (const cat of defaultCategories) {
        statement.executeSync([
          cat.id,
          cat.name,
          cat.icon,
          cat.type,
          Date.now(),
        ]);
      }
      statement.finalizeSync();
    }
  }
}

export const dbService = DatabaseService.getInstance();
