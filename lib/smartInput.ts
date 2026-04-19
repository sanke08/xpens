import { Category, Transaction } from "./store";
import { FOOD_KEYWORDS, TRAVEL_KEYWORDS, SHOPPING_KEYWORDS } from "./categoryKeywords";

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

    // Adaptive Learning from History (Fastest & Smartest way)
    // If the user used these words before, we assign the same category they picked last time!
    if (!suggestedCategory && pastTransactions.length > 0) {
      const words = lowerNote.split(" ").filter((w) => w.length > 2); // Ignore short words like "to", "a"
      
      for (const tx of pastTransactions) {
        if (!tx.note || !tx.categoryId) continue;
        
        const txNoteLower = tx.note.toLowerCase();
        // Look for standalone word matches to avoid "car" matching "carrot"
        const hasMatch = words.some((w) => new RegExp(`\\b${w}\\b`).test(txNoteLower));

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

    // 3. Fast Dictionary Fallback (Hundreds of items mapped in O(1) time without massive IF statements)
    if (!suggestedCategory) {
      const words = lowerNote.split(" ").filter((w) => w.length > 2);
      
      const hasFood = words.some(w => FOOD_KEYWORDS.has(w));
      const hasTravel = words.some(w => TRAVEL_KEYWORDS.has(w));
      const hasShopping = words.some(w => SHOPPING_KEYWORDS.has(w));

      if (hasFood) {
        suggestedCategory = categories.find((c) => c.name.toLowerCase() === "food") || null;
        if (!type) type = "expense";
      } else if (hasTravel) {
        suggestedCategory = categories.find((c) => c.name.toLowerCase() === "travel") || null;
        if (!type) type = "expense";
      } else if (hasShopping) {
        suggestedCategory = categories.find((c) => c.name.toLowerCase() === "shopping") || null;
        if (!type) type = "expense";
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
