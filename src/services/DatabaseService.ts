import { Directory, File, Paths } from "expo-file-system";
import { StorageAccessFramework } from "expo-file-system/legacy";
import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";
import { defaultCategories } from "../features/categories/categoryKeywords";

/**
 * DatabaseService handles SQLite operations and automated backups.
 * Features a high-integrity Semantic Merge engine.
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

  private getDbFile(): File {
    return new File(Paths.document.uri, `SQLite/${this.DB_NAME}`);
  }

  /**
   * Smart Merge: Combines backup data into the current database without overwriting.
   * Fixed: Now correctly handles raw file paths for the ATTACH command.
   */
  public async mergeFromPublicFolder(publicFolderUri: string): Promise<boolean> {
    const TEMP_DB_NAME = "temp_restore.db";
    
    try {
      const fileName = "xpens_backup.db";
      const files = await StorageAccessFramework.readDirectoryAsync(publicFolderUri);
      const backupFileUri = files.find((f: string) => f.includes(fileName));

      if (!backupFileUri) return false;

      // 1. Download backup to a temporary local file in the SQLite directory
      const base64 = await StorageAccessFramework.readAsStringAsync(backupFileUri, {
        encoding: "base64",
      });
      
      const tempFile = new File(Paths.document.uri, `SQLite/${TEMP_DB_NAME}`);
      await tempFile.write(base64, { encoding: "base64" });

      // 2. Prepare raw path for SQLite (Remove 'file://' prefix)
      // SQLite ATTACH command requires a raw filesystem path, not a URI.
      const rawTempPath = tempFile.uri.replace("file://", "");

      // 3. Use SQLite ATTACH to merge data
      try {
        this.db.execSync(`ATTACH DATABASE '${rawTempPath}' AS backup_db;`);
        
        this.db.execSync("BEGIN TRANSACTION;");

        // Merge Categories (De-dupe by ID)
        this.db.execSync(`
          INSERT OR IGNORE INTO main.categories 
          SELECT * FROM backup_db.categories;
        `);

        // Merge Transactions (De-dupe by ID)
        this.db.execSync(`
          INSERT OR IGNORE INTO main.transactions 
          SELECT * FROM backup_db.transactions;
        `);

        // Merge Recurring Transactions (De-dupe by ID)
        this.db.execSync(`
          INSERT OR IGNORE INTO main.recurring_transactions 
          SELECT * FROM backup_db.recurring_transactions;
        `);

        this.db.execSync("COMMIT;");
      } catch (transactionError) {
        try {
          this.db.execSync("ROLLBACK;");
        } catch (e) {
          // Rollback failed (probably because transaction never started)
        }
        console.error("[DB] Merge Transaction Error:", transactionError);
        throw transactionError;
      } finally {
        try {
          this.db.execSync("DETACH DATABASE backup_db;");
        } catch (detachError) {
          // Silently handle if it wasn't attached
        }
        if (tempFile.exists) tempFile.delete();
      }

      return true;
    } catch (e) {
      console.error("[DB] Merge process failed:", e);
      return false;
    }
  }

  public async checkAndRestore(backupFolderUri: string | null): Promise<boolean> {
    if (!backupFolderUri) return false;
    try {
      const row = this.db.getFirstSync<{ count: number }>("SELECT COUNT(*) as count FROM transactions;");
      // If the app is practically empty, try to merge from backup
      if (row && row.count < 5) {
        return await this.mergeFromPublicFolder(backupFolderUri);
      }
    } catch (e) {
      console.error("[DB] Auto-merge check failed:", e);
    }
    return false;
  }

  public async backupDatabase(publicFolderUri?: string | null): Promise<boolean> {
    try {
      const dbFile = this.getDbFile();
      if (!dbFile.exists) return false;

      if (publicFolderUri) {
        try {
          const base64 = await dbFile.base64();
          const fileName = "xpens_backup.db";
          const files = await StorageAccessFramework.readDirectoryAsync(publicFolderUri);
          const existingFile = files.find((f: string) => f.includes(fileName));

          let targetUri = existingFile;
          if (!targetUri) {
            targetUri = await StorageAccessFramework.createFileAsync(
              publicFolderUri,
              fileName,
              "application/octet-stream",
            );
          }

          await StorageAccessFramework.writeAsStringAsync(targetUri, base64, {
            encoding: "base64",
          });
          return true;
        } catch (safError) {
          console.error("[DB] SAF Sync failed:", safError);
          return false;
        }
      }
      return true;
    } catch (e) {
      console.error("[DB] Backup failed:", e);
      return false;
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

    this.db.execSync(`
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
      CREATE INDEX IF NOT EXISTS idx_transactions_categoryId ON transactions(categoryId);
      CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
    `);

    const row = this.db.getFirstSync<{ count: number }>(
      "SELECT COUNT(*) as count FROM categories;",
    );
    if (row && row.count === 0) {
      const statement = this.db.prepareSync(
        "INSERT INTO categories (id, name, icon, type, createdAt) VALUES (?, ?, ?, ?, ?)",
      );
      for (const cat of defaultCategories) {
        statement.executeSync([cat.id, cat.name, cat.icon, cat.type, cat.createdAt]);
      }
      statement.finalizeSync();
    }
  }
}

export const dbService = DatabaseService.getInstance();
