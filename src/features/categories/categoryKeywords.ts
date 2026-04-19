import { Category } from '../../types';

export const defaultCategories: Category[] = [
  { id: "food", name: "Food", icon: "pizza", type: "expense", createdAt: 0 },
  { id: "groceries", name: "Groceries", icon: "shopping-cart", type: "expense", createdAt: 0 },
  { id: "transport", name: "Transport", icon: "car", type: "expense", createdAt: 0 },
  { id: "rent", name: "Rent", icon: "home", type: "expense", createdAt: 0 },
  { id: "utilities", name: "Utilities", icon: "lightbulb", type: "expense", createdAt: 0 },
  { id: "entertainment", name: "Entertainment", icon: "gamepad2", type: "expense", createdAt: 0 },
  { id: "shopping", name: "Shopping", icon: "shopping-bag", type: "expense", createdAt: 0 },
  { id: "health", name: "Health", icon: "heart-pulse", type: "expense", createdAt: 0 },
  { id: "travel", name: "Travel", icon: "plane", type: "expense", createdAt: 0 },
  { id: "salary", name: "Salary", icon: "banknote", type: "income", createdAt: 0 },
  { id: "business", name: "Business", icon: "briefcase", type: "income", createdAt: 0 },
  { id: "other", name: "Other", icon: "circle-dot", type: "expense", createdAt: 0 }
];

const keywordData: Record<string, string[]> = {
  "food": ["pizza", "burger", "food", "zomato", "swiggy", "dinner", "lunch", "pepsi", "coke", "coffee", "tea", "snack", "drink", "breakfast"],
  "groceries": ["milk", "vegetables", "grocery", "mart", "dmart"],
  "transport": ["uber", "ola", "fuel", "petrol", "diesel", "auto", "bus", "cab", "metro", "train"],
  "rent": ["rent", "flat", "apartment"],
  "utilities": ["electricity", "water", "wifi", "internet", "bill"],
  "entertainment": ["movie", "netflix", "spotify", "game"],
  "shopping": ["amazon", "flipkart", "clothes", "shopping", "myntra", "shoes"],
  "health": ["doctor", "medicine", "hospital"],
  "travel": ["flight", "trip", "hotel", "travel", "plane", "airport"],
  "salary": ["salary", "income", "paycheck"],
  "business": ["client", "project", "freelance"],
};

export const keywordMap = new Map<string, string>();
Object.entries(keywordData).forEach(([catId, keywords]) => {
  keywords.forEach((k) => keywordMap.set(k, catId));
});

export const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9\s]/g, "");
