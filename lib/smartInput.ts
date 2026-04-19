import { Category } from "./store";

export interface SmartInputResult {
  amount: number | null;
  note: string | null;
  suggestedCategory: Category | null;
  type: "income" | "expense" | null;
}

export function parseSmartInput(
  input: string,
  categories: Category[],
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

    // Default heuristics if no exact match
    if (!suggestedCategory) {
      if (
        lowerNote.includes("food") ||
        lowerNote.includes("pizza") ||
        lowerNote.includes("dinner") ||
        lowerNote.includes("lunch") ||
        lowerNote.includes("swiggy") ||
        lowerNote.includes("zomato")
      ) {
        suggestedCategory =
          categories.find((c) => c.name.toLowerCase() === "food") || null;
        if (!type) type = "expense";
      } else if (
        lowerNote.includes("uber") ||
        lowerNote.includes("ola") ||
        lowerNote.includes("taxi") ||
        lowerNote.includes("flight") ||
        lowerNote.includes("bus") ||
        lowerNote.includes("train")
      ) {
        suggestedCategory =
          categories.find((c) => c.name.toLowerCase() === "travel") || null;
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
