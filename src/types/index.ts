export type CaptureSource = "sms" | "clipboard";

export interface CapturedTransaction {
  id: string;
  amount: number;
  type: "income" | "expense";
  categoryId: string | null;
  categoryName: string | null;
  note: string | null;
  date: number;
  confidence: number;
  source: CaptureSource;
  rawText: string;
  capturedAt: number;
  bank: string | null;
  refNo: string | null;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  type: "expense" | "income";
  createdAt: number;
}

export type TransactionStatus = "final" | "pending-receive" | "pending-pay";

export interface Transaction {
  id: string;
  amount: number;
  type: "income" | "expense";
  categoryId: string | null;
  categoryName: string | null;
  title: string | null;
  note: string | null;
  location: string | null;
  withPerson: string | null;
  date: number;
  createdAt: number;
  updatedAt: number;
  status: TransactionStatus;
  settledAt: number | null;
  searchText?: string;
}

export type RecurrenceInterval = "daily" | "weekly" | "monthly";

export interface RecurringTransaction extends Omit<Transaction, "date"> {
  interval: RecurrenceInterval;
  startDate: number;
  lastGeneratedDate: number | null;
  isActive: boolean;
}
