import { useRouter } from "expo-router";
import {
  CheckCheck,
  ChevronDown,
  MessageSquare,
  Square,
  SquareCheck,
} from "lucide-react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { enrich, isDuplicate } from "../../../services/capture/Enricher";
import { RawCapture } from "../../../services/capture/MessageParser";
import {
  ScanProgress,
  SmsListener,
} from "../../../services/capture/SmsListener";
import { useStore } from "../../../store/useStore";
import { COLORS } from "../../../theme/colors";
import { CapturedTransaction } from "../../../types";
import { getIcon } from "../../categories/iconMap";

// ── Date range options ────────────────────────────────────────────────────────

const DATE_RANGES = [
  { label: "Last 30 days", days: 30 },
  { label: "Last 3 months", days: 90 },
  { label: "Last 6 months", days: 180 },
  { label: "Last 1 year", days: 365 },
  { label: "All time", days: 365 * 5 },
] as const;

type ScanPhase = "idle" | "scanning" | "done";
type PermissionStatus = "unknown" | "granted" | "denied";

async function requestSmsPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  try {
    const already = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_SMS,
    );
    if (already) return true;
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      {
        title: "SMS Permission",
        message:
          "Rxpense needs access to your SMS to import bank transactions automatically.",
        buttonPositive: "Allow",
        buttonNegative: "Deny",
      },
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SmsImportScreen() {
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const categories = useStore((s) => s.categories);
  const transactions = useStore((s) => s.transactions);
  const addTransactions = useStore((s) => s.addTransactions);

  const [permission, setPermission] = useState<PermissionStatus>("unknown");
  const [phase, setPhase] = useState<ScanPhase>("idle");
  const [progress, setProgress] = useState<ScanProgress>({
    scanned: 0,
    found: 0,
    done: false,
  });
  const [rangeIndex, setRangeIndex] = useState(1); // default: 3 months
  const [showRangePicker, setShowRangePicker] = useState(false);

  // All parsed transactions from the scan
  const [captured, setCaptured] = useState<CapturedTransaction[]>([]);
  // IDs the user has selected (checked) for import — starts with all
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const capturedRef = useRef<CapturedTransaction[]>([]);

  // Check permission on mount
  useEffect(() => {
    if (Platform.OS !== "android") return;
    PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS).then(
      (granted) => setPermission(granted ? "granted" : "unknown"),
    );
  }, []);

  // ── Scan ───────────────────────────────────────────────────────────────────

  const startScan = useCallback(async () => {
    if (!SmsListener.isAvailable()) return;

    // Request permission if not already granted
    if (permission !== "granted") {
      const granted = await requestSmsPermission();
      setPermission(granted ? "granted" : "denied");
      if (!granted) return;
    }

    setCaptured([]);
    setSelected(new Set());
    capturedRef.current = [];
    setPhase("scanning");
    setProgress({ scanned: 0, found: 0, done: false });

    const fromDate =
      Date.now() - DATE_RANGES[rangeIndex].days * 24 * 60 * 60 * 1000;

    SmsListener.scanHistory({
      fromDate,
      pageSize: 500,

      onCapture(raw: RawCapture) {
        const enriched = enrich(raw, {
          categories,
          recentTransactions: transactions,
        });

        // Skip duplicates against already-accepted transactions
        if (isDuplicate(enriched, transactions, capturedRef.current)) return;

        capturedRef.current = [...capturedRef.current, enriched];
        setCaptured([...capturedRef.current]);
        setSelected((prev) => new Set([...prev, enriched.id]));
      },

      onProgress(p) {
        setProgress(p);
      },

      onDone(p) {
        setProgress({ ...p, done: true });
        setPhase("done");
      },
    });
  }, [permission, rangeIndex, categories, transactions]);

  // If SMS not available, show immediately
  const smsAvailable = SmsListener.isAvailable();

  // ── Selection helpers ──────────────────────────────────────────────────────

  const toggleItem = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(captured.map((c) => c.id)));
  }, [captured]);

  const deselectAll = useCallback(() => {
    setSelected(new Set());
  }, []);

  const allSelected = selected.size === captured.length && captured.length > 0;

  // ── Import ─────────────────────────────────────────────────────────────────

  const handleImport = useCallback(() => {
    const toImport = captured.filter((c) => selected.has(c.id));
    if (toImport.length === 0) return;

    addTransactions(
      toImport.map((item) => ({
        amount: item.amount,
        type: item.type,
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        title: null,
        note: item.note,
        location: null,
        withPerson: null,
        date: item.date,
        status: "final",
        settledAt: item.date,
      })),
    );

    router.back();
  }, [captured, selected, addTransactions, router]);

  // ── Render item ────────────────────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item }: { item: CapturedTransaction }) => {
      const isChecked = selected.has(item.id);
      const cat = categories.find((c) => c.id === item.categoryId);
      const IconComponent = getIcon(cat?.icon);
      const isIncome = item.type === "income";

      const date = new Date(item.date);
      const dateStr = date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      return (
        <TouchableOpacity
          style={[styles.row, isChecked && styles.rowChecked]}
          onPress={() => toggleItem(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.checkbox}>
            {isChecked ? (
              <SquareCheck size={20} color={COLORS.success} />
            ) : (
              <Square size={20} color={COLORS.muted} />
            )}
          </View>

          <View
            style={[
              styles.iconBox,
              { backgroundColor: isIncome ? COLORS.successBg : COLORS.active },
            ]}
          >
            <IconComponent
              size={18}
              color={isIncome ? COLORS.success : COLORS.text}
            />
          </View>

          <View style={styles.rowInfo}>
            <Text style={styles.rowCategory} numberOfLines={1}>
              {item.categoryName ?? "Uncategorized"}
            </Text>
            <Text style={styles.rowMeta} numberOfLines={1}>
              {item.note ? `${item.note}  ·  ` : ""}
              {dateStr}
            </Text>
          </View>

          <Text
            style={[
              styles.rowAmount,
              { color: isIncome ? COLORS.success : COLORS.text },
            ]}
          >
            {isIncome ? "+" : "-"}₹{item.amount.toLocaleString("en-IN")}
          </Text>
        </TouchableOpacity>
      );
    },
    [selected, categories, toggleItem],
  );

  const keyExtractor = useCallback((item: CapturedTransaction) => item.id, []);

  // ── Totals summary ─────────────────────────────────────────────────────────

  const summary = useMemo(() => {
    const items = captured.filter((c) => selected.has(c.id));
    const totalExpense = items
      .filter((i) => i.type === "expense")
      .reduce((s, i) => s + i.amount, 0);
    const totalIncome = items
      .filter((i) => i.type === "income")
      .reduce((s, i) => s + i.amount, 0);
    return { count: items.length, totalExpense, totalIncome };
  }, [captured, selected]);

  // ── UI ─────────────────────────────────────────────────────────────────────

  // ── UI ─────────────────────────────────────────────────────────────────────

  if (!smsAvailable) {
    return (
      <View style={styles.center}>
        <MessageSquare size={48} color={COLORS.border} />
        <Text style={styles.unavailableTitle}>Not available</Text>
        <Text style={styles.unavailableSub}>
          SMS scanning is unavailable. If you are on an Android emulator, please ensure you are using a Development Build instead of Expo Go.
        </Text>
      </View>
    );
  }

  if (permission === "denied") {
    return (
      <View style={styles.center}>
        <MessageSquare size={48} color={COLORS.border} />
        <Text style={styles.unavailableTitle}>Permission denied</Text>
        <Text style={styles.unavailableSub}>
          SMS permission was denied. Go to Android Settings → Apps → Rxpense →
          Permissions → SMS and enable it, then come back.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* ── Controls ── */}
      <View style={styles.controls}>
        {/* Date range picker */}
        <TouchableOpacity
          style={styles.rangePicker}
          onPress={() => setShowRangePicker((v) => !v)}
        >
          <Text style={styles.rangeLabel}>{DATE_RANGES[rangeIndex].label}</Text>
          <ChevronDown size={16} color={COLORS.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.scanBtn,
            phase === "scanning" && styles.scanBtnDisabled,
          ]}
          onPress={startScan}
          disabled={phase === "scanning"}
        >
          {phase === "scanning" ? (
            <ActivityIndicator size="small" color={COLORS.background} />
          ) : (
            <Text style={styles.scanBtnText}>
              {phase === "done" ? "Re-scan" : "Scan SMS"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Range dropdown */}
      {showRangePicker && (
        <View style={styles.dropdown}>
          {DATE_RANGES.map((r, i) => (
            <TouchableOpacity
              key={r.label}
              style={[
                styles.dropdownItem,
                i === rangeIndex && styles.dropdownItemActive,
              ]}
              onPress={() => {
                setRangeIndex(i);
                setShowRangePicker(false);
              }}
            >
              <Text
                style={[
                  styles.dropdownText,
                  i === rangeIndex && styles.dropdownTextActive,
                ]}
              >
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Progress bar ── */}
      {(phase === "scanning" || phase === "done") && (
        <View style={styles.progressBox}>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>
              {phase === "scanning" ? "Scanning…" : "Scan complete"}
            </Text>
            <Text style={styles.progressCount}>
              {progress.found} found / {progress.scanned} read
            </Text>
          </View>
          {phase === "scanning" && (
            <View style={styles.progressBar}>
              <View style={styles.progressFill} />
            </View>
          )}
        </View>
      )}

      {/* ── Idle state ── */}
      {phase === "idle" && (
        <View style={styles.center}>
          <MessageSquare size={48} color={COLORS.border} />
          <Text style={styles.idleTitle}>Import from SMS</Text>
          <Text style={styles.idleSub}>
            Choose a date range and tap Scan SMS to find all bank transactions
            in your inbox.
          </Text>
        </View>
      )}

      {/* ── Results ── */}
      {captured.length > 0 && (
        <>
          {/* Select all / deselect bar */}
          <View style={styles.selectionBar}>
            <Text style={styles.selectionCount}>
              {selected.size} of {captured.length} selected
            </Text>
            <TouchableOpacity onPress={allSelected ? deselectAll : selectAll}>
              <Text style={styles.selectionToggle}>
                {allSelected ? "Deselect all" : "Select all"}
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={captured}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: bottom + 120 }}
            showsVerticalScrollIndicator={false}
            initialNumToRender={20}
            maxToRenderPerBatch={20}
            windowSize={10}
          />

          {/* Summary + Import button */}
          <View style={[styles.footer, { bottom: bottom + 16 }]}>
            <View style={styles.footerSummary}>
              <Text style={styles.footerExpense}>
                -₹{summary.totalExpense.toLocaleString("en-IN")}
              </Text>
              <Text style={styles.footerIncome}>
                +₹{summary.totalIncome.toLocaleString("en-IN")}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.importBtn,
                summary.count === 0 && styles.importBtnDisabled,
              ]}
              onPress={handleImport}
              disabled={summary.count === 0}
              activeOpacity={0.8}
            >
              <CheckCheck size={18} color={COLORS.background} />
              <Text style={styles.importBtnText}>
                Import {summary.count} transaction
                {summary.count !== 1 ? "s" : ""}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Scanning but nothing found yet */}
      {phase === "scanning" && captured.length === 0 && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.text} />
          <Text style={styles.scanningText}>Reading messages…</Text>
        </View>
      )}

      {/* Done but nothing found */}
      {phase === "done" && captured.length === 0 && (
        <View style={styles.center}>
          <MessageSquare size={48} color={COLORS.border} />
          <Text style={styles.unavailableTitle}>Nothing found</Text>
          <Text style={styles.unavailableSub}>
            No bank transactions found in the selected period. Try a wider date
            range.
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  controls: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  rangePicker: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rangeLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "600",
  },
  scanBtn: {
    backgroundColor: COLORS.text,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minWidth: 90,
    alignItems: "center",
  },
  scanBtnDisabled: {
    backgroundColor: COLORS.active,
  },
  scanBtnText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: "700",
  },
  dropdown: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
    overflow: "hidden",
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  dropdownItemActive: {
    backgroundColor: COLORS.active,
  },
  dropdownText: {
    color: COLORS.gray,
    fontSize: 15,
    fontWeight: "500",
  },
  dropdownTextActive: {
    color: COLORS.text,
    fontWeight: "700",
  },
  progressBox: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 8,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
  },
  progressCount: {
    color: COLORS.muted,
    fontSize: 13,
  },
  progressBar: {
    height: 3,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 3,
    width: "40%",
    backgroundColor: COLORS.success,
    borderRadius: 2,
  },
  selectionBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    marginBottom: 4,
  },
  selectionCount: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  selectionToggle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  rowChecked: {
    // subtle highlight when selected
  },
  checkbox: {
    width: 24,
    alignItems: "center",
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  rowInfo: {
    flex: 1,
  },
  rowCategory: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  rowMeta: {
    color: COLORS.muted,
    fontSize: 12,
  },
  rowAmount: {
    fontSize: 15,
    fontWeight: "700",
  },
  footer: {
    position: "absolute",
    left: 20,
    right: 20,
    gap: 10,
  },
  footerSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  footerExpense: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
  },
  footerIncome: {
    color: COLORS.success,
    fontSize: 14,
    fontWeight: "700",
  },
  importBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: COLORS.text,
  },
  importBtnDisabled: {
    backgroundColor: COLORS.active,
  },
  importBtnText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: "700",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  idleTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 8,
  },
  idleSub: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
    lineHeight: 22,
  },
  unavailableTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 8,
  },
  unavailableSub: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
    lineHeight: 22,
  },
  scanningText: {
    color: COLORS.muted,
    fontSize: 15,
    marginTop: 16,
  },
});
