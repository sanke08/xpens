/**
 * SmsListener — Android-only.
 * On first run: reads SMS inbox (last 200 messages) for missed transactions.
 * Ongoing: listens for new SMS via react-native-get-sms-android.
 * scanHistory(): deep paginated scan for new-user onboarding import.
 *
 * iOS does NOT allow SMS access — this module is a no-op on iOS.
 */

import { PermissionsAndroid, Platform } from "react-native";
import SmsAndroidLib from "react-native-get-sms-android";
import { isLikelyBankSms, parseMessage, RawCapture } from "./MessageParser";

async function hasReadSmsPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  try {
    return await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_SMS,
    );
  } catch {
    return false;
  }
}

type CaptureCallback = (raw: RawCapture) => void;

export interface ScanProgress {
  scanned: number; // total SMS read so far
  found: number; // bank transactions found so far
  done: boolean;
}

export interface ScanHistoryOptions {
  /** How far back to scan in milliseconds. Default: 1 year. */
  fromDate?: number;
  /** Max SMS to read per page. Default: 500. */
  pageSize?: number;
  /** Called for each parsed transaction found. */
  onCapture: (raw: RawCapture) => void;
  /** Called after each page is processed with running totals. */
  onProgress?: (progress: ScanProgress) => void;
  /** Called when the scan is fully complete. */
  onDone?: (total: ScanProgress) => void;
}

function getSmsAndroid() {
  if (Platform.OS !== "android") return null;
  return SmsAndroidLib ?? null;
}

// Track processed message IDs to avoid re-processing on subsequent reads
const processedIds = new Set<string>();

// IDs already imported during a history scan (separate set so we don't
// re-surface them in the live inbox after import)
const importedIds = new Set<string>();

function parseMessages(
  messages: { _id: string; address: string; body: string; date: string }[],
  callbacks: CaptureCallback[],
  skipSet: Set<string>,
): number {
  let found = 0;
  for (const msg of messages) {
    if (skipSet.has(msg._id)) continue;
    skipSet.add(msg._id);

    const sender = msg.address ?? "";
    const body = msg.body ?? "";

    if (!isLikelyBankSms(sender, body)) continue;

    const raw = parseMessage(body, "sms", sender);
    if (!raw) continue;

    const smsDate = parseInt(msg.date, 10);
    if (smsDate && !isNaN(smsDate)) raw.date = smsDate;

    callbacks.forEach((cb) => cb(raw));
    found++;
  }
  return found;
}

let callbacks: CaptureCallback[] = [];

export const SmsListener = {
  /**
   * Read the last N messages from the SMS inbox (live capture use).
   * Silently no-ops if READ_SMS permission isn't granted.
   */
  async readInbox(maxCount = 200) {
    const SmsAndroid = getSmsAndroid();
    if (!SmsAndroid) return;
    if (!(await hasReadSmsPermission())) return;

    SmsAndroid.list(
      JSON.stringify({ box: "inbox", maxCount }),
      (fail: string) => console.warn("[SmsListener] Failed to read SMS:", fail),
      (_count: number, smsList: string) => {
        try {
          parseMessages(JSON.parse(smsList), callbacks, processedIds);
        } catch (e) {
          console.warn("[SmsListener] Parse error:", e);
        }
      },
    );
  },

  /**
   * Deep paginated scan for history import (new-user onboarding).
   * Reads SMS in pages oldest→newest filtered by minDate.
   * Does NOT add to the live processedIds set so live capture still works.
   */
  async scanHistory(opts: ScanHistoryOptions) {
    const SmsAndroid = getSmsAndroid();
    if (!SmsAndroid) {
      opts.onDone?.({ scanned: 0, found: 0, done: true });
      return;
    }
    if (!(await hasReadSmsPermission())) {
      opts.onDone?.({ scanned: 0, found: 0, done: true });
      return;
    }

    const {
      fromDate = Date.now() - 365 * 24 * 60 * 60 * 1000,
      pageSize = 500,
      onCapture,
      onProgress,
      onDone,
    } = opts;

    let totalScanned = 0;
    let totalFound = 0;
    // Use a fresh set for import scan — doesn't pollute live processedIds
    const scanSeen = new Set<string>(importedIds);
    // Re-assign to a const so TypeScript keeps the non-null narrowing inside
    // the nested scanPage closure (the outer `if (!SmsAndroid)` guard is lost).
    const sms = SmsAndroid;

    function scanPage(minDate: number) {
      const filter = {
        box: "inbox",
        maxCount: pageSize,
        minDate,
      };

      sms.list(
        JSON.stringify(filter),
        (fail: string) => {
          console.warn("[SmsListener] scanHistory page error:", fail);
          onDone?.({ scanned: totalScanned, found: totalFound, done: true });
        },
        (_count: number, smsList: string) => {
          try {
            const messages: {
              _id: string;
              address: string;
              body: string;
              date: string;
            }[] = JSON.parse(smsList);

            totalScanned += messages.length;

            const found = parseMessages(messages, [onCapture], scanSeen);
            totalFound += found;

            onProgress?.({
              scanned: totalScanned,
              found: totalFound,
              done: false,
            });

            // If we got a full page there may be more — paginate by moving
            // minDate to just after the last message's timestamp
            if (messages.length === pageSize) {
              const dates = messages
                .map((m) => parseInt(m.date, 10))
                .filter((d) => !isNaN(d));
              if (dates.length > 0) {
                const nextMinDate = Math.max(...dates) + 1;
                if (nextMinDate > minDate) {
                  scanPage(nextMinDate);
                  return;
                }
              }
            }

            // Done
            // Mark all scanned IDs as imported so the live inbox won't re-surface them
            scanSeen.forEach((id) => importedIds.add(id));
            onDone?.({ scanned: totalScanned, found: totalFound, done: true });
          } catch (e) {
            console.warn("[SmsListener] scanHistory parse error:", e);
            onDone?.({ scanned: totalScanned, found: totalFound, done: true });
          }
        },
      );
    }

    scanPage(fromDate);
  },

  start(onCapture: CaptureCallback) {
    callbacks.push(onCapture);
    // Fire and forget — readInbox is async and self-guards on permission
    SmsListener.readInbox().catch(() => {});
  },

  stop(onCapture?: CaptureCallback) {
    if (onCapture) {
      callbacks = callbacks.filter((cb) => cb !== onCapture);
    } else {
      callbacks = [];
    }
  },

  isAvailable(): boolean {
    return Platform.OS === "android" && getSmsAndroid() !== null;
  },
};
