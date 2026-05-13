import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";
import { Paths, File } from "expo-file-system";
import { StorageAccessFramework } from "expo-file-system/legacy";
import { generateId } from "../utils/id";

/**
 * DatabaseService implements the Singleton pattern.
 * It manages the SQLite database connection and initialization,
 * ensuring only one instance accesses the database directly.
 */
class DatabaseService {
  private static instance: DatabaseService;
  private db: SQLiteDatabase;
  private readonly DB_NAME = "rxpense.db";

  private constructor() {
    this.db = openDatabaseSync(this.DB_NAME);
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public getDb(): SQLiteDatabase {
    return this.db;
  }

  /**
   * Performs an automatic backup of the database to the internal document directory
   * and attempts to sync it to a public folder if a URI is provided.
   */
  public async backupDatabase(publicFolderUri?: string | null): Promise<void> {
    try {
      const documentDir = Paths.document.uri;
      if (!documentDir) {
        console.warn("[DB] Backup aborted: documentDirectory is null");
        return;
      }
      const dbPath = `${documentDir}SQLite/${this.DB_NAME}`;
      const internalBackupPath = `${documentDir}xpens_backup.db`;
      
      // 1. Internal backup (Standard safety)
      const dbFile = new File(dbPath);
      if (dbFile.exists) {
        dbFile.copy(new File(internalBackupPath));
      }

      // 2. Persistent Public Backup (Survives Uninstall)
      if (publicFolderUri) {
        try {
          const base64 = await dbFile.base64();
          const fileName = "xpens_backup.db";
          
          // Check if file already exists in that folder to overwrite it
          const files = await StorageAccessFramework.readDirectoryAsync(publicFolderUri);
          const existingFile = files.find((f: string) => f.endsWith(fileName));
          
          let targetUri = existingFile;
          if (!targetUri) {
            targetUri = await StorageAccessFramework.createFileAsync(
              publicFolderUri,
              fileName,
              "application/octet-stream"
            );
          }
          
          await StorageAccessFramework.writeAsStringAsync(targetUri, base64, {
            encoding: "base64",
          });
          console.log("[DB] Persistent backup updated at:", targetUri);
        } catch (safError) {
          console.warn("[DB] Public SAF backup failed:", safError);
        }
      }
    } catch (e) {
      console.warn("[DB] Backup failed:", e);
    }
  }

  private addColumnIfMissing(table: string, column: string, definition: string) {
    try {
      const cols = this.db.getAllSync<{ name: string }>(
        `PRAGMA table_info(${table});`,
      );
      if (cols.some((c) => c.name === column)) return;
      this.db.execSync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
    } catch (e) {
      console.warn(`[DB] addColumnIfMissing failed for ${table}.${column}:`, e);
    }
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
        updatedAt INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'final',
        settledAt INTEGER
      );
    `);

    // Migration: add status + settledAt columns to existing installs
    this.addColumnIfMissing("transactions", "status", "TEXT NOT NULL DEFAULT 'final'");
    this.addColumnIfMissing("transactions", "settledAt", "INTEGER");

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
      CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
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
    
    // Trigger an initial backup
    this.backupDatabase();
  }
}

export const dbService = DatabaseService.getInstance();
