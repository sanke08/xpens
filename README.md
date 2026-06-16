# Rxpense

A personal expense tracker for Android built with React Native and Expo. Rxpense auto-imports transactions from bank SMS messages, uses a five-tier smart parser to categorize expenses, and tracks pending payments, recurring transactions, and category-level metrics — all backed by a local SQLite database with no backend or cloud dependency.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [SQLite Schema](#sqlite-schema)
3. [Zustand State](#zustand-state)
4. [Smart Input Parser](#smart-input-parser)
5. [SMS Parsing](#sms-parsing)
6. [Routes and Screens](#routes-and-screens)
7. [Features](#features)
8. [Performance](#performance)
9. [Theme](#theme)
10. [Setup](#setup)

---

## Tech Stack

| Package | Version | Purpose |
|---|---|---|
| expo | ~54.0.34 | App framework and build tooling |
| react-native | 0.81.5 | Mobile runtime |
| TypeScript | — | Type safety |
| expo-router | v6 | File-based navigation |
| expo-sqlite | 16.0.10 | Local relational database |
| zustand | v5 | Global state management |
| react-native-reanimated | 4.1.1 | UI animations |
| react-native-gesture-handler | — | Swipe and gesture interactions |
| lucide-react-native | — | Icons |
| date-fns | — | Date formatting and arithmetic |
| expo-secure-store | — | Secure key/value storage |
| react-native-worklets | — | Worklet execution for reanimated |
| react-native-get-sms-android | — | Read device SMS (Android only) |
| expo-haptics | — | Tactile feedback |
| expo-font | — | Custom font loading |

**Package manager:** pnpm  
**No environment variables required.** There is no backend and no remote endpoints.

---

## SQLite Schema

All tables are created by `services/DatabaseService.ts` on first launch. Timestamps are stored as Unix milliseconds (INTEGER).

### `categories`

```sql
CREATE TABLE IF NOT EXISTS categories (
  id        TEXT    PRIMARY KEY NOT NULL,
  name      TEXT    NOT NULL,
  icon      TEXT    NOT NULL,
  type      TEXT    NOT NULL,   -- "expense" | "income"
  createdAt INTEGER NOT NULL
);
```

### `transactions`

```sql
CREATE TABLE IF NOT EXISTS transactions (
  id           TEXT    PRIMARY KEY NOT NULL,
  amount       REAL    NOT NULL,
  type         TEXT    NOT NULL,         -- "income" | "expense"
  categoryId   TEXT,
  categoryName TEXT,                     -- denormalized for render performance
  title        TEXT,
  note         TEXT,
  location     TEXT,
  withPerson   TEXT,
  date         INTEGER NOT NULL,
  createdAt    INTEGER NOT NULL,
  updatedAt    INTEGER NOT NULL,
  status       TEXT    NOT NULL DEFAULT 'final',
                                         -- "final" | "pending-receive" | "pending-pay"
  settledAt    INTEGER
);

CREATE INDEX IF NOT EXISTS idx_transactions_date       ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_categoryId ON transactions(categoryId);
CREATE INDEX IF NOT EXISTS idx_transactions_status     ON transactions(status);
```

`categoryName` is denormalized at write time to avoid a JOIN on every list render.

### `recurring_transactions`

```sql
CREATE TABLE IF NOT EXISTS recurring_transactions (
  id                TEXT    PRIMARY KEY NOT NULL,
  amount            REAL    NOT NULL,
  type              TEXT    NOT NULL,
  categoryId        TEXT,
  categoryName      TEXT,
  title             TEXT,
  note              TEXT,
  location          TEXT,
  withPerson        TEXT,
  interval          TEXT    NOT NULL,   -- "daily" | "weekly" | "monthly"
  startDate         INTEGER NOT NULL,
  lastGeneratedDate INTEGER,
  isActive          INTEGER NOT NULL DEFAULT 1,   -- 1 = active, 0 = paused
  createdAt         INTEGER NOT NULL,
  updatedAt         INTEGER NOT NULL
);
```

---

## Zustand State

The entire app state lives in a single store (`store/useStore.ts`).

```typescript
interface AppStore {
  // State
  categories: Category[]
  recurringTransactions: RecurringTransaction[]
  categoryMetrics: {
    categoryId: string
    totalAmount: number
    count: number
    latest: number   // timestamp of most recent transaction
  }[]
  financialSummary: {
    income: number
    expense: number
    today: number
    pendingReceive: number
    pendingPay: number
    pendingCount: number
  }
  backupFolderUri: string | null
  isLoaded: boolean

  // Core
  initializeStore(): Promise<void>
  syncFinancialMetrics(): Promise<void>

  // Transactions
  createTransaction(data): Promise<void>
  updateTransaction(id, data): Promise<void>
  deleteTransaction(id): Promise<void>
  bulkCreateTransactions(data[]): Promise<void>
  fetchTransactionById(id): Promise<Transaction | null>
  fetchPendingTransactions(): Promise<Transaction[]>
  queryTransactions(params): Promise<{ data: Transaction[]; hasMore: boolean; nextPage: number }>
  settleTransaction(id): Promise<void>
  settleAllPending(): Promise<void>

  // Categories
  createCategory(data): Promise<void>
  updateCategory(id, data): Promise<void>
  deleteCategory(id): Promise<void>

  // Recurring
  createRecurringTransaction(data): Promise<void>
  updateRecurringTransaction(id, data): Promise<void>
  deleteRecurringTransaction(id): Promise<void>
  automateRecurringFlow(): Promise<void>

  // Backup
  setBackupFolderUri(uri): Promise<void>
  triggerBackup(): Promise<void>
  triggerMerge(): Promise<void>

  // Account
  resetAccount(): Promise<void>
}
```

`initializeStore()` is called once in the root layout. It runs migrations, seeds the 19 default categories on a fresh install, loads all state slices, and starts `automateRecurringFlow()`.

`syncFinancialMetrics()` runs SQL `GROUP BY` / `SUM` / `COUNT` aggregations and is called after every mutation that affects totals. JavaScript receives only the final numbers, never raw rows.

`queryTransactions()` returns 30 records per page with `{ data, hasMore, nextPage }`.

---

## Smart Input Parser

**File:** `src/utils/smartInput.ts`

Parses a free-form text string (typed note or extracted SMS body) and returns `{ amount, type, categoryId, categoryName }`. Tiers run in sequence; later tiers can override an earlier tier's category but not its amount.

### Tier 1 — Amount Extraction

```
Regex: /\d+(\.\d+)?/
```

Extracts the first numeric sequence as the transaction amount. Defaults to `0` if none is found.

### Tier 2 — Income Detection

Checks normalized input against: `salary`, `bonus`, `income`, `paycheck`, `dividend`, `interest`, `stipend`, `freelance`. Match sets `type = "income"`; otherwise defaults to `"expense"`.

### Tier 3 — Direct Category Name Match

Case-insensitive substring scan against all category names (built-in and user-created). "zomato food order" matches a category named "Food".

### Tier 4 — Keyword Dictionary

20 categories mapped to 200+ keywords:

| Category | Sample Keywords |
|---|---|
| Food | pizza, burger, zomato, swiggy, kfc, mcdonalds, chai, bakery |
| Dining | coffee, starbucks, restaurant, dinner, lunch, cafe |
| Groceries | milk, egg, bigbasket, blinkit, zepto, instamart |
| Transport | uber, ola, auto, metro, rapido, petrol, fastag |
| Travel | flight, hotel, indigo, makemytrip, redbus, booking |
| Shopping | myntra, amazon, flipkart, zara, nykaa, ajio |
| Electronics | laptop, mobile, iphone, samsung, croma, headphone |
| Home | furniture, ikea, pepperfry, maid, cook, maintenance |
| Rent | rent, flat, apartment, deposit |
| Bills | netflix, spotify, hotstar, prime, airtel, jio, recharge |
| Utilities | electricity, water, wifi, gas, emi, loan |
| Education | college, tuition, udemy, coursera, books |
| Health | doctor, medicine, hospital, pharmacy, lab, dental |
| Fitness | gym, cult, yoga, protein, creatine, sports |
| Grooming | salon, haircut, massage, cosmetics, perfume |
| Entertainment | movie, cinema, game, ps5, concert, club, party |
| Investments | stocks, crypto, sip, mutual, groww, zerodha |
| Gifts | gift, donation, charity, birthday, wedding |
| Salary | salary, income, paycheck, bonus, dividend, stipend |
| Misc | misc, other, cash, general |

### Tier 5 — Adaptive Learning

Scans the user's past 100 transactions. Each word in the input is matched (word-boundary regex) against historical transaction titles and notes. If a match is found, the category from that past transaction is applied. Parser accuracy improves with use — no ML infrastructure required.

---

## SMS Parsing

Android only. Requires `READ_SMS` permission.

### Behaviour

- **On launch:** reads the last 200 SMS messages.
- **Polling:** runs every 60 seconds and on every foreground resume.
- **New-user deep scan:** on a fresh empty database, paginates through up to 1 year of SMS history (100 messages per page) to bootstrap the transaction history.
- **Deduplication:** processed message IDs are persisted in `expo-secure-store`; no message is imported twice.

### `isLikelyBankSms()` Filter

A message passes the filter if it matches patterns such as:

- Sender looks like a bank short code (`HDFCBK`, `ICICIB`, `SBIUPI`)
- Body contains `Rs.`, `INR`, `debited`, `credited`, `UPI`, `NEFT`, `IMPS`
- Body contains an amount pattern `\d+(\.\d{1,2})?`

Messages that do not pass are discarded immediately.

### Extraction

From a passing message the extractor pulls:

| Field | Source |
|---|---|
| `amount` | Numeric value preceded by `Rs.`, `INR`, or a currency pattern |
| `merchant` | Text following "at", "to", "from", or "with" keywords |
| `timestamp` | SMS `date` field from the Android content provider (Unix ms) |

The extracted text is then fed through all five parser tiers to resolve `categoryId` and `type`, then written via `bulkCreateTransactions()`.

---

## Routes and Screens

Built with Expo Router v6 file-based routing under `app/`.

| File | Description |
|---|---|
| `app/_layout.tsx` | Root Stack. Initializes SQLite, calls `initializeStore()`, starts SMS listener on Android. |
| `app/index.tsx` | Redirects to the dashboard. |
| `app/transaction.tsx` | Add / edit transaction modal. Accepts optional `id` param for edit mode. |
| `app/transactions.tsx` | Full paginated transaction list (30 records/page). Filterable by date, category, type, and status. |
| `app/pending.tsx` | Pending payments screen. Shows `pending-receive` and `pending-pay` transactions. Individual and bulk settlement. |
| `app/recurring/index.tsx` | Recurring transaction management — create, edit, pause, resume, delete. |
| `app/category/[id].tsx` | Category detail — all transactions for the selected category, paginated. |

---

## Features

### Dashboard

Data is pre-aggregated in the Zustand store and updated after every mutation — no loading states.

- **Balance card:** total income, total expense, and today's net for the current period.
- **Pending summary:** amount pending to receive, amount pending to pay, total pending count.
- **Category breakdown:** each category shows total amount, transaction count, and most recent date. Sorted by `totalAmount` descending. Computed via SQL `GROUP BY + SUM` — no JS-side aggregation.

### Pending Payments

| Status | Meaning |
|---|---|
| `pending-receive` | You lent money — you expect it back. |
| `pending-pay` | You owe money — you need to pay. |

Both statuses are grouped by `withPerson` on the pending screen. `settleTransaction()` sets `status = "final"` and records `settledAt`. `settleAllPending()` processes every pending record atomically.

### Recurring Transactions

`automateRecurringFlow()` runs on every launch, checks `lastGeneratedDate` against today for each active definition, and bulk-inserts any due instances into the `transactions` table. Set `isActive = 0` to pause a rule without deleting it.

### Categories

19 default categories (Food, Dining, Groceries, Transport, Travel, Shopping, Electronics, Home, Rent, Bills, Utilities, Education, Health, Fitness, Grooming, Entertainment, Investments, Gifts, Misc) seeded on first launch. Custom categories can be created with any emoji as the icon. Deleting a category does not affect historical transactions — `categoryName` is preserved on each row.

### Backup

`triggerBackup()` writes the SQLite database to a user-chosen public folder URI (stored in `expo-secure-store`). `triggerMerge()` reads a backup file and merges it into the active database using SQLite `ATTACH` + `INSERT OR IGNORE` semantics — no duplicates are created.

---

## Performance

| Technique | Detail |
|---|---|
| FlatList tuning | `initialNumToRender=10`, `maxToRenderPerBatch=5`, `windowSize=5`, `removeClippedSubviews` (Android only) |
| Pagination | `queryTransactions()` caps at 30 records per call; `{ hasMore, nextPage }` drives infinite scroll |
| SQL-side aggregation | `categoryMetrics` and `financialSummary` computed entirely in SQLite; JS receives final numbers only |
| Denormalized `categoryName` | Written at insert/update time; eliminates JOIN on every list render |
| Pre-calculated offsets | Section positions computed once on load → O(1) `getItemLayout` on FlatList |

---

## Theme

All tokens are defined in `theme/colors.ts`.

| Token | Value | Usage |
|---|---|---|
| `background` | `#010101` | Root screen background |
| `text` | `#FFFFFF` | Primary text |
| `card` | `#121212` | Card and surface backgrounds |
| `border` | `#262626` | Dividers, input borders |
| `muted` | `#737373` | Secondary text |
| `success` | `#22c55e` | Income amounts, settled status |
| `danger` | `#ef4444` | Expense amounts, pending-pay status |

---

## Setup

### Prerequisites

- Node.js 18+
- pnpm
- Expo CLI (`npm install -g expo-cli`)
- Android: Android Studio with an emulator or a physical device with USB debugging enabled

### Install

```bash
pnpm install
```

### Start Development Server

```bash
pnpm expo start
```

### Run on Android

```bash
pnpm expo run:android
```

### Run on iOS

```bash
pnpm expo run:ios
```

### Android SMS Permissions

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.READ_SMS" />
<uses-permission android:name="android.permission.RECEIVE_SMS" />
```

Permissions are requested at runtime on first launch. All other features work normally if denied.

### Notes

- No `.env` file is required.
- The SQLite database is created automatically by `expo-sqlite` on first launch.
- Backup folder URI is persisted in `expo-secure-store` under a stable key.

---

## Project Structure

```
xpens/
├── app/
│   ├── _layout.tsx              # Root Stack, DB init, SMS listener
│   ├── index.tsx                # Redirect to dashboard
│   ├── transaction.tsx          # Add/edit transaction modal
│   ├── transactions.tsx         # All transactions (paginated)
│   ├── pending.tsx              # Pending payments
│   ├── recurring/
│   │   └── index.tsx
│   └── category/
│       └── [id].tsx
├── src/
│   ├── components/              # TransactionRow, SwipeableRow
│   ├── features/                # dashboard, transactions, pending, categories
│   ├── services/
│   │   └── DatabaseService.ts
│   ├── store/
│   │   └── useStore.ts
│   ├── theme/
│   │   └── colors.ts
│   └── utils/
│       ├── smartInput.ts
│       └── id.ts
└── package.json
```

---

## Architecture

```
React Native App (Expo Router)
    │
    ├──▶ Screens (app/ directory, file-based routing)
    │        _layout.tsx    → init DB + SMS listener
    │        transaction    → add/edit modal
    │        transactions   → paginated list
    │        pending        → lend/borrow
    │        recurring      → auto-transactions
    │        category/[id]  → category detail
    │
    ├──▶ Zustand Store (useStore.ts)
    │        global state: categories, transactions summary,
    │        categoryMetrics, financialSummary, recurringTransactions
    │
    ├──▶ DatabaseService.ts
    │        SQLite (expo-sqlite)
    │        3 tables: categories, transactions, recurring_transactions
    │
    ├──▶ src/utils/smartInput.ts
    │        5-tier NLP parser
    │
    └──▶ SmsListener.ts (Android only)
             reads SMS → parses bank transactions → bulkCreateTransactions
```

---

## User Flow

1. **App Launch** → _layout.tsx → DatabaseService.initialize() (creates tables if not exist) → SmsListener.start() (Android: reads last 200 SMS) → Zustand initializeStore() → loads categories + metrics

2. **Add Transaction (manual)** → tap "+" → transaction modal → type "200 pizza with john" → smartInput parser: amount=200, note="pizza with john", category=Food (keyword match) → confirm → createTransaction() → SQLite INSERT → syncFinancialMetrics() → dashboard updates

3. **Browse All Transactions** → /transactions → queryTransactions({page:0, limit:30}) → SQLite SELECT with filters → FlatList with 30 items/page → scroll to load more (pagination)

4. **Filter Transactions** → select category/date range/status filter → queryTransactions({categoryId, dateFrom, dateTo, status}) → SQL WHERE clause → filtered results

5. **Pending Payment** → add transaction with status "pending-receive" or "pending-pay" → appears in /pending screen → tap Settle → settleTransaction(id) → status updated to "final" + settledAt timestamp

6. **Recurring Transaction** → /recurring → createRecurringTransaction({amount, interval:"monthly", ...}) → automateRecurringFlow() runs on app launch → if lastGeneratedDate < now: INSERT new transaction → updates lastGeneratedDate

7. **SMS Auto-import (Android)** → SmsListener reads new bank SMS → isLikelyBankSms() → extracts amount/merchant → bulkCreateTransactions() → transactions appear automatically

---

## Data Flow

```
User types "200 pizza" in transaction modal
    │
    ▼ smartInput.ts parseInput("200 pizza")
Tier 1: regex /\d+(\.\d+)?/ → amount = 200
Tier 2: no income keywords → type = "expense"
Tier 3: no direct category name match
Tier 4: keywordMap["pizza"] = "Food" → categoryId = "cat_food"
Tier 5: check past transactions (if Tier 4 failed)
    │
    ▼ Transaction modal pre-fills: amount=200, category=Food
User confirms
    │
    ▼ createTransaction(tx)
DatabaseService: INSERT INTO transactions(id, amount, type, categoryId, categoryName, ...)
    │
    ▼ syncFinancialMetrics()
SELECT SUM(amount) WHERE type='income'... → financialSummary updated
SELECT SUM(amount), COUNT(*) GROUP BY categoryId → categoryMetrics updated
    │
    ▼ Zustand state updated → Dashboard re-renders
```
