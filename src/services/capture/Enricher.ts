/**
 * Enricher — takes a RawCapture and returns a CapturedTransaction.
 * Handles: merchant→category mapping, duplicate detection, confidence scoring.
 */

import { Category, CapturedTransaction, Transaction } from "../../types";
import { generateId } from "../../utils/id";
import { keywordMap, normalize } from "../../features/categories/categoryKeywords";
import { lookupMerchantCategory, normalizeMerchant } from "./merchantKeywords";
import { RawCapture } from "./MessageParser";

export interface EnrichOptions {
  categories: Category[];
  recentTransactions: Transaction[];
}

export function enrich(
  raw: RawCapture,
  opts: EnrichOptions,
): CapturedTransaction {
  const { categories, recentTransactions } = opts;
  const type = raw.type === "credit" ? "income" : "expense";

  // ── Category resolution ─────────────────────────────────────────────────
  let categoryId: string | null = null;
  let categoryName: string | null = null;
  let categoryScore = 0;

  if (raw.merchant) {
    // 1. Merchant keyword map (highest specificity)
    const merchantCatId = lookupMerchantCategory(raw.merchant);
    if (merchantCatId) {
      categoryId = merchantCatId;
      categoryScore = 0.35;
    }

    // 2. General keyword map fallback
    if (!categoryId) {
      const words = normalize(raw.merchant).split(" ");
      for (const word of words) {
        if (keywordMap.has(word)) {
          categoryId = keywordMap.get(word)!;
          categoryScore = 0.2;
          break;
        }
      }
    }

    // 3. Adaptive: look for this merchant in past transactions
    if (!categoryId) {
      const merchantNorm = normalizeMerchant(raw.merchant);
      for (const tx of recentTransactions) {
        const txNote = (tx.note ?? "").toLowerCase();
        if (txNote.includes(merchantNorm) && tx.categoryId) {
          categoryId = tx.categoryId;
          categoryScore = 0.25;
          break;
        }
      }
    }
  }

  // 4. Income/expense keywords in raw text
  if (!categoryId) {
    const words = normalize(raw.rawText).split(/\s+/);
    for (const word of words) {
      if (keywordMap.has(word)) {
        categoryId = keywordMap.get(word)!;
        categoryScore = 0.1;
        break;
      }
    }
  }

  // Resolve categoryName from id
  if (categoryId) {
    const cat = categories.find((c) => c.id === categoryId);
    if (cat) {
      categoryName = cat.name;
    } else {
      categoryId = null; // stale id, reset
    }
  }

  // ── Confidence scoring ──────────────────────────────────────────────────
  let confidence = 0;

  // Amount cleanly extracted
  confidence += 0.35;

  // Bank sender identified
  if (raw.bank) confidence += 0.15;

  // Category resolved
  confidence += categoryScore;

  // Reference number present (strong signal it's a real transaction)
  if (raw.refNo) confidence += 0.1;

  // Merchant found
  if (raw.merchant) confidence += 0.05;

  confidence = Math.min(confidence, 1.0);

  return {
    id: generateId(),
    amount: raw.amount,
    type,
    categoryId,
    categoryName,
    note: raw.merchant,
    date: raw.date,
    confidence,
    source: raw.source,
    rawText: raw.rawText,
    capturedAt: Date.now(),
    bank: raw.bank,
    refNo: raw.refNo,
  };
}

// ── Duplicate detection ──────────────────────────────────────────────────────

const DUPLICATE_WINDOW_MS = 60 * 1000; // 60 seconds

export function isDuplicate(
  candidate: CapturedTransaction,
  existing: Transaction[],
  pendingCaptures: CapturedTransaction[],
): boolean {
  // Check against already-accepted transactions
  for (const tx of existing) {
    if (
      tx.amount === candidate.amount &&
      tx.type === candidate.type &&
      Math.abs(tx.date - candidate.date) < DUPLICATE_WINDOW_MS
    ) {
      return true;
    }
  }
  // Check against other pending captures
  for (const cap of pendingCaptures) {
    if (
      cap.id !== candidate.id &&
      cap.amount === candidate.amount &&
      cap.type === candidate.type &&
      Math.abs(cap.capturedAt - candidate.capturedAt) < DUPLICATE_WINDOW_MS
    ) {
      return true;
    }
  }
  return false;
}
