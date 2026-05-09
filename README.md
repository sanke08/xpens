# Rxpense

A high-performance personal expense tracker built with React Native and Expo. Dark-themed, offline-first, featuring a smart natural-language input system and an ultra-optimized rendering engine.

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
| Worklets | react-native-worklets |
| Icons | lucide-react-native |
| Dates | date-fns v4 |
| Language | TypeScript (strict) |
| Engine | Hermes + New Architecture |

---

## Core Features

### 🚀 Extreme Performance Engine
Designed for lightning-fast responsiveness even with 10,000+ transactions.
- **O(1) Layout Calculation**: Pre-calculated list offsets eliminate frame drops during scrolling.
- **Stable Object Caching**: Persistent `useRef` caches for render data and list item references, preventing unnecessary reconciliation.
- **Zero-Logic Rendering**: All string formatting (currency, dates) and style calculations are offloaded to a background stage, leaving the UI thread 100% free for painting.
- **Virtualized Optimization**: Optimized `windowSize` and `maxToRenderPerBatch` for zero-flash scrolling.

### 🔍 Advanced Search & Filters
- **Smart Search**: Dedicated pre-computed search text field in SQLite for $O(n)$ lightning-fast lookups.
- **Multi-Stage Pipeline**: Filtering → Sorting → Pagination pipeline ensures expensive calculations only run when data actually changes.
- **Rich Filters**: Filter by status (Final/Pending), Category, Date Range (Today/Week/Month/Custom), and Sort by Date or Amount.

### 🧠 Smart Natural Language Input
Type freeform strings like `200 pizza with john` and it auto-parses amount, category, and type.
- **3-tier categorization**: fuzzy match → keyword dictionary → past transaction history.
- **Keyword map**: 100+ terms mapped to categories (e.g., pizza → Food).
- **Auto-detection**: Smartly marks entries as Income or Expense based on context.

### ⏳ Pending Payments (Lend/Borrow)
Manage transactions that aren't yet "Final" with a dedicated Pending management system.
- **Pending-Receive**: Track money people owe you.
- **Pending-Pay**: Track money you owe others.
- **Settlement**: One-tap settlement to convert pending entries into final transactions.

### 🔄 Recurring Transactions
- **Auto-generation**: Creates due entries on app load (Daily/Weekly/Monthly).
- **Safety Limits**: Prevents runaway inserts with occurrence caps.
- **Pause/Resume**: Full control over automated entry generation.

---

## Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Dashboard | `/` | Overview: Balance card, pending summaries, and category spend. |
| Add/Edit | `/transaction` | Smart input modal for creating or editing entries. |
| Transactions | `/transactions` | The primary list view with advanced search and high-speed scrolling. |
| Pending | `/pending` | Management for lend/borrow (Pay/Receive) transactions. |
| Recurring | `/recurring` | Manage automated recurring transactions. |
| Categories | `/categories` | View all categories and create custom ones. |
| Category Detail| `/category/[id]` | Optimized view of all transactions in a specific category. |

---

## Project Structure

```
app/                        # Expo Router file-based routes
├── _layout.tsx             # Root stack navigator + app init
├── index.tsx               # Redirect → Dashboard
├── transaction.tsx         # Add/Edit modal
├── transactions.tsx        # Optimized All transactions list
├── pending.tsx             # Pending payments management
├── recurring/index.tsx     # Recurring management
└── category/[id].tsx       # Category detail view

src/
├── components/             # Shared UI components (TransactionRow, SwipeableRow)
├── features/
│   ├── dashboard/          # Balance & Analytics
│   ├── transactions/       # Search, Filters, and List Logic
│   ├── pending/            # Lend/Borrow management
│   └── categories/         # Category management & Keyword maps
├── services/               # DatabaseService (SQLite CRUD)
├── store/                  # Zustand global state
├── theme/                  # COLORS palette
└── utils/                  # smartInput parser & date helpers
```

---

## Roadmap

- [x] Extreme Performance List Engine
- [x] Advanced Multi-category Filtering
- [x] Pending Payment Settlement System
- [ ] Export/Import Data (CSV/JSON)
- [ ] Transaction Date Picker (Manual override)
- [ ] Interactive Spending Charts
- [ ] Cloud Sync (Supabase/Firebase)
- [ ] Biometric App Lock

---

## Getting Started

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm expo start

# Run on Android/iOS
pnpm expo run:android
pnpm expo run:ios
```

Requires Node 18+, pnpm, and Expo CLI.
