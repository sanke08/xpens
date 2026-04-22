import { create } from "zustand";
import { generateId } from "../utils/id";
import { dbService } from "../services/DatabaseService";
import { defaultCategories } from "../features/categories/categoryKeywords";
import { Category, RecurringTransaction, Transaction } from "../types";
import {
  addDays,
  addMonths,
  addWeeks,
  isAfter,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

interface AppState {
  categories: Category[];
  transactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
  isLoaded: boolean;
  loadData: () => void;
  addTransaction: (
    t: Omit<Transaction, "id" | "createdAt" | "updatedAt">,
  ) => void;
  addTransactions: (
    txs: Omit<Transaction, "id" | "createdAt" | "updatedAt">[],
  ) => void;
  updateTransaction: (id: string, t: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  addRecurringTransaction: (
    t: Omit<
      RecurringTransaction,
      "id" | "createdAt" | "updatedAt" | "lastGeneratedDate" | "isActive"
    >,
  ) => void;
  updateRecurringTransaction: (
    id: string,
    t: Partial<RecurringTransaction>,
  ) => void;
  deleteRecurringTransaction: (id: string) => void;
  processRecurringTransactions: () => void;
  addCategory: (c: Omit<Category, "id" | "createdAt">) => void;
  updateCategory: (id: string, c: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  clearAllTransactions: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  categories: [],
  transactions: [],
  recurringTransactions: [],
  isLoaded: false,

  loadData: () => {
    try {
      const db = dbService.getDb();
      const catsDb = db.getAllSync<Category>(
        "SELECT * FROM categories ORDER BY createdAt ASC;",
      );
      const txs = db.getAllSync<Transaction>(
        "SELECT * FROM transactions ORDER BY date DESC;",
      );
      const recurringTxs = db.getAllSync<RecurringTransaction>(
        "SELECT * FROM recurring_transactions ORDER BY createdAt DESC;",
      );

      const uniqueCats = new Map<string, Category>();
      defaultCategories.forEach((c) => uniqueCats.set(c.name.toLowerCase(), c));
      catsDb.forEach((c) => uniqueCats.set(c.name.toLowerCase(), c));
      const allCats = Array.from(uniqueCats.values());

      set({
        categories: allCats,
        transactions: txs,
        recurringTransactions: recurringTxs,
        isLoaded: true,
      });

      // After loading, process automated recurring transactions
      get().processRecurringTransactions();
    } catch (e) {
      console.error("Error loading data", e);
      set({ isLoaded: true });
    }
  },

  processRecurringTransactions: () => {
    const { recurringTransactions } = get();
    const now = Date.now();
    const today = startOfDay(now).getTime();

    let newTransactions: Transaction[] = [];
    let updatedRecurring: RecurringTransaction[] = [];

    recurringTransactions.forEach((rt) => {
      if (!rt.isActive) return;

      let lastDate = rt.lastGeneratedDate;
      let nextDate = lastDate || rt.startDate;
      let count = 0;
      const MAX_OCCURRENCES = 365;

      const occurrences: number[] = [];

      // If never generated, consider the start date as the first occurrence
      if (!lastDate) {
        if (!isAfter(startOfDay(nextDate), today)) {
          occurrences.push(nextDate);
          count++;
        }
      }

      while (count < MAX_OCCURRENCES) {
        if (rt.interval === "daily") {
          nextDate = addDays(nextDate, 1).getTime();
        } else if (rt.interval === "weekly") {
          // Move to the 1st day of the next week (Monday)
          nextDate = startOfWeek(addWeeks(nextDate, 1), {
            weekStartsOn: 1,
          }).getTime();
        } else if (rt.interval === "monthly") {
          // Move to the 1st of the next month
          nextDate = startOfMonth(addMonths(nextDate, 1)).getTime();
        } else {
          break;
        }

        if (isAfter(startOfDay(nextDate), today)) break;
        occurrences.push(nextDate);
        count++;
      }

      if (occurrences.length > 0) {
        occurrences.forEach((date) => {
          const newTx: Transaction = {
            id: generateId(),
            amount: rt.amount,
            type: rt.type,
            categoryId: rt.categoryId,
            categoryName: rt.categoryName,
            title: rt.title,
            note: rt.note,
            location: rt.location,
            withPerson: rt.withPerson,
            date: date,
            createdAt: now,
            updatedAt: now,
          };
          newTransactions.push(newTx);
        });

        const updatedRt = {
          ...rt,
          lastGeneratedDate: occurrences[occurrences.length - 1],
          updatedAt: now,
        };
        updatedRecurring.push(updatedRt);
      }
    });

    if (newTransactions.length > 0 || updatedRecurring.length > 0) {
      const db = dbService.getDb();

      try {
        // Save new transactions
        if (newTransactions.length > 0) {
          const insertStmt = db.prepareSync(
            "INSERT INTO transactions (id, amount, type, categoryId, categoryName, title, note, location, withPerson, date, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          );
          newTransactions.forEach((tx) => {
            insertStmt.executeSync([
              tx.id,
              tx.amount,
              tx.type,
              tx.categoryId,
              tx.categoryName,
              tx.title,
              tx.note,
              tx.location,
              tx.withPerson,
              tx.date,
              tx.createdAt,
              tx.updatedAt,
            ]);
          });
          insertStmt.finalizeSync();
        }

        // Update recurring transactions state
        if (updatedRecurring.length > 0) {
          const updateStmt = db.prepareSync(
            "UPDATE recurring_transactions SET lastGeneratedDate=?, updatedAt=? WHERE id=?",
          );
          updatedRecurring.forEach((rt) => {
            updateStmt.executeSync([rt.lastGeneratedDate, rt.updatedAt, rt.id]);
          });
          updateStmt.finalizeSync();
        }

        // Update store
        set((state) => ({
          transactions: [...newTransactions, ...state.transactions].sort(
            (a, b) => b.date - a.date,
          ),
          recurringTransactions: state.recurringTransactions.map(
            (rt) => updatedRecurring.find((u) => u.id === rt.id) || rt,
          ),
        }));
      } catch (err) {
        console.error("Error processing recurring transactions:", err);
      }
    }
  },

  addTransaction: (txData) => {
    const id = generateId();
    const now = Date.now();
    const tx: Transaction = { ...txData, id, createdAt: now, updatedAt: now };

    set((state) => ({ transactions: [tx, ...state.transactions] }));

    const db = dbService.getDb();
    const stmt = db.prepareSync(
      "INSERT INTO transactions (id, amount, type, categoryId, categoryName, title, note, location, withPerson, date, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    );
    stmt.executeSync([
      tx.id,
      tx.amount,
      tx.type,
      tx.categoryId,
      tx.categoryName,
      tx.title,
      tx.note,
      tx.location,
      tx.withPerson,
      tx.date,
      tx.createdAt,
      tx.updatedAt,
    ]);
    stmt.finalizeSync();
  },

  addTransactions: (txsData) => {
    const now = Date.now();
    const newTxs: Transaction[] = txsData.map((t) => ({
      ...t,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    }));

    set((state) => ({
      transactions: [...newTxs, ...state.transactions].sort(
        (a, b) => b.date - a.date,
      ),
    }));

    const db = dbService.getDb();
    try {
      db.execSync("BEGIN TRANSACTION;");
      const stmt = db.prepareSync(
        "INSERT INTO transactions (id, amount, type, categoryId, categoryName, title, note, location, withPerson, date, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      );
      newTxs.forEach((tx) => {
        stmt.executeSync([
          tx.id,
          tx.amount,
          tx.type,
          tx.categoryId,
          tx.categoryName,
          tx.title,
          tx.note,
          tx.location,
          tx.withPerson,
          tx.date,
          tx.createdAt,
          tx.updatedAt,
        ]);
      });
      stmt.finalizeSync();
      db.execSync("COMMIT;");
    } catch (e) {
      db.execSync("ROLLBACK;");
      console.error("Error adding batch transactions", e);
    }
  },

  updateTransaction: (id, updates) => {
    set((state) => ({
      transactions: state.transactions.map((t) =>
        t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t,
      ),
    }));

    const tx = get().transactions.find((t) => t.id === id);
    if (!tx) return;

    const db = dbService.getDb();
    const stmt = db.prepareSync(
      "UPDATE transactions SET amount=?, type=?, categoryId=?, categoryName=?, title=?, note=?, location=?, withPerson=?, date=?, updatedAt=? WHERE id=?",
    );
    stmt.executeSync([
      tx.amount,
      tx.type,
      tx.categoryId,
      tx.categoryName,
      tx.title,
      tx.note,
      tx.location,
      tx.withPerson,
      tx.date,
      tx.updatedAt,
      tx.id,
    ]);
    stmt.finalizeSync();
  },

  deleteTransaction: (id) => {
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    }));
    const db = dbService.getDb();
    db.runSync("DELETE FROM transactions WHERE id = ?", id);
  },

  addRecurringTransaction: (rtData) => {
    const id = generateId();
    const now = Date.now();
    const rt: RecurringTransaction = {
      ...rtData,
      id,
      createdAt: now,
      updatedAt: now,
      lastGeneratedDate: null,
      isActive: true,
    };

    set((state) => ({
      recurringTransactions: [rt, ...state.recurringTransactions],
    }));

    const db = dbService.getDb();
    const stmt = db.prepareSync(
      "INSERT INTO recurring_transactions (id, amount, type, categoryId, categoryName, title, note, location, withPerson, interval, startDate, lastGeneratedDate, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    );
    stmt.executeSync([
      rt.id,
      rt.amount,
      rt.type,
      rt.categoryId,
      rt.categoryName,
      rt.title,
      rt.note,
      rt.location,
      rt.withPerson,
      rt.interval,
      rt.startDate,
      rt.lastGeneratedDate,
      rt.isActive ? 1 : 0,
      rt.createdAt,
      rt.updatedAt,
    ]);
    stmt.finalizeSync();

    get().processRecurringTransactions();
  },

  updateRecurringTransaction: (id, updates) => {
    set((state) => ({
      recurringTransactions: state.recurringTransactions.map((rt) =>
        rt.id === id ? { ...rt, ...updates, updatedAt: Date.now() } : rt,
      ),
    }));

    const rt = get().recurringTransactions.find((t) => t.id === id);
    if (!rt) return;

    const db = dbService.getDb();
    const stmt = db.prepareSync(
      "UPDATE recurring_transactions SET amount=?, type=?, categoryId=?, categoryName=?, title=?, note=?, location=?, withPerson=?, interval=?, startDate=?, isActive=?, updatedAt=? WHERE id=?",
    );
    stmt.executeSync([
      rt.amount,
      rt.type,
      rt.categoryId,
      rt.categoryName,
      rt.title,
      rt.note,
      rt.location,
      rt.withPerson,
      rt.interval,
      rt.startDate,
      rt.isActive ? 1 : 0,
      rt.updatedAt,
      rt.id,
    ]);
    stmt.finalizeSync();
  },

  deleteRecurringTransaction: (id) => {
    set((state) => ({
      recurringTransactions: state.recurringTransactions.filter(
        (t) => t.id !== id,
      ),
    }));
    const db = dbService.getDb();
    db.runSync("DELETE FROM recurring_transactions WHERE id = ?", id);
  },

  addCategory: (catData) => {
    const id = generateId();
    const now = Date.now();
    const cat: Category = { ...catData, id, createdAt: now };

    set((state) => ({ categories: [...state.categories, cat] }));

    const db = dbService.getDb();
    const stmt = db.prepareSync(
      "INSERT INTO categories (id, name, icon, type, createdAt) VALUES (?, ?, ?, ?, ?)",
    );
    stmt.executeSync([cat.id, cat.name, cat.icon, cat.type, cat.createdAt]);
    stmt.finalizeSync();
  },

  updateCategory: (id, updates) => {
    set((state) => ({
      categories: state.categories.map((c) =>
        c.id === id ? { ...c, ...updates } : c,
      ),
    }));

    const cat = get().categories.find((c) => c.id === id);
    if (!cat) return;

    const db = dbService.getDb();
    const stmt = db.prepareSync(
      "UPDATE categories SET name=?, icon=?, type=? WHERE id=?",
    );
    stmt.executeSync([cat.name, cat.icon, cat.type, cat.id]);
    stmt.finalizeSync();
  },

  deleteCategory: (id) => {
    set((state) => ({
      categories: state.categories.filter((c) => c.id !== id),
    }));
    const db = dbService.getDb();
    db.runSync("DELETE FROM categories WHERE id = ?", id);
  },

  clearAllTransactions: () => {
    set({ transactions: [], recurringTransactions: [] });
    const db = dbService.getDb();
    db.runSync("DELETE FROM transactions;");
    db.runSync("DELETE FROM recurring_transactions;");
  },
}));
