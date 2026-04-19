import { COLORS } from "@/lib/colors";
import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import React, { useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BalanceCard } from "../components/BalanceCard";
import { CategorySummaryRow } from "../components/CategorySummaryRow";
import { Category, useStore } from "../lib/store";

export default function HomeScreen() {
  const router = useRouter();
  const { categories, transactions } = useStore();

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

    return Object.values(summary).sort((a, b) => b.totalAmount - a.totalAmount); // Sort by highest amount
  }, [categories, transactions]);

  return (
    <>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Rxpense</Text>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => router.push("/settings" as any)}
        >
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <BalanceCard transactions={transactions} />

        <TouchableOpacity
          style={styles.quickAddButton}
          activeOpacity={0.8}
          onPress={() => router.push("/transaction" as any)}
        >
          <View style={styles.quickAddContent}>
            <Plus size={24} color={COLORS.background} />
            <Text style={styles.quickAddText}>Add Transaction</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <TouchableOpacity onPress={() => router.push("/transactions" as any)}>
            <Text style={styles.viewAllBtn}>View All</Text>
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
              <Text style={styles.emptyText}>No categories found</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  settingsBtn: {
    padding: 8,
  },
  settingsIcon: {
    fontSize: 20,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  quickAddButton: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 4,
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
    marginHorizontal: 20,
    marginTop: 32,
    marginBottom: 16,
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
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    color: COLORS.gray,
    fontSize: 16,
  },
});
