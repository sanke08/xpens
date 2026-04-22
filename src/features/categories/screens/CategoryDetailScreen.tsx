import { format, isToday, isYesterday } from "date-fns";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React, { useCallback, useMemo } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeOutLeft,
  FadeOutUp,
  LinearTransition,
} from "react-native-reanimated";

import { SwipeableRow } from "../../../components/SwipeableRow";
import { TransactionRow } from "../../../components/TransactionRow";
import { useStore } from "../../../store/useStore";
import { COLORS } from "../../../theme/colors";
import { Transaction } from "../../../types";
import { getIcon } from "../iconMap";

type FlatListItem =
  | { type: "header"; title: string; id: string }
  | { type: "transaction"; transaction: Transaction; id: string };

/**
 * CategoryDetailScreen - Specialized view for a specific category.
 * Shows total usage and a chronological list of transactions filtered by this category.
 */
export default function CategoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { transactions, categories, deleteTransaction } = useStore();

  const category = categories.find((c) => c.id === id);

  const { filteredData, totalAmount } = useMemo(() => {
    let total = 0;
    const catTxs = transactions.filter((t) => t.categoryId === id);

    // Grouping by date
    const grouped: { [key: string]: Transaction[] } = {};
    catTxs.forEach((t) => {
      total += t.amount;
      const d = new Date(t.date);
      d.setHours(0, 0, 0, 0);
      const key = d.getTime().toString();
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(t);
    });

    const flatList: FlatListItem[] = [];
    Object.keys(grouped)
      .sort((a, b) => Number(b) - Number(a))
      .forEach((key) => {
        const timestamp = Number(key);
        let title = format(timestamp, "MMM dd, yyyy");
        if (isToday(timestamp)) title = "Today";
        else if (isYesterday(timestamp)) title = "Yesterday";

        flatList.push({ type: "header", title, id: `header-${key}` });
        grouped[key].forEach((t) => {
          flatList.push({ type: "transaction", transaction: t, id: t.id });
        });
      });

    return { filteredData: flatList, totalAmount: total };
  }, [id, transactions]);

  const renderItem = useCallback(
    ({ item }: { item: FlatListItem }) => {
      if (item.type === "header") {
        return (
          <Animated.View
            key={item.id}
            style={styles.sectionHeader}
            layout={LinearTransition}
            exiting={FadeOutLeft}
          >
            <Text style={styles.sectionTitle}>{item.title}</Text>
          </Animated.View>
        );
      }

      const { transaction } = item;
      return (
        <Animated.View
          key={item.id}
          layout={LinearTransition}
          exiting={FadeOutUp}
        >
          <SwipeableRow onDelete={() => deleteTransaction(transaction.id)}>
            <TransactionRow
              transaction={transaction}
              category={category!}
              variant="category"
              onPress={() =>
                router.push({
                  pathname: "/transaction",
                  params: { id: transaction.id },
                } as any)
              }
            />
          </SwipeableRow>
        </Animated.View>
      );
    },
    [deleteTransaction, category, router],
  );

  if (!category) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Category not found</Text>
        </View>
      </View>
    );
  }

  const IconComponent = getIcon(category.icon);
  const isIncome = category.type === "income";

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: category.name,
        }}
      />
      <Animated.View style={{ flex: 1 }} layout={LinearTransition}>
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={() => (
            <View style={styles.summaryCard}>
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: isIncome ? COLORS.successBg : COLORS.active,
                  },
                ]}
              >
                <IconComponent
                  size={28}
                  color={isIncome ? COLORS.success : COLORS.text}
                />
              </View>
              <Text style={styles.summaryLabel}>
                Total {isIncome ? "Income" : "Spent"}
              </Text>
              <Text
                style={[
                  styles.summaryAmount,
                  { color: isIncome ? COLORS.success : COLORS.text },
                ]}
              >
                {isIncome ? "+" : ""}₹{totalAmount.toLocaleString("en-IN")}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No transactions in this category yet.
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
  },
  summaryCard: {
    alignItems: "center",
    paddingVertical: 20,
  },
  iconContainer: {
    padding: 16,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.muted,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -1,
  },
  sectionHeader: {
    backgroundColor: COLORS.background,
    paddingVertical: 8,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.muted,
    textTransform: "uppercase",
  },
  listContent: {
    paddingBottom: 40,
  },
  emptyState: {
    padding: 32,
    alignItems: "center",
    marginTop: 40,
  },
  emptyText: {
    color: COLORS.gray,
    fontSize: 16,
    fontWeight: "500",
  },
});
