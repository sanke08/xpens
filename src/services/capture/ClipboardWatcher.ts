/**
 * ClipboardWatcher — polls clipboard when the app is foregrounded.
 * Parses copied text through MessageParser and fires onCapture callbacks.
 * Deduplicates by hashing the last N clipboard values seen.
 */

import * as Clipboard from "expo-clipboard";
import { AppState, AppStateStatus } from "react-native";
import { isLikelyBankSms, parseMessage, RawCapture } from "./MessageParser";

type CaptureCallback = (raw: RawCapture) => void;

const SEEN_HISTORY_SIZE = 20;
const seenHashes = new Set<string>();
const seenQueue: string[] = [];

let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
let callbacks: CaptureCallback[] = [];
let isRunning = false;

function hashText(text: string): string {
  // Simple hash — good enough for dedup
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
  }
  return h.toString(36);
}

function markSeen(text: string) {
  const hash = hashText(text);
  if (seenQueue.length >= SEEN_HISTORY_SIZE) {
    const oldest = seenQueue.shift()!;
    seenHashes.delete(oldest);
  }
  seenHashes.add(hash);
  seenQueue.push(hash);
}

function isSeen(text: string): boolean {
  return seenHashes.has(hashText(text));
}

async function checkClipboard() {
  try {
    const text = await Clipboard.getStringAsync();
    if (!text || text.length < 10 || isSeen(text)) return;

    // Only process if it looks like a bank/payment message
    if (!isLikelyBankSms("", text)) return;

    markSeen(text);

    const raw = parseMessage(text, "clipboard");
    if (!raw) return;

    callbacks.forEach((cb) => cb(raw));
  } catch {
    // Clipboard access denied — silently ignore
  }
}

function handleAppStateChange(nextState: AppStateStatus) {
  if (nextState === "active") {
    checkClipboard();
  }
}

export const ClipboardWatcher = {
  start(onCapture: CaptureCallback) {
    callbacks.push(onCapture);
    if (isRunning) return;
    isRunning = true;
    appStateSubscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );
    // Also check immediately on start
    checkClipboard();
  },

  stop(onCapture?: CaptureCallback) {
    if (onCapture) {
      callbacks = callbacks.filter((cb) => cb !== onCapture);
    } else {
      callbacks = [];
    }
    if (callbacks.length === 0) {
      appStateSubscription?.remove();
      appStateSubscription = null;
      isRunning = false;
    }
  },
};
