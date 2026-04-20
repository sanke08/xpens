import { useRouter } from "expo-router";
import { ChevronRight, Clock, Plus } from "lucide-react-native";
import React, { useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { BalanceCard } from "../../../components/BalanceCard";
import { CategorySummaryRow } from "../../../components/CategorySummaryRow";
import { useStore } from "../../../store/useStore";
import { COLORS } from "../../../theme/colors";
import { Category } from "../../../types";

/**
 * DashboardScreen - The main overview page.
 * Displays total balance, quick action to add transaction, and breakdown by categories.
 */
export default function DashboardScreen() {
  const router = useRouter();
  const { categories, transactions } = useStore();

  // Compute category-wise totals and metadata for the summary list
  const categorySummaries = useMemo(() => {
    const summary: Record<
      string,
      { category: Category; totalAmount: number; count: number; latest: number }
    > = {};

    categories.forEach((c) => {
      summary[c.id] = { category: c, totalAmount: 0, count: 0, latest: 0 };
    });

    transactions.forEach((tx) => {
      if (tx.categoryId && summary[tx.categoryId]) {
        summary[tx.categoryId].totalAmount += tx.amount;
        summary[tx.categoryId].count += 1;
        if (tx.date > summary[tx.categoryId].latest) {
          summary[tx.categoryId].latest = tx.date;
        }
      }
    });

    return Object.values(summary)
      .filter((s) => s.count > 0) // Only show categories with transactions
      .sort((a, b) => b.totalAmount - a.totalAmount); // Sort by highest amount
  }, [categories, transactions]);

  return (
    <>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Rxpense</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => router.push("/recurring" as any)}
            style={styles.headerIconBtn}
          >
            <Clock size={22} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/settings")}
            style={styles.headerIconBtn}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <BalanceCard transactions={transactions} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <TouchableOpacity
            onPress={() => router.push("/categories")}
            style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
          >
            <Text style={styles.viewAllBtn}>Manage</Text>
            <ChevronRight size={14} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.listContainer}>
          {categorySummaries.map((item) => (
            <CategorySummaryRow
              key={item.category.id}
              category={item.category}
              totalAmount={item.totalAmount}
              transactionCount={item.count}
              latestTransactionDate={item.latest > 0 ? item.latest : undefined}
              onPress={() =>
                router.push(`/category/${item.category.id}` as any)
              }
            />
          ))}
          {categorySummaries.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No recent transactions found</Text>
              <Text style={styles.emptySub}>Start logging to see insights</Text>
            </View>
          )}
        </View>
      </ScrollView>
      <TouchableOpacity
        style={styles.quickAddButton}
        activeOpacity={0.8}
        onPress={() => router.push("/transaction")}
      >
        <View style={styles.quickAddContent}>
          <Plus size={24} color={COLORS.background} />
          <Text style={styles.quickAddText}>Add Transaction</Text>
        </View>
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  settingsIcon: {
    fontSize: 20,
  },
  scrollContent: {
    paddingBottom: 40,
    gap: 16,
  },
  quickAddButton: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 16,
  },
  quickAddContent: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  quickAddText: {
    color: COLORS.background,
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
  },
  viewAllBtn: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.lightGray,
  },
  listContainer: {
    backgroundColor: COLORS.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  emptyState: {
    // padding: 32,
    alignItems: "center",
  },
  emptyText: {
    color: COLORS.gray,
    fontSize: 16,
    fontWeight: "600",
  },
  emptySub: {
    color: COLORS.muted,
    fontSize: 14,
  },
});
