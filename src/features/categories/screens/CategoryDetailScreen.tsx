import { format, isToday, isYesterday } from "date-fns";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React, { memo, useCallback, useMemo, useRef } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import Animated, { LinearTransition } from "react-native-reanimated";
import { SwipeableRow } from "../../../components/SwipeableRow";
import { TransactionRow } from "../../../components/TransactionRow";
import { useStore } from "../../../store/useStore";
import { COLORS } from "../../../theme/colors";
import { Category, Transaction } from "../../../types";
import { getIcon } from "../iconMap";

type FlatListItem =
  | { type: "header"; title: string; id: string }
  | {
      type: "transaction";
      transaction: Transaction;
      id: string;
      renderData: {
        primaryText: string;
        secondaryText: string;
        displayAmount: string;
        displayTime: string;
        isIncome: boolean;
        icon?: string;
        amountColor: string;
        iconBg: string;
        iconColor: string;
      };
    };

const ROW_HEIGHT = 78;
const HEADER_HEIGHT = 32;

interface TransactionItemProps {
  item: Extract<FlatListItem, { type: "transaction" }>;
  category: Category;
  onDelete: (id: string) => void;
  onPress: (id: string) => void;
}

const TransactionItem = memo(function TransactionItem({
  item,
  category,
  onDelete,
  onPress,
}: TransactionItemProps) {
  const handleDelete = useCallback(
    () => onDelete(item.id),
    [onDelete, item.id],
  );
  const handlePress = useCallback(() => onPress(item.id), [onPress, item.id]);

  return (
    <SwipeableRow onDelete={handleDelete}>
      <TransactionRow
        transaction={item.transaction}
        category={category}
        variant="category"
        onPress={handlePress}
        renderData={item.renderData}
      />
    </SwipeableRow>
  );
});

export default function CategoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const transactions = useStore((state) => state.transactions);
  const categories = useStore((state) => state.categories);
  const deleteTransaction = useStore((state) => state.deleteTransaction);

  const category = useMemo(
    () => categories.find((c) => c.id === id),
    [categories, id],
  );

  // Persistent Cache for UI-Ready Render Data and List Items
  const renderDataCache = useRef<Map<string, { updatedAt: number; data: any }>>(
    new Map(),
  );
  const listItemCache = useRef<Map<string, FlatListItem>>(new Map());
  const offsetsRef = useRef<number[]>([]);

  const { filteredData, totalAmount } = useMemo(() => {
    let total = 0;
    const flatList: FlatListItem[] = [];
    const itemOffsets: number[] = [];
    let currentOffset = 0;
    let lastDayKey = "";

    // True O(N) - single pass since transactions are already sorted by date DESC
    for (const t of transactions) {
      if (t.categoryId !== id) continue;

      total += t.amount;

      // 1. Handle Headers
      const tTime = t.date;
      const d = new Date(tTime);
      d.setHours(0, 0, 0, 0);
      const dayKey = d.getTime().toString();

      if (dayKey !== lastDayKey) {
        lastDayKey = dayKey;
        const headerId = `header-${dayKey}`;
        let headerItem = listItemCache.current.get(headerId);

        if (!headerItem) {
          const timestamp = Number(dayKey);
          let title = format(timestamp, "MMM dd, yyyy");
          if (isToday(timestamp)) title = "Today";
          else if (isYesterday(timestamp)) title = "Yesterday";
          headerItem = { type: "header", title, id: headerId };
          listItemCache.current.set(headerId, headerItem);
        }

        flatList.push(headerItem);
        itemOffsets.push(currentOffset);
        currentOffset += HEADER_HEIGHT;
      }

      // 2. Handle Transaction Render Data (Check Cache)
      const cachedRender = renderDataCache.current.get(t.id);
      let uiData;

      if (cachedRender && cachedRender.updatedAt === t.updatedAt) {
        uiData = cachedRender.data;
      } else {
        const isIncome = t.type === "income";

        // Logic for variant="category"
        const primaryText = t.title || t.note || "Transaction";
        let secondaryText = "";
        if (t.title && t.note) secondaryText = t.note;

        uiData = {
          primaryText,
          secondaryText,
          displayAmount: `${isIncome ? "+" : "-"}₹${t.amount.toLocaleString("en-IN")}`,
          displayTime: format(t.date, "HH:mm"),
          isIncome,
          icon: category?.icon,
          amountColor: isIncome ? COLORS.success : COLORS.text,
          iconBg: isIncome ? COLORS.successBg : COLORS.active,
          iconColor: isIncome ? COLORS.success : COLORS.text,
        };
        renderDataCache.current.set(t.id, {
          updatedAt: t.updatedAt,
          data: uiData,
        });
      }

      // 3. Ensure Stable List Item Reference
      let transactionItem = listItemCache.current.get(t.id);
      if (
        !transactionItem ||
        transactionItem.type !== "transaction" ||
        transactionItem.transaction.updatedAt !== t.updatedAt
      ) {
        transactionItem = {
          type: "transaction",
          transaction: t,
          id: t.id,
          renderData: uiData,
        };
        listItemCache.current.set(t.id, transactionItem);
      }

      flatList.push(transactionItem);
      itemOffsets.push(currentOffset);
      currentOffset += ROW_HEIGHT;
    }

    offsetsRef.current = itemOffsets;
    return { filteredData: flatList, totalAmount: total };
  }, [id, transactions, category]);

  // Completely stable layout calculation (Zero dependencies)
  const getItemLayout = useCallback((data: any, index: number) => {
    const isHeader = data?.[index]?.type === "header";
    return {
      length: isHeader ? HEADER_HEIGHT : ROW_HEIGHT,
      offset: offsetsRef.current[index] || 0,
      index,
    };
  }, []);

  const handleDelete = useCallback(
    (id: string) => deleteTransaction(id),
    [deleteTransaction],
  );

  const handlePress = useCallback(
    (id: string) => {
      router.push({
        pathname: "/transaction",
        params: { id },
      } as any);
    },
    [router],
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

      return (
        <TransactionItem
          item={item}
          category={category!}
          onDelete={handleDelete}
          onPress={handlePress}
        />
      );
    },
    [category, handleDelete, handlePress],
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
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          initialNumToRender={12}
          maxToRenderPerBatch={8}
          windowSize={7}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={false}
          showsVerticalScrollIndicator={false}
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
    height: HEADER_HEIGHT,
    justifyContent: "center",
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
