import { useRouter } from "expo-router";
import { Clock, Plus } from "lucide-react-native";
import React, { useCallback } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SwipeableRow } from "../../../components/SwipeableRow";
import { XpensList } from "../../../components/XpensList";
import { useStore } from "../../../store/useStore";
import { COLORS } from "../../../theme/colors";
import { RecurringTransaction } from "../../../types";

export default function RecurringTransactionsScreen() {
  const router = useRouter();
  const { bottom, right } = useSafeAreaInsets();
  const recurringTransactions = useStore(
    (state) => state.recurringTransactions,
  );
  const deleteRecurringTransaction = useStore(
    (state) => state.deleteRecurringTransaction,
  );

  const renderItem = useCallback(
    ({ item }: { item: RecurringTransaction }) => {
      return (
        <SwipeableRow onDelete={() => deleteRecurringTransaction(item.id)}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.titleGroup}>
                <Text style={styles.cardTitle}>
                  {item.categoryName || "Uncategorized"}
                </Text>
                {item.title ? (
                  <Text style={styles.cardSubtitle}>{item.title}</Text>
                ) : null}
              </View>
              <Text
                style={[
                  styles.amount,
                  {
                    color:
                      item.type === "income" ? COLORS.success : COLORS.text,
                  },
                ]}
              >
                {item.type === "income" ? "+" : "-"}₹
                {item.amount.toLocaleString("en-IN")}
              </Text>
            </View>

            <View style={styles.details}>
              <View style={styles.badge}>
                <Clock size={12} color={COLORS.muted} />
                <Text style={styles.badgeText}>
                  {item.interval.charAt(0).toUpperCase() +
                    item.interval.slice(1)}
                </Text>
              </View>
              {!item.isActive && (
                <View
                  style={[styles.badge, { backgroundColor: COLORS.dangerBg }]}
                >
                  <Text style={[styles.badgeText, { color: COLORS.danger }]}>
                    Paused
                  </Text>
                </View>
              )}
            </View>
          </View>
        </SwipeableRow>
      );
    },
    [deleteRecurringTransaction],
  );

  return (
    <>
      <XpensList
        data={recurringTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Clock size={64} color={COLORS.active} strokeWidth={1} />
            <Text style={styles.emptyText}>No recurring transactions</Text>
            <Text style={styles.emptySub}>
              Automate your rent, bills, or subscriptions
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { right: right + 20, bottom: bottom + 20 }]}
        onPress={() => router.push("/transaction")}
      >
        <Plus size={28} color={COLORS.background} />
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingTop: 16,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    // marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  titleGroup: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  cardSubtitle: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 2,
  },
  amount: {
    fontSize: 16,
    fontWeight: "800",
  },
  details: {
    flexDirection: "row",
    marginTop: 12,
    gap: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.active,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.muted,
  },
  fab: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 16,
  },
  emptySub: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 8,
    textAlign: "center",
    maxWidth: "80%",
  },
});
