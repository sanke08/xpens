import { useRouter } from "expo-router";
import { CheckCheck, Clock } from "lucide-react-native";
import React, { useCallback, useMemo } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "../../../store/useStore";
import { COLORS } from "../../../theme/colors";
import { Transaction } from "../../../types";
import { PendingItemCard } from "../components/PendingItemCard";

export default function PendingScreen() {
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const categories = useStore((s) => s.categories);
  const financialSummary = useStore((s) => s.financialSummary);
  const settleTransaction = useStore((s) => s.settleTransaction);
  const settleAllPending = useStore((s) => s.settleAllPending);
  const fetchPendingTransactions = useStore((s) => s.fetchPendingTransactions);

  const [receivables, setReceivables] = React.useState<Transaction[]>([]);
  const [payables, setPayables] = React.useState<Transaction[]>([]);

  React.useEffect(() => {
    fetchPendingTransactions().then((res) => {
      setReceivables(res.receivables);
      setPayables(res.payables);
    });
  }, [financialSummary.pendingCount, fetchPendingTransactions]);

  const totalReceive = useMemo(
    () => receivables.reduce((s, t) => s + t.amount, 0),
    [receivables],
  );
  const totalPay = useMemo(
    () => payables.reduce((s, t) => s + t.amount, 0),
    [payables],
  );

  const handleEdit = useCallback(
    (id: string) => {
      router.push({ pathname: "/transaction", params: { id } } as any);
    },
    [router],
  );

  const handleMarkAllReceived = useCallback(() => {
    if (receivables.length === 0) return;
    Alert.alert(
      "Mark all received?",
      `This will settle ${receivables.length} item${
        receivables.length !== 1 ? "s" : ""
      } totaling ₹${totalReceive.toLocaleString(
        "en-IN",
      )} and create a single Reimbursement income entry.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark all received",
          onPress: settleAllPending,
        },
      ],
    );
  }, [receivables.length, totalReceive, settleAllPending]);

  const isEmpty = receivables.length === 0 && payables.length === 0;

  if (isEmpty) {
    return (
      <View style={styles.emptyWrap}>
        <Clock size={48} color={COLORS.border} />
        <Text style={styles.emptyTitle}>No pending items</Text>
        <Text style={styles.emptySub}>
          When you mark a transaction as Reimbursable or I owe, it will appear
          here.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: bottom + 40, paddingTop: 8 }}
      showsVerticalScrollIndicator={false}
    >
      {receivables.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>You&apos;ll get back</Text>
              <Text style={[styles.sectionTotal, { color: COLORS.success }]}>
                ₹{totalReceive.toLocaleString("en-IN")}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.markAllBtn}
              onPress={handleMarkAllReceived}
              activeOpacity={0.8}
            >
              <CheckCheck size={14} color={COLORS.success} />
              <Text style={styles.markAllText}>Mark all</Text>
            </TouchableOpacity>
          </View>

          {receivables.map((tx, i) => (
            <PendingItemCard
              key={tx.id}
              transaction={tx}
              category={categories.find((c) => c.id === tx.categoryId)}
              onSettle={settleTransaction}
              onPress={handleEdit}
              index={i}
            />
          ))}
        </View>
      )}

      {payables.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>You owe</Text>
              <Text style={[styles.sectionTotal, { color: COLORS.danger }]}>
                ₹{totalPay.toLocaleString("en-IN")}
              </Text>
            </View>
          </View>

          {payables.map((tx, i) => (
            <PendingItemCard
              key={tx.id}
              transaction={tx}
              category={categories.find((c) => c.id === tx.categoryId)}
              onSettle={settleTransaction}
              onPress={handleEdit}
              index={i}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.muted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  sectionTotal: {
    fontSize: 24,
    fontWeight: "800",
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.successBg,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.success,
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 8,
  },
  emptySub: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
    lineHeight: 22,
  },
});
