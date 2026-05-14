import { Category } from "../../types";

export const defaultCategories: Category[] = [
  { id: "cat_food", name: "Food", icon: "pizza", type: "expense", createdAt: 1715670000000 },
  { id: "cat_dining", name: "Dining", icon: "coffee", type: "expense", createdAt: 1715670000001 },
  { id: "cat_groceries", name: "Groceries", icon: "shopping-cart", type: "expense", createdAt: 1715670000002 },
  { id: "cat_transport", name: "Transport", icon: "car", type: "expense", createdAt: 1715670000003 },
  { id: "cat_travel", name: "Travel", icon: "plane", type: "expense", createdAt: 1715670000004 },
  { id: "cat_shopping", name: "Shopping", icon: "shopping-bag", type: "expense", createdAt: 1715670000005 },
  { id: "cat_electronics", name: "Electronics", icon: "smartphone", type: "expense", createdAt: 1715670000006 },
  { id: "cat_home", name: "Home", icon: "sofa", type: "expense", createdAt: 1715670000007 },
  { id: "cat_rent", name: "Rent", icon: "key", type: "expense", createdAt: 1715670000008 },
  { id: "cat_bills", name: "Bills", icon: "receipt", type: "expense", createdAt: 1715670000009 },
  { id: "cat_utilities", name: "Utilities", icon: "zap", type: "expense", createdAt: 1715670000010 },
  { id: "cat_education", name: "Education", icon: "book-open", type: "expense", createdAt: 1715670000011 },
  { id: "cat_health", name: "Health", icon: "activity", type: "expense", createdAt: 1715670000012 },
  { id: "cat_fitness", name: "Fitness", icon: "dumbbell", type: "expense", createdAt: 1715670000013 },
  { id: "cat_grooming", name: "Grooming", icon: "scissors", type: "expense", createdAt: 1715670000014 },
  { id: "cat_entertainment", name: "Entertainment", icon: "gamepad-2", type: "expense", createdAt: 1715670000015 },
  { id: "cat_investments", name: "Investments", icon: "trending-up", type: "expense", createdAt: 1715670000016 },
  { id: "cat_gifts", name: "Gifts", icon: "gift", type: "expense", createdAt: 1715670000017 },
  { id: "cat_salary", name: "Salary", icon: "banknote", type: "income", createdAt: 1715670000018 },
  { id: "cat_misc", name: "Misc", icon: "package", type: "expense", createdAt: 1715670000019 },
];

const keywordData: Record<string, string[]> = {
  Food: ["pizza", "burger", "zomato", "swiggy", "kfc", "mcdonalds", "chai", "samosa", "bakery", "cake", "maggi", "snacks"],
  Dining: ["coffee", "starbucks", "restaurant", "dinner", "lunch", "breakfast", "dine", "bar", "pub", "cafe"],
  Groceries: ["milk", "egg", "meat", "vegetables", "fruits", "dairy", "bigbasket", "instamart", "blinkit", "zepto", "grocery", "mart"],
  Transport: ["uber", "ola", "auto", "bus", "cab", "metro", "train", "rapido", "rickshaw", "fuel", "petrol", "diesel", "fastag"],
  Travel: ["flight", "trip", "hotel", "travel", "plane", "airport", "indigo", "airindia", "redbus", "makemytrip", "goibibo", "booking"],
  Shopping: ["clothes", "myntra", "zara", "amazon", "flipkart", "shoes", "bag", "wallet", "nykaa", "ajio", "trends"],
  Electronics: ["laptop", "mobile", "gadget", "iphone", "samsung", "headphone", "croma", "camera", "tablet"],
  Home: ["furniture", "decor", "curtain", "bed", "sofa", "ikea", "pepperfry", "livspace", "maintenance", "maid", "cook"],
  Rent: ["rent", "flat", "apartment", "deposit"],
  Bills: ["recharge", "mobile", "airtel", "jio", "vi", "subscription", "netflix", "spotify", "hotstar", "prime", "youtube"],
  Utilities: ["electricity", "water", "wifi", "internet", "gas", "tax", "emi", "loan", "bill"],
  Education: ["college", "school", "tuition", "fees", "course", "udemy", "coursera", "books", "stationery"],
  Health: ["doctor", "medicine", "hospital", "pharmacy", "clinic", "test", "lab", "dental", "medical"],
  Fitness: ["gym", "cult", "fitness", "yoga", "protein", "supplement", "creatine", "sports"],
  Grooming: ["salon", "spa", "haircut", "massage", "parlor", "cosmetics", "makeup", "perfume"],
  Entertainment: ["movie", "cinema", "theatre", "game", "ps5", "xbox", "steam", "concert", "event", "club", "party"],
  Investments: ["stocks", "crypto", "bitcoin", "sip", "mutual", "gold", "trading", "zerodha", "groww"],
  Gifts: ["gift", "donation", "charity", "birthday", "wedding"],
  Salary: ["salary", "income", "paycheck", "bonus", "dividend", "interest", "stipend", "freelance"],
  Misc: ["misc", "other", "unknown", "general", "cash", "lost", "found"]
};

export const keywordMap = new Map<string, string>();
Object.entries(keywordData).forEach(([catName, keywords]) => {
  keywords.forEach((k) => keywordMap.set(k.toLowerCase(), catName.toLowerCase()));
});

export const normalize = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9\s]/g, "");
