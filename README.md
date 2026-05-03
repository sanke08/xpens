# Rxpense

A personal expense tracker built with React Native and Expo. Dark-themed, offline-first, with a smart natural-language input system.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Expo ~54 / React Native 0.81 |
| Routing | Expo Router v6 (file-based) |
| State | Zustand v5 |
| Database | expo-sqlite (SQLite) |
| Animations | react-native-reanimated v4 |
| Gestures | react-native-gesture-handler |
| Icons | lucide-react-native |
| Dates | date-fns v4 |
| Language | TypeScript (strict) |
| Engine | Hermes + New Architecture |
| React Compiler | Enabled (experimental) |

---

## Features

### Smart Input
Type a freeform string like `200 pizza` and it auto-parses amount, category, and type.

- **3-tier categorization**: category name fuzzy match → keyword dictionary → past transaction history
- **Keyword map**: 100+ terms mapped to categories (pizza→Food, uber→Transport, etc.)
- **Adaptive learning**: learns from your own transaction history over time
- **Auto type detection**: marks as Income or Expense based on keywords

### Transactions
- Add/edit transactions via a bottom-sheet modal
- Optional fields: title, note, location, "with person"
- Expense / Income toggle
- Browse all transactions with real-time debounced search (300ms)
- Filter by All / Expense / Income
- Grouped by date (Today, Yesterday, formatted date)
- Pagination — 50 per page, lazy loads on scroll
- Swipe-to-delete with haptic feedback

### Recurring Transactions
- Convert any transaction to a recurring one (Daily / Weekly / Monthly)
- Auto-generated on app load — creates all due entries up to today
- Pause/resume support
- Max 365 occurrences generated per run to prevent runaway inserts
- Manage via dedicated Recurring screen

### Categories
- 12 default categories: Food, Groceries, Transport, Rent, Utilities, Entertainment, Shopping, Health, Travel, Salary, Business, Other
- Create custom categories with name, type (Expense/Income), and icon
- 16 lucide icons to choose from
- Category detail view: all transactions in that category, grouped by date

### Dashboard
- Balance card: total balance, total income, total expenses, today's net
- Category breakdown sorted by amount spent
- Navigate to any category's transaction history

### Settings
- Link to manage categories
- Export / Import data (UI present, partially implemented — see roadmap)
- Clear all data

### UI / UX
- Dark theme throughout
- Animated list entrances (FadeInDown / FadeInUp)
- Smooth keyboard-aware layout via Reanimated
- Safe area handling
- Indian Rupee (₹) locale formatting

---

## Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Dashboard | `/` | Overview: balance card + category summaries |
| Add/Edit Transaction | `/transaction` | Modal sheet for creating or editing a transaction |
| All Transactions | `/transactions` | Searchable, filterable, paginated transaction list |
| Recurring | `/recurring` | Manage automated recurring transactions |
| Categories | `/categories` | View all categories, create new ones |
| Category Detail | `/category/[id]` | All transactions for a specific category |
| Settings | `/settings` | App configuration and data management |

---

## Project Structure

```
app/                        # Expo Router file-based routes
├── _layout.tsx             # Root stack navigator + app init
├── index.tsx               # Redirect → Dashboard
├── transaction.tsx         # Add/Edit modal
├── transactions.tsx        # All transactions
├── recurring/index.tsx     # Recurring management
├── categories.tsx          # Categories list
├── category/[id].tsx       # Category detail
└── settings.tsx            # Settings

src/
├── components/             # Shared UI components
│   ├── BalanceCard.tsx
│   ├── TransactionRow.tsx
│   ├── CategorySummaryRow.tsx
│   ├── SwipeableRow.tsx
│   └── keyboard/KeyboardAwareView.tsx
├── features/
│   ├── dashboard/screens/DashboardScreen.tsx
│   ├── transactions/
│   │   ├── screens/TransactionScreen.tsx
│   │   ├── screens/TransactionsScreen.tsx
│   │   ├── screens/RecurringTransactionsScreen.tsx
│   │   ├── components/AutoSuggestBlock.tsx   # Category suggestions
│   │   └── components/EGBlock.tsx            # Live parse preview
│   ├── categories/
│   │   ├── screens/CategoriesScreen.tsx
│   │   ├── screens/CategoryDetailScreen.tsx
│   │   ├── categoryKeywords.ts               # Keyword→category map
│   │   └── iconMap.ts                        # Icon name→component map
│   └── settings/screens/SettingsScreen.tsx
├── services/
│   └── DatabaseService.ts  # SQLite singleton (CRUD + indices)
├── store/
│   └── useStore.ts         # Zustand store (categories, transactions, recurring)
├── types/
│   └── index.ts            # TypeScript types
├── theme/
│   └── colors.ts           # Dark theme color palette
└── utils/
    ├── smartInput.ts       # Natural language parser
    └── id.ts               # ID generation
```

---

## Database Schema

Three SQLite tables, created on first launch:

```sql
categories (id, name, icon, type, createdAt)
transactions (id, amount, type, categoryId, title, note, location, withPerson, date, searchText, createdAt)
recurring_transactions (id, amount, type, categoryId, title, note, interval, isActive, lastGeneratedDate, createdAt)
```

Indices on: `transactions.date`, `transactions.categoryId`, `transactions.type`, `recurring_transactions.isActive`.

---

## Roadmap / Not Yet Implemented

| Feature | Status |
|---------|--------|
| Export data to file (JSON/CSV) | UI exists, no file system write |
| Import data from file | Button exists, not wired up |
| Edit/delete categories | Create only |
| Edit existing recurring transactions | Delete only |
| Transaction date picker | Hardcoded to current time |
| App lock (biometrics/PIN) | Setting stub, not implemented |
| Charts / spending trends | Not started |
| Push notifications for recurring | Not started |
| Multi-currency support | Hardcoded ₹ |
| Cloud sync / backup | Not started |

---

## Getting Started

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm expo start

# Run on Android
pnpm expo run:android

# Run on iOS
pnpm expo run:ios
```

Requires Node 18+, pnpm, and Expo CLI. For device builds, Android Studio or Xcode is needed.

---

## Debug Utilities

The Dashboard footer contains three debug-only buttons (visible in dev):

- **+30 Data** — Seeds 30 random transactions + 4 recurring entries
- **Replay** — Re-triggers list entrance animations
- **Clear All** — Wipes all transactions and recurring items
