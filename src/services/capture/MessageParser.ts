/**
 * MessageParser — converts raw SMS / clipboard text into a structured RawCapture.
 * Covers 40+ Indian bank SMS formats, UPI alerts, and generic amount patterns.
 */

export interface RawCapture {
  amount: number;
  type: "debit" | "credit";
  merchant: string | null;
  bank: string | null;
  refNo: string | null;
  date: number;
  rawText: string;
  source: "sms" | "clipboard";
}

// ─── Bank sender ID → display name ──────────────────────────────────────────
const BANK_SENDERS: Record<string, string> = {
  HDFCBK: "HDFC Bank",
  ICICIB: "ICICI Bank",
  SBIINB: "SBI",
  SBIPSG: "SBI",
  AXISBK: "Axis Bank",
  KOTAKB: "Kotak Bank",
  INDUSB: "IndusInd Bank",
  YESBNK: "Yes Bank",
  BOIIND: "Bank of India",
  PNBSMS: "PNB",
  CANBNK: "Canara Bank",
  CENTBK: "Central Bank",
  SCBANK: "Standard Chartered",
  CITIBN: "Citi Bank",
  RBLBNK: "RBL Bank",
  IDBIBK: "IDBI Bank",
  FEDBAK: "Federal Bank",
  PAYTMB: "Paytm Bank",
  JUSPAY: "JusPay",
  SBIUPI: "SBI UPI",
  UPIBNK: "UPI",
  PHONEPE: "PhonePe",
  GPAYBN: "Google Pay",
  AMAZONP: "Amazon Pay",
};

// ─── Regex patterns ──────────────────────────────────────────────────────────

// Matches: Rs.500, Rs 500, INR 500, ₹500, Rs.1,23,456.78, Amt: 500, Amount 500
const AMOUNT_RE =
  /(?:Rs\.?\s*|INR\s*|₹\s*|Amt\s*[:\-]?\s*|Amount\s*[:\-]?\s*)([\d,]+(?:\.\d{1,2})?)/i;

// Debit keywords
const DEBIT_RE =
  /\b(?:debited?|paid|sent|transferred?\s+to|spent|purchase[d]?|payment\s+of|withdrawn?|debit|payment)\b/i;

// Credit keywords
const CREDIT_RE =
  /\b(?:credited?|received|added|deposited?|refund(?:ed)?|cashback|credit)\b/i;

// UPI reference numbers
const REF_RE =
  /(?:UPI\s*Ref(?:\.?\s*No\.?)?\s*[:\-]?\s*|Ref(?:\s*No\.?)?\s*[:\-]?\s*|txn\s*id\s*[:\-]?\s*|UTR\s*[:\-]?\s*)(\d{8,})/i;

// Merchant / payee patterns
const MERCHANT_PATTERNS: RegExp[] = [
  // "at MERCHANT" — most HDFC/ICICI patterns
  /\bat\s+([A-Z][A-Za-z0-9\s&\-\.]{2,40}?)(?:\s+on\b|\s+for\b|\.|\n|$)/i,
  // "to MERCHANT" — UPI, Paytm
  /\bto\s+([A-Za-z][A-Za-z0-9\s&\-\.@]{2,40}?)(?:\s+via\b|\s+on\b|\s+for\b|UPI|\.|\n|$)/i,
  // "Info: MERCHANT" — HDFC UPI pattern
  /Info\s*:\s*([A-Za-z0-9\s&\-\.\/]{2,40}?)(?:\.|$)/i,
  // "VPA: merchant@upi"
  /VPA\s*[:\-]\s*([a-z0-9._-]+@[a-z]+)/i,
  // "merchant@upi paid"
  /([a-z0-9._-]+@[a-z]+)/i,
];

// ─── Main parse function ─────────────────────────────────────────────────────

