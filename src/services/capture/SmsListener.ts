/**
 * SmsListener — Android-only.
 * On first run: reads SMS inbox (last 200 messages) for missed transactions.
 * Ongoing: listens for new SMS via react-native-get-sms-android.
 * scanHistory(): deep paginated scan for new-user onboarding import.
 *
 * iOS does NOT allow SMS access — this module is a no-op on iOS.
 */

import { AppState, PermissionsAndroid, Platform } from "react-native";
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
  messages: { _id: string; address?: string; body?: string; date: string }[],
  callbacks: CaptureCallback[],
  skipSet: Set<string>,
): number {
  let found = 0;
  if (!messages || !Array.isArray(messages)) return 0;

  for (const msg of messages) {
    if (!msg._id || skipSet.has(msg._id)) continue;
    skipSet.add(msg._id);

    const sender = msg.address || "";
    const body = msg.body || "";

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
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null =
  null;
let pollInterval: any = null;
let isRunning = false;

export const SmsListener = {
  /**
   * Read the last N messages from the SMS inbox (live capture use).
   * Silently no-ops if READ_SMS permission isn't granted.
   */
  async readInbox(maxCount = 20) {
    const SmsAndroid = getSmsAndroid();
    if (!SmsAndroid) return;

    const hasPerm = await hasReadSmsPermission();
    if (!hasPerm) {
      // console.log("[SmsListener] No READ_SMS permission, skipping inbox check");
      return;
    }

    // console.log("[SmsListener] Checking inbox for new messages...");
    SmsAndroid.list(
      JSON.stringify({ box: "inbox", maxCount }),
      (fail: string) => {}, //console.warn("[SmsListener] Failed to read SMS:", fail),
      (_count: number, smsList: string) => {
        try {
          const messages =
            typeof smsList === "string" ? JSON.parse(smsList) : smsList;
          const found = parseMessages(messages, callbacks, processedIds);
          if (found > 0) {
            // console.log(
            //   `[SmsListener] Found ${found} new bank transactions in inbox`,
            // );
          }
        } catch (e) {
          // console.warn("[SmsListener] Parse error:", e);
        }
      },
    );
  },

  /**
   * Deep paginated scan for history import (new-user onboarding).
   * Reads SMS in pages newest → oldest using indexFrom.
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
      pageSize = 100, // Smaller pages for better progress feedback
      onCapture,
      onProgress,
      onDone,
    } = opts;

    let totalScanned = 0;
    let totalFound = 0;
    const scanSeen = new Set<string>(importedIds);
    const sms = SmsAndroid;

    function scanPage(indexFrom: number) {
      const filter = {
        box: "inbox",
        indexFrom,
        maxCount: pageSize,
      };

      sms.list(
        JSON.stringify(filter),
        (fail: string) => {
          // console.warn("[SmsListener] scanHistory page error:", fail);
          onDone?.({ scanned: totalScanned, found: totalFound, done: true });
        },
        (_count: number, smsList: string) => {
          try {
            const messages: any[] =
              typeof smsList === "string" ? JSON.parse(smsList) : smsList;

            if (
              !messages ||
              !Array.isArray(messages) ||
              messages.length === 0
            ) {
              // End of inbox
              scanSeen.forEach((id) => importedIds.add(id));
              onDone?.({
                scanned: totalScanned,
                found: totalFound,
                done: true,
              });
              return;
            }

            totalScanned += messages.length;

            // Filter by date manually since native lib might ignore it
            const relevantMessages = messages.filter((m) => {
              const d = parseInt(m.date, 10);
              return !isNaN(d) && d >= fromDate;
            });

            const found = parseMessages(
              relevantMessages,
              [onCapture],
              scanSeen,
            );
            totalFound += found;

            onProgress?.({
              scanned: totalScanned,
              found: totalFound,
              done: false,
            });

            // Check if we should continue:
            // 1. We got a full page (meaning there's likely more)
            // 2. The OLDEST message in this page is still newer than our cutoff
            const oldestInPage = Math.min(
              ...messages
                .map((m) => parseInt(m.date, 10))
                .filter((d) => !isNaN(d)),
            );

            if (messages.length === pageSize && oldestInPage >= fromDate) {
              // Throttle slightly to keep JS thread alive for UI updates
              setTimeout(() => scanPage(indexFrom + pageSize), 10);
            } else {
              // Done
              scanSeen.forEach((id) => importedIds.add(id));
              onDone?.({
                scanned: totalScanned,
                found: totalFound,
                done: true,
              });
            }
          } catch (e) {
            // console.warn("[SmsListener] scanHistory parse error:", e);
            onDone?.({ scanned: totalScanned, found: totalFound, done: true });
          }
        },
      );
    }

    scanPage(0);
  },

  start(onCapture: CaptureCallback) {
    if (callbacks.includes(onCapture)) return;
    callbacks.push(onCapture);

    if (isRunning) return;
    isRunning = true;

    // 1. Check immediately on start
    SmsListener.readInbox().catch(() => {});

    // 2. Listen for app coming to foreground
    appStateSubscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        SmsListener.readInbox(30).catch(() => {});
      }
    });

    // 3. Periodic poll every 60 seconds as a fallback for "real-time" feel
    pollInterval = setInterval(() => {
      SmsListener.readInbox(10).catch(() => {});
    }, 60000);

    // console.log("[SmsListener] Started automatic SMS monitoring");
  },

  stop(onCapture?: CaptureCallback) {
    if (onCapture) {
      callbacks = callbacks.filter((cb) => cb !== onCapture);
    } else {
      callbacks = [];
    }

    if (callbacks.length === 0 && isRunning) {
      appStateSubscription?.remove();
      appStateSubscription = null;
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
      isRunning = false;
      // console.log("[SmsListener] Stopped SMS monitoring");
    }
  },

  isAvailable(): boolean {
    return Platform.OS === "android" && getSmsAndroid() !== null;
  },
};
