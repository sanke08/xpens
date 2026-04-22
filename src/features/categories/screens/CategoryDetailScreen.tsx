import { format, isToday, isYesterday } from "date-fns";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React, { useCallback, useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import Animated, { LinearTransition } from "react-native-reanimated";
import { SwipeableRow } from "../../../components/SwipeableRow";
import { TransactionRow } from "../../../components/TransactionRow";
import { XpensList } from "../../../components/XpensList";
import { useStore } from "../../../store/useStore";
import { COLORS } from "../../../theme/colors";
import { Transaction } from "../../../types";
import { getIcon } from "../iconMap";

type FlatListItem =
  | { type: "header"; title: string; id: string }
  | { type: "transaction"; transaction: Transaction; id: string };

export default function CategoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const transactions = useStore((state) => state.transactions);
  const categories = useStore((state) => state.categories);
  const deleteTransaction = useStore((state) => state.deleteTransaction);

  const category = categories.find((c) => c.id === id);

  const { filteredData, totalAmount, offsets } = useMemo(() => {
    let total = 0;
    const flatList: FlatListItem[] = [];
    const itemOffsets: number[] = [];
    let currentOffset = 0;
    let lastDayKey = "";

    const ROW_HEIGHT = 72;
    const HEADER_HEIGHT = 40;

    // True O(N) - single pass since transactions are already sorted by date DESC
    for (const t of transactions) {
      if (t.categoryId !== id) continue;

      total += t.amount;

      // Day boundary check
      const d = new Date(t.date);
      d.setHours(0, 0, 0, 0);
      const dayKey = d.getTime().toString();

      if (dayKey !== lastDayKey) {
        lastDayKey = dayKey;
        const timestamp = Number(dayKey);
        let title = format(timestamp, "MMM dd, yyyy");
        if (isToday(timestamp)) title = "Today";
        else if (isYesterday(timestamp)) title = "Yesterday";

        flatList.push({ type: "header", title, id: `header-${dayKey}` });
        itemOffsets.push(currentOffset);
        currentOffset += HEADER_HEIGHT;
      }

      flatList.push({ type: "transaction", transaction: t, id: t.id });
      itemOffsets.push(currentOffset);
      currentOffset += ROW_HEIGHT;
    }

    return { filteredData: flatList, totalAmount: total, offsets: itemOffsets };
  }, [id, transactions]);

  const getItemLayout = useCallback(
    (data: any, index: number) => {
      const ROW_HEIGHT = 72;
      const HEADER_HEIGHT = 40;
      const isHeader = data[index]?.type === "header";

      return {
        length: isHeader ? HEADER_HEIGHT : ROW_HEIGHT,
        offset: offsets[index] || 0,
        index,
      };
    },
    [offsets],
  );

  const renderItem = useCallback(
    ({ item }: { item: FlatListItem }) => {
      if (item.type === "header") {
        return (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{item.title}</Text>
          </View>
        );
      }

      const { transaction } = item;
      return (
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
    <>
      <Stack.Screen
        options={{
          title: category.name,
        }}
      />
      <Animated.View layout={LinearTransition} style={{ flex: 1 }}>
        <XpensList
          data={filteredData}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          ListHeaderComponent={() => (
            <Animated.View layout={LinearTransition} style={styles.summaryCard}>
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: isIncome
                      ? COLORS.successBg
                      : COLORS.active,
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
            </Animated.View>
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
    // paddingVertical: 8,
    // marginTop: 8,
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
