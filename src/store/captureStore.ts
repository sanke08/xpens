import { create } from "zustand";
import { enrich, isDuplicate } from "../services/capture/Enricher";
import { RawCapture } from "../services/capture/MessageParser";
import { CapturedTransaction, Category, Transaction } from "../types";

interface CaptureState {
  pending: CapturedTransaction[];
  // Called by ClipboardWatcher / SmsListener with a parsed raw message
  onRawCapture: (
    raw: RawCapture,
    deps: {
      categories: Category[];
      recentTransactions: Transaction[];
    },
  ) => CapturedTransaction | null;
  accept: (id: string) => CapturedTransaction | null;
  acceptAll: () => CapturedTransaction[];
  dismiss: (id: string) => void;
  dismissAll: () => void;
  updatePending: (id: string, patch: Partial<CapturedTransaction>) => void;
}

export const useCaptureStore = create<CaptureState>((set, get) => ({
  pending: [],

  onRawCapture(raw, { categories, recentTransactions }) {
    const enriched = enrich(raw, { categories, recentTransactions });

    // Dedup check
    if (isDuplicate(enriched, recentTransactions, get().pending)) {
      return null;
    }

    set((state) => ({ pending: [enriched, ...state.pending] }));
    return enriched;
  },

  accept(id) {
    const item = get().pending.find((p) => p.id === id);
    if (!item) return null;
    set((state) => ({ pending: state.pending.filter((p) => p.id !== id) }));
    return item;
  },

  acceptAll() {
    const items = get().pending;
    set({ pending: [] });
    return items;
  },

  dismiss(id) {
    set((state) => ({ pending: state.pending.filter((p) => p.id !== id) }));
  },

  dismissAll() {
    set({ pending: [] });
  },

  updatePending(id, patch) {
    set((state) => ({
      pending: state.pending.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  },
}));
