import { useRouter } from "expo-router";
import { ChevronRight, Plus, RefreshCcw, Settings } from "lucide-react-native";
import React, { useCallback, useMemo } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  const categories = useStore((state) => state.categories);
  const transactions = useStore((state) => state.transactions);
  const addTransactions = useStore((state) => state.addTransactions);
  const clearAllTransactions = useStore((state) => state.clearAllTransactions);

  const { bottom } = useSafeAreaInsets();
  const [animationKey, setAnimationKey] = React.useState(0);

  const handleReplayAnimation = useCallback(() => {
    setAnimationKey((prev) => prev + 1);
  }, []);

  const handleAddDummyData = useCallback(() => {
    const types: ("expense" | "income")[] = [
      "expense",
      "expense",
      "expense",
      "income",
    ];
    const notes = [
      "Lunch",
      "Groceries",
      "Uber",
      "Salary",
      "Coffee",
      "Netflix",
      "Internet",
      "Dinner",
    ];

    const dummyTxs: any[] = [];
    for (let i = 0; i < 30; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const filteredCats = categories.filter((c) => c.type === type);
      const category =
        filteredCats[Math.floor(Math.random() * filteredCats.length)] ||
        categories[0];

      dummyTxs.push({
        amount: Math.floor(Math.random() * 1000) + 10,
        type,
        categoryId: category.id,
        categoryName: category.name,
        title: null,
        note: notes[Math.floor(Math.random() * notes.length)],
        location: null,
        withPerson: null,
        date: Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000),
      });
    }
    addTransactions(dummyTxs);
  }, [categories, addTransactions]);

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
      .filter((s) => s.count > 0)
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [categories, transactions]);

  const renderItem = useCallback(
    ({
      item,
      index,
    }: {
      item: {
        category: Category;
        totalAmount: number;
        count: number;
        latest: number;
      };
      index: number;
    }) => (
      <CategorySummaryRow
        index={index}
        category={item.category}
        totalAmount={item.totalAmount}
        transactionCount={item.count}
        latestTransactionDate={item.latest > 0 ? item.latest : undefined}
        onPress={() => router.push(`/category/${item.category.id}` as any)}
      />
    ),
    [router],
  );

  const ListHeader = useMemo(
    () => (
      <>
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
      </>
    ),
    [transactions, router],
  );

  const ListFooter = useMemo(
    () => (
      <View style={styles.debugButtons}>
        <TouchableOpacity
          onPress={handleAddDummyData}
          style={[styles.debugBtn, { backgroundColor: COLORS.successBg }]}
        >
          <Text style={[styles.debugBtnText, { color: COLORS.success }]}>
            +30 Data
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleReplayAnimation}
          style={[styles.debugBtn, { backgroundColor: COLORS.active }]}
        >
          <Text style={[styles.debugBtnText, { color: COLORS.text }]}>
            Replay
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={clearAllTransactions}
          style={[styles.debugBtn, { backgroundColor: COLORS.dangerBg }]}
        >
          <Text style={[styles.debugBtnText, { color: COLORS.danger }]}>
            Clear All
          </Text>
        </TouchableOpacity>
      </View>
    ),
    [handleAddDummyData, clearAllTransactions, handleReplayAnimation],
  );

  return (
    <View style={{ flex: 1 }} key={animationKey}>
      {ListFooter}
      <FlatList
        key={`list-${animationKey}`}
        data={categorySummaries}
        keyExtractor={(item) => item.category.id}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No recent transactions found</Text>
            <Text style={styles.emptySub}>Start logging to see insights</Text>
          </View>
        }
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={Platform.OS === "android"}
      />

      <Animated.View
        key={`bar-${animationKey}`}
        entering={FadeInDown.delay(500).springify()}
        style={[styles.bottomBar, { bottom }]}
      >
        <TouchableOpacity
          onPress={() => router.push("/recurring" as any)}
          style={styles.iconActionBtn}
        >
          <RefreshCcw size={24} color={COLORS.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.mainAddBtn}
          activeOpacity={0.8}
          onPress={() => router.push("/transaction")}
        >
          <Plus size={20} color={COLORS.background} />
          <Text style={styles.mainAddText}>Add</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/settings")}
          style={styles.iconActionBtn}
        >
          <Settings size={24} color={COLORS.text} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingBottom: 120,
    gap: 16,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: "absolute",
    backgroundColor: COLORS.background,
  },
  iconActionBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.active,
    justifyContent: "center",
    alignItems: "center",
  },
  mainAddBtn: {
    flex: 1,
    height: 52,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  mainAddText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: "700",
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.muted,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  debugButtons: {
    flexDirection: "row",
    gap: 12,
  },
  debugBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  debugBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 20,
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
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
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
