import { addDays, addMonths, addWeeks, isAfter, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { defaultCategories } from "../features/categories/categoryKeywords";
import { dbService } from "../services/DatabaseService";
import { Category, RecurringTransaction, Transaction, TransactionStatus } from "../types";
import { generateId } from "../utils/id";

interface AppState {
  categories: Category[];
  recurringTransactions: RecurringTransaction[];
  categoryMetrics: { categoryId: string; totalAmount: number; count: number; latest: number }[];
  financialSummary: { income: number; expense: number; today: number; pendingReceive: number; pendingPay: number; pendingCount: number };
  backupFolderUri: string | null;
  isLoaded: boolean;

  // Actions: Load
  initializeStore: () => void;
  syncFinancialMetrics: () => void;
  
  // Actions: Transactions
  createTransaction: (tx: Omit<Transaction, "id" | "createdAt" | "updatedAt">) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  bulkCreateTransactions: (txs: Omit<Transaction, "id" | "createdAt" | "updatedAt">[]) => void;
  
  // Actions: Fetching
  fetchTransactionById: (id: string) => Promise<Transaction | null>;
  fetchPendingTransactions: () => Promise<{ receivables: Transaction[]; payables: Transaction[] }>;
  queryTransactions: (params: {
    page: number;
    query?: string;
    status?: TransactionStatus | "all";
    categoryIds?: string[];
    dateRange?: "today" | "week" | "month" | "all";
    sortBy?: "date-desc" | "date-asc" | "amount-desc" | "amount-asc";
  }) => Promise<{ data: Transaction[]; hasMore: boolean }>;

  // Actions: Status Updates
  settleTransaction: (id: string) => void;
  settleAllPending: () => void;

  // Actions: Categories
  createCategory: (cat: Omit<Category, "id" | "createdAt">) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  // Actions: Recurring
  createRecurringTransaction: (rt: Omit<RecurringTransaction, "id" | "createdAt" | "updatedAt" | "lastGeneratedDate" | "isActive">) => void;
  updateRecurringTransaction: (id: string, updates: Partial<RecurringTransaction>) => void;
  deleteRecurringTransaction: (id: string) => void;
  automateRecurringFlow: () => void;
  
  // Actions: System
  setBackupFolderUri: (uri: string | null) => void;
  triggerBackup: () => Promise<boolean>;
  triggerMerge: () => Promise<boolean>;
  resetAccount: () => void;
}

const computeSearchText = (t: Partial<Transaction>) => {
  return [t.categoryName, t.title, t.note, t.location, t.withPerson].filter(Boolean).join(" ").toLowerCase();
};

export const useStore = create<AppState>((set, get) => ({
  categories: [],
  recurringTransactions: [],
  categoryMetrics: [],
  financialSummary: { income: 0, expense: 0, today: 0, pendingReceive: 0, pendingPay: 0, pendingCount: 0 },
  backupFolderUri: null,
  isLoaded: false,

  initializeStore: async () => {
    try {
      const db = dbService.getDb();
      db.execSync("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);");
      
      const backupFolderUri = await SecureStore.getItemAsync("backupFolderUri");
      
      // Smart Auto-Merge on launch
      await dbService.checkAndRestore(backupFolderUri);

      // Load data from DB
      const catsDb = db.getAllSync<Category>("SELECT * FROM categories ORDER BY createdAt ASC;");
      const recurringTxs = db.getAllSync<RecurringTransaction>("SELECT * FROM recurring_transactions ORDER BY createdAt DESC;");

      // Merge defaults with DB categories (unifying by ID)
      const uniqueCats = new Map<string, Category>();
      defaultCategories.forEach(c => uniqueCats.set(c.id, c));
      catsDb.forEach(c => uniqueCats.set(c.id, c));

      set({
        categories: Array.from(uniqueCats.values()),
        recurringTransactions: recurringTxs,
        backupFolderUri,
        isLoaded: true,
      });

      get().syncFinancialMetrics();
      get().automateRecurringFlow();
    } catch (e) { 
      console.error("[Store] Init failed:", e);
      set({ isLoaded: true }); 
    }
  },

  syncFinancialMetrics: () => {
    const db = dbService.getDb();
    const todayStart = startOfDay(Date.now()).getTime();

    const metrics = db.getAllSync<any>(`SELECT categoryId, SUM(amount) as totalAmount, COUNT(*) as count, MAX(date) as latest FROM transactions GROUP BY categoryId;`);
    const balance = db.getFirstSync<any>(`
      SELECT 
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense,
        SUM(CASE WHEN date >= ? THEN (CASE WHEN type = 'income' THEN amount ELSE -amount END) ELSE 0 END) as today,
        SUM(CASE WHEN status = 'pending-receive' THEN amount ELSE 0 END) as pendingReceive,
        SUM(CASE WHEN status = 'pending-pay' THEN amount ELSE 0 END) as pendingPay,
        SUM(CASE WHEN status LIKE 'pending%' THEN 1 ELSE 0 END) as pendingCount
      FROM transactions;
    `, [todayStart]) || { income: 0, expense: 0, today: 0, pendingReceive: 0, pendingPay: 0, pendingCount: 0 };

    set({ 
      categoryMetrics: metrics,
      financialSummary: { 
        income: balance.income || 0, expense: balance.expense || 0, today: balance.today || 0,
        pendingReceive: balance.pendingReceive || 0, pendingPay: balance.pendingPay || 0, pendingCount: balance.pendingCount || 0
      }
    });
  },

  fetchPendingTransactions: async () => {
    const db = dbService.getDb();
    const receivables = db.getAllSync<Transaction>("SELECT * FROM transactions WHERE status = 'pending-receive' ORDER BY date DESC;");
    const payables = db.getAllSync<Transaction>("SELECT * FROM transactions WHERE status = 'pending-pay' ORDER BY date DESC;");
    return {
      receivables: receivables.map(t => ({ ...t, status: t.status || "final", searchText: computeSearchText(t) })),
      payables: payables.map(t => ({ ...t, status: t.status || "final", searchText: computeSearchText(t) }))
    };
  },

  fetchTransactionById: async (id) => {
    const db = dbService.getDb();
    const t = db.getFirstSync<Transaction>("SELECT * FROM transactions WHERE id = ?;", [id]);
    return t ? { ...t, status: t.status || "final", searchText: computeSearchText(t) } : null;
  },

  queryTransactions: async (params) => {
    const { page, query, status, categoryIds, dateRange, sortBy } = params;
    const LIMIT = 30;
    const offset = (page - 1) * LIMIT;
    const db = dbService.getDb();
    let where = []; let args = [];

    if (query) { where.push("(title LIKE ? OR note LIKE ? OR categoryName LIKE ?)"); const q = `%${query}%`; args.push(q, q, q); }
    if (status && status !== "all") { where.push("status = ?"); args.push(status); }
    if (categoryIds?.length) { where.push(`categoryId IN (${categoryIds.map(() => "?").join(",")})`); args.push(...categoryIds); }
    if (dateRange && dateRange !== "all") {
      const now = Date.now();
      let start = dateRange === "today" ? startOfDay(now).getTime() : dateRange === "week" ? startOfWeek(now, { weekStartsOn: 1 }).getTime() : dateRange === "month" ? startOfMonth(now).getTime() : 0;
      if (start) { where.push("date >= ?"); args.push(start); }
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const orderBy = sortBy === "date-asc" ? "date ASC" : sortBy === "amount-desc" ? "amount DESC" : sortBy === "amount-asc" ? "amount ASC" : "date DESC";

    const results = db.getAllSync<Transaction>(`SELECT * FROM transactions ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?;`, [...args, LIMIT + 1, offset]);
    return {
      data: results.slice(0, LIMIT).map(t => ({ ...t, status: t.status || "final", searchText: computeSearchText(t) })),
      hasMore: results.length > LIMIT
    };
  },

  createTransaction: (txData) => {
    const tx = { ...txData, id: generateId(), createdAt: Date.now(), updatedAt: Date.now() };
    dbService.getDb().runSync(`INSERT INTO transactions (id, amount, type, categoryId, categoryName, title, note, location, withPerson, date, createdAt, updatedAt, status, settledAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
      [tx.id, tx.amount, tx.type, tx.categoryId ?? null, tx.categoryName ?? null, tx.title ?? null, tx.note ?? null, tx.location ?? null, tx.withPerson ?? null, tx.date, tx.createdAt, tx.updatedAt, tx.status || "final", tx.settledAt ?? null]);
    dbService.backupDatabase(get().backupFolderUri);
    get().syncFinancialMetrics();
  },

  bulkCreateTransactions: (txsData) => {
    const db = dbService.getDb();
    const now = Date.now();
    try {
      db.execSync("BEGIN TRANSACTION;");
      const stmt = db.prepareSync(`INSERT INTO transactions (id, amount, type, categoryId, categoryName, title, note, location, withPerson, date, createdAt, updatedAt, status, settledAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      txsData.forEach(t => stmt.executeSync([generateId(), t.amount, t.type, t.categoryId ?? null, t.categoryName ?? null, t.title ?? null, t.note ?? null, t.location ?? null, t.withPerson ?? null, t.date, now, now, t.status || "final", t.settledAt ?? null]));
      stmt.finalizeSync();
      db.execSync("COMMIT;");
      dbService.backupDatabase(get().backupFolderUri);
      get().syncFinancialMetrics();
    } catch (e) { db.execSync("ROLLBACK;"); }
  },

  updateTransaction: (id, updates) => {
    const now = Date.now();
    const current = dbService.getDb().getFirstSync<Transaction>("SELECT * FROM transactions WHERE id = ?", [id]);
    if (!current) return;
    const updated = { ...current, ...updates, updatedAt: now };
    dbService.getDb().runSync(`UPDATE transactions SET amount=?, type=?, categoryId=?, categoryName=?, title=?, note=?, location=?, withPerson=?, date=?, updatedAt=?, status=?, settledAt=? WHERE id=?`,
      [updated.amount, updated.type, updated.categoryId ?? null, updated.categoryName ?? null, updated.title ?? null, updated.note ?? null, updated.location ?? null, updated.withPerson ?? null, updated.date, updated.updatedAt, updated.status, updated.settledAt ?? null, id]);
    dbService.backupDatabase(get().backupFolderUri);
    get().syncFinancialMetrics();
  },

  deleteTransaction: (id) => {
    dbService.getDb().runSync("DELETE FROM transactions WHERE id = ?", [id]);
    dbService.backupDatabase(get().backupFolderUri);
    get().syncFinancialMetrics();
  },

  settleTransaction: (id) => {
    const now = Date.now();
    dbService.getDb().runSync("UPDATE transactions SET status='final', settledAt=?, updatedAt=? WHERE id=?", [now, now, id]);
    dbService.backupDatabase(get().backupFolderUri);
    get().syncFinancialMetrics();
  },

  settleAllPending: () => {
    const now = Date.now();
    dbService.getDb().runSync("UPDATE transactions SET status='final', settledAt=?, updatedAt=? WHERE status='pending-receive'", [now, now]);
    dbService.backupDatabase(get().backupFolderUri);
    get().syncFinancialMetrics();
  },

  createRecurringTransaction: (rtData) => {
    const rt = { ...rtData, id: generateId(), createdAt: Date.now(), updatedAt: Date.now(), lastGeneratedDate: null, isActive: true };
    dbService.getDb().runSync(`INSERT INTO recurring_transactions (id, amount, type, categoryId, categoryName, title, note, location, withPerson, interval, startDate, lastGeneratedDate, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [rt.id, rt.amount, rt.type, rt.categoryId ?? null, rt.categoryName ?? null, rt.title ?? null, rt.note ?? null, rt.location ?? null, rt.withPerson ?? null, rt.interval, rt.startDate, rt.lastGeneratedDate, 1, rt.createdAt, rt.updatedAt]);
    set(s => ({ recurringTransactions: [rt, ...s.recurringTransactions] }));
    dbService.backupDatabase(get().backupFolderUri);
    get().automateRecurringFlow();
  },

  updateRecurringTransaction: (id, updates) => {
    const now = Date.now();
    set(s => ({ recurringTransactions: s.recurringTransactions.map(rt => rt.id === id ? { ...rt, ...updates, updatedAt: now } : rt) }));
    const rt = get().recurringTransactions.find(t => t.id === id);
    if (rt) {
      dbService.getDb().runSync(`UPDATE recurring_transactions SET amount=?, type=?, categoryId=?, categoryName=?, title=?, note=?, location=?, withPerson=?, interval=?, startDate=?, isActive=?, updatedAt=? WHERE id=?`,
        [rt.amount, rt.type, rt.categoryId ?? null, rt.categoryName ?? null, rt.title ?? null, rt.note ?? null, rt.location ?? null, rt.withPerson ?? null, rt.interval, rt.startDate, rt.isActive ? 1 : 0, rt.updatedAt, id]);
      dbService.backupDatabase(get().backupFolderUri);
    }
  },

  deleteRecurringTransaction: (id) => {
    dbService.getDb().runSync("DELETE FROM recurring_transactions WHERE id = ?", [id]);
    set(s => ({ recurringTransactions: s.recurringTransactions.filter(t => t.id !== id) }));
    dbService.backupDatabase(get().backupFolderUri);
  },

  automateRecurringFlow: () => {
    const { recurringTransactions } = get();
    const now = Date.now();
    const today = startOfDay(now).getTime();
    let newTxs: any[] = [];
    let updatedRts: any[] = [];

    recurringTransactions.forEach(rt => {
      if (!rt.isActive) return;
      let nextDate = rt.lastGeneratedDate || rt.startDate;
      let count = 0;
      const occurrences = [];
      if (!rt.lastGeneratedDate && !isAfter(startOfDay(nextDate), today)) { occurrences.push(nextDate); count++; }
      
      while (count < 365) {
        if (rt.interval === "daily") nextDate = addDays(nextDate, 1).getTime();
        else if (rt.interval === "weekly") nextDate = startOfWeek(addWeeks(nextDate, 1), { weekStartsOn: 1 }).getTime();
        else if (rt.interval === "monthly") nextDate = startOfMonth(addMonths(nextDate, 1)).getTime();
        else break;
        if (isAfter(startOfDay(nextDate), today)) break;
        occurrences.push(nextDate);
        count++;
      }

      if (occurrences.length > 0) {
        occurrences.forEach(date => newTxs.push({ ...rt, id: generateId(), date, createdAt: now, updatedAt: now, status: "final", settledAt: null }));
        updatedRts.push({ id: rt.id, lastGeneratedDate: occurrences[occurrences.length - 1] });
      }
    });

    if (newTxs.length > 0) {
      get().bulkCreateTransactions(newTxs);
      const db = dbService.getDb();
      const stmt = db.prepareSync("UPDATE recurring_transactions SET lastGeneratedDate=?, updatedAt=? WHERE id=?");
      updatedRts.forEach(r => stmt.executeSync([r.lastGeneratedDate, now, r.id]));
      stmt.finalizeSync();
      set(s => ({ recurringTransactions: s.recurringTransactions.map(rt => {
        const up = updatedRts.find(u => u.id === rt.id);
        return up ? { ...rt, lastGeneratedDate: up.lastGeneratedDate, updatedAt: now } : rt;
      }) }));
    }
  },

  createCategory: (catData) => {
    const cat = { ...catData, id: generateId(), createdAt: Date.now() };
    dbService.getDb().runSync("INSERT INTO categories (id, name, icon, type, createdAt) VALUES (?, ?, ?, ?, ?)", [cat.id, cat.name, cat.icon, cat.type, cat.createdAt]);
    set(s => ({ categories: [...s.categories, cat] }));
    dbService.backupDatabase(get().backupFolderUri);
  },

  updateCategory: (id, updates) => {
    set(s => ({ categories: s.categories.map(c => c.id === id ? { ...c, ...updates } : c) }));
    const c = get().categories.find(x => x.id === id);
    if (c) dbService.getDb().runSync("UPDATE categories SET name=?, icon=?, type=? WHERE id=?", [c.name, c.icon, c.type, id]);
    dbService.backupDatabase(get().backupFolderUri);
  },

  deleteCategory: (id) => {
    dbService.getDb().runSync("DELETE FROM categories WHERE id = ?", [id]);
    set(s => ({ categories: s.categories.filter(c => c.id !== id) }));
    dbService.backupDatabase(get().backupFolderUri);
  },

  setBackupFolderUri: async (uri) => {
    if (uri) {
      await SecureStore.setItemAsync("backupFolderUri", uri);
      await dbService.mergeFromPublicFolder(uri);
      get().initializeStore();
    } else {
      await SecureStore.deleteItemAsync("backupFolderUri");
    }
    set({ backupFolderUri: uri });
  },

  triggerBackup: async () => {
    return await dbService.backupDatabase(get().backupFolderUri);
  },

  triggerMerge: async () => {
    const uri = get().backupFolderUri;
    if (!uri) return false;
    const success = await dbService.mergeFromPublicFolder(uri);
    if (success) get().initializeStore();
    return success;
  },

  resetAccount: () => {
    const db = dbService.getDb();
    db.runSync("DELETE FROM transactions;");
    db.runSync("DELETE FROM recurring_transactions;");
    set({ recurringTransactions: [] });
    get().syncFinancialMetrics();
    dbService.backupDatabase(get().backupFolderUri);
  },
}));
