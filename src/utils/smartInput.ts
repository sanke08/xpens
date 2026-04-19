import { keywordMap, normalize } from "../features/categories/categoryKeywords";
import { Category, Transaction } from "../types";

export interface SmartInputResult {
  amount: number | null;
  note: string | null;
  suggestedCategory: Category | null;
  type: "income" | "expense" | null;
}

export function parseSmartInput(
  input: string,
  categories: Category[],
  pastTransactions: Transaction[] = [],
): SmartInputResult {
  if (!input.trim()) {
    return { amount: null, note: null, suggestedCategory: null, type: null };
  }

  // Find the first number in the string
  const numberMatch = input.match(/\d+(\.\d+)?/);
  const amount = numberMatch ? parseFloat(numberMatch[0]) : null;

  // Rest of the input is considered the note
  let note = input.replace(numberMatch ? numberMatch[0] : "", "").trim();
  if (note === "") note = "";

  let suggestedCategory: Category | null = null;
  let type: "income" | "expense" | null = null;

  if (note) {
    const lowerNote = note.toLowerCase();

    // Check for obvious income keywords
    if (
      lowerNote.includes("salary") ||
      lowerNote.includes("bonus") ||
      lowerNote.includes("income")
    ) {
      type = "income";
    }

    // Attempt to match with category names
    for (const cat of categories) {
      if (lowerNote.includes(cat.name.toLowerCase())) {
        suggestedCategory = cat;
        type = cat.type as "income" | "expense";
        break;
      }
    }

    // 3. Fast Dictionary mapped by Object
    if (!suggestedCategory) {
      const clean = normalize(note);
      const words = clean.split(" ");

      for (const word of words) {
        if (keywordMap.has(word)) {
          const mappedCatId = keywordMap.get(word);
          const found = categories.find(
            (c) => c.id === mappedCatId || c.name.toLowerCase() === mappedCatId,
          );
          if (found) {
            suggestedCategory = found;
            type = found.type as any;
            break;
          }
        }
      }
    }

    // 4. Adaptive Learning from History (Fallback)
    // If the user used these words before, we assign the same category they picked last time!
    if (!suggestedCategory && pastTransactions.length > 0) {
      const words = lowerNote.split(" ").filter((w) => w.length > 2); // Ignore short words like "to", "a"

      for (const tx of pastTransactions) {
        if (!tx.note || !tx.categoryId) continue;

        const txNoteLower = tx.note.toLowerCase();
        // Look for standalone word matches to avoid "car" matching "carrot"
        const hasMatch = words.some((w) =>
          new RegExp(`\\b${w}\\b`).test(txNoteLower),
        );

        if (hasMatch) {
          const matchedCat = categories.find((c) => c.id === tx.categoryId);
          if (matchedCat) {
            suggestedCategory = matchedCat;
            type = tx.type;
            break;
          }
        }
      }
    }
  }

  return {
    amount,
    note,
    suggestedCategory,
    type,
  };
}