export function parseMessage(
  text: string,
  source: "sms" | "clipboard",
  sender?: string,
): RawCapture | null {
  const clean = text.trim();

  // Extract amount
  const amountMatch = clean.match(AMOUNT_RE);
  if (!amountMatch) return null;

  const amount = parseFloat(amountMatch[1].replace(/,/g, ""));
  if (!amount || amount <= 0) return null;

  // Determine debit vs credit
  const isDebit = DEBIT_RE.test(clean);
  const isCredit = CREDIT_RE.test(clean);

  // If neither signal found and source is clipboard, try a generic fallback
  if (!isDebit && !isCredit && source === "clipboard") {
    // For clipboard, default to debit (expense) if we at least have an amount
    // Only if the text looks like a payment notification
    if (!looksLikeTransaction(clean)) return null;
  } else if (!isDebit && !isCredit) {
    return null;
  }

  const type: "debit" | "credit" = isCredit && !isDebit ? "credit" : "debit";

  // Extract merchant
  let merchant: string | null = null;
  for (const re of MERCHANT_PATTERNS) {
    const m = clean.match(re);
    if (m?.[1]) {
      merchant = cleanMerchant(m[1]);
      if (merchant) break;
    }
  }

  // Extract ref number
  const refMatch = clean.match(REF_RE);
  const refNo = refMatch?.[1] ?? null;

  // Identify bank from sender
  let bank: string | null = null;
  if (sender) {
    const upperSender = sender.toUpperCase();
    for (const [key, name] of Object.entries(BANK_SENDERS)) {
      if (upperSender.includes(key)) {
        bank = name;
        break;
      }
    }
  }
  // Fallback: detect bank name in text
  if (!bank) {
    bank = detectBankFromText(clean);
  }

  return {
    amount,
    type,
    merchant,
    bank,
    refNo,
    date: Date.now(),
    rawText: clean,
    source,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cleanMerchant(raw: string): string | null {
  const cleaned = raw
    .replace(/\s+/g, " ")
    .replace(/[^\w\s@._\-&]/g, "")
    .trim();

  // Reject noise words that aren't merchants
  const noise = new Set([
    "your",
    "the",
    "this",
    "has",
    "been",
    "is",
    "was",
    "are",
    "account",
    "acct",
    "card",
    "bank",
    "upi",
    "ref",
    "no",
    "transaction",
    "txn",
    "payment",
    "transfer",
    "amount",
  ]);

  const lower = cleaned.toLowerCase();
  if (noise.has(lower) || cleaned.length < 2) return null;
  return cleaned;
}

function detectBankFromText(text: string): string | null {
  const bankPatterns: [RegExp, string][] = [
    [/HDFC/i, "HDFC Bank"],
    [/ICICI/i, "ICICI Bank"],
    [/\bSBI\b/i, "SBI"],
    [/Axis\s*Bank/i, "Axis Bank"],
    [/Kotak/i, "Kotak Bank"],
    [/IndusInd/i, "IndusInd Bank"],
    [/Yes\s*Bank/i, "Yes Bank"],
    [/Paytm/i, "Paytm Bank"],
    [/PhonePe/i, "PhonePe"],
    [/Google\s*Pay/i, "Google Pay"],
    [/Amazon\s*Pay/i, "Amazon Pay"],
    [/Federal\s*Bank/i, "Federal Bank"],
    [/Canara/i, "Canara Bank"],
    [/PNB/i, "PNB"],
  ];

  for (const [re, name] of bankPatterns) {
    if (re.test(text)) return name;
  }
  return null;
}

function looksLikeTransaction(text: string): boolean {
  // Must have at least one of these signals alongside an amount
  return /upi|neft|imps|rtgs|bank|payment|transfer|paid|received/i.test(text);
}

// ─── Quick check: should we even try parsing this SMS? ───────────────────────

export function isLikelyBankSms(sender: string, text: string): boolean {
  const upperSender = sender.toUpperCase();

  // Known bank sender ID prefixes
  const knownPrefixes = Object.keys(BANK_SENDERS);
  const senderMatch = knownPrefixes.some((p) => upperSender.includes(p));
  if (senderMatch) return true;

  // Emulator/Short-code fallback: 3-6 digit numbers are often banks or services
  const isShortCode = /^\+?\d{3,6}$/.test(sender);
  const hasAmount = AMOUNT_RE.test(text);

  if (isShortCode && hasAmount) return true;

  // Fallback: text contains bank-like signals
  return AMOUNT_RE.test(text) && (DEBIT_RE.test(text) || CREDIT_RE.test(text));
}
