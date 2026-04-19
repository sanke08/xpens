import { create } from 'zustand';
import { generateId } from '../utils/id';
import { dbService } from '../services/DatabaseService';
import { defaultCategories } from '../features/categories/categoryKeywords';
import { Category, Transaction } from '../types';

interface AppState {
  categories: Category[];
  transactions: Transaction[];
  isLoaded: boolean;
  loadData: () => void;
  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTransaction: (id: string, t: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  addCategory: (c: Omit<Category, 'id' | 'createdAt'>) => void;
  updateCategory: (id: string, c: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  categories: [],
  transactions: [],
  isLoaded: false,

  loadData: () => {
    try {
      const db = dbService.getDb();
      const catsDb = db.getAllSync<Category>('SELECT * FROM categories ORDER BY createdAt ASC;');
      const txs = db.getAllSync<Transaction>('SELECT * FROM transactions ORDER BY date DESC;');
      
      const uniqueCats = new Map<string, Category>();
      defaultCategories.forEach(c => uniqueCats.set(c.name.toLowerCase(), c));
      catsDb.forEach(c => uniqueCats.set(c.name.toLowerCase(), c));
      const allCats = Array.from(uniqueCats.values());
      
      set({ categories: allCats, transactions: txs, isLoaded: true });
    } catch (e) {
      console.error('Error loading data', e);
      set({ isLoaded: true });
    }
  },

  addTransaction: (txData) => {
    const id = generateId();
    const now = Date.now();
    const tx: Transaction = { ...txData, id, createdAt: now, updatedAt: now };
    
    // Optimistic UI
    set((state) => ({ transactions: [tx, ...state.transactions] }));
    
    // Save to DB
    const db = dbService.getDb();
    const stmt = db.prepareSync('INSERT INTO transactions (id, amount, type, categoryId, categoryName, title, note, location, withPerson, date, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.executeSync([
      tx.id, tx.amount, tx.type, tx.categoryId, tx.categoryName, tx.title, tx.note, tx.location, tx.withPerson, tx.date, tx.createdAt, tx.updatedAt
    ]);
    stmt.finalizeSync();
  },

  updateTransaction: (id, updates) => {
    // We update UI first
    set((state) => ({
      transactions: state.transactions.map((t) => (t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t))
    }));

    // Re-fetch all and update DB
    const tx = get().transactions.find(t => t.id === id);
    if (!tx) return;

    const db = dbService.getDb();
    const stmt = db.prepareSync('UPDATE transactions SET amount=?, type=?, categoryId=?, categoryName=?, title=?, note=?, location=?, withPerson=?, date=?, updatedAt=? WHERE id=?');
    stmt.executeSync([
      tx.amount, tx.type, tx.categoryId, tx.categoryName, tx.title, tx.note, tx.location, tx.withPerson, tx.date, tx.updatedAt, tx.id
    ]);
    stmt.finalizeSync();
  },

  deleteTransaction: (id) => {
    set((state) => ({ transactions: state.transactions.filter((t) => t.id !== id) }));
    const db = dbService.getDb();
    db.runSync('DELETE FROM transactions WHERE id = ?', id);
  },

  addCategory: (catData) => {
    const id = generateId();
    const now = Date.now();
    const cat: Category = { ...catData, id, createdAt: now };

    set((state) => ({ categories: [...state.categories, cat] }));

    const db = dbService.getDb();
    const stmt = db.prepareSync('INSERT INTO categories (id, name, icon, type, createdAt) VALUES (?, ?, ?, ?, ?)');
    stmt.executeSync([cat.id, cat.name, cat.icon, cat.type, cat.createdAt]);
    stmt.finalizeSync();
  },

  updateCategory: (id, updates) => {
    set((state) => ({
      categories: state.categories.map((c) => (c.id === id ? { ...c, ...updates } : c))
    }));

    const cat = get().categories.find(c => c.id === id);
    if (!cat) return;

    const db = dbService.getDb();
    const stmt = db.prepareSync('UPDATE categories SET name=?, icon=?, type=? WHERE id=?');
    stmt.executeSync([cat.name, cat.icon, cat.type, cat.id]);
    stmt.finalizeSync();
  },

  deleteCategory: (id) => {
    set((state) => ({ categories: state.categories.filter((c) => c.id !== id) }));
    const db = dbService.getDb();
    db.runSync('DELETE FROM categories WHERE id = ?', id);
  }
}));
