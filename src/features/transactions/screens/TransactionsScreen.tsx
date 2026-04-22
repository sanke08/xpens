import { format, isToday, isYesterday } from "date-fns";
import { useRouter } from "expo-router";
import { Search as SearchIcon } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
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

type FlatListItem =
  | { type: "header"; title: string; id: string }
  | { type: "transaction"; transaction: Transaction; id: string };

/**
 * TransactionsScreen - Provides a detailed, searchable list of all transactions.
 * Transactions are grouped by date and can be filtered by type (Income/Expense).
 */
export default function TransactionsScreen() {
  const router = useRouter();
  const { transactions, categories, deleteTransaction } = useStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">(
    "all",
  );

  const filteredData = useMemo(() => {
    let filtered = transactions;

    if (filterType !== "all") {
      filtered = filtered.filter((t) => t.type === filterType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.categoryName?.toLowerCase().includes(q) ||
          t.title?.toLowerCase().includes(q) ||
          t.note?.toLowerCase().includes(q) ||
          t.location?.toLowerCase().includes(q) ||
          t.withPerson?.toLowerCase().includes(q),
      );
    }

    // Grouping transactions by date
    const grouped: { [key: string]: Transaction[] } = {};
    filtered.forEach((t) => {
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

    return flatList;
  }, [transactions, searchQuery, filterType]);

  const getCategory = useCallback(
    (id?: string | null) => categories.find((c) => c.id === id),
    [categories],
  );

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
              category={getCategory(transaction.categoryId)}
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
    [deleteTransaction, getCategory, router],
  );

  const keyExtractor = useCallback((item: FlatListItem) => item.id, []);

  return (
    <>
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <SearchIcon size={20} color={COLORS.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search transactions..."
            placeholderTextColor={COLORS.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.filtersWrapper}>
        {(["all", "expense", "income"] as const).map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.filterChip,
              filterType === type && styles.filterChipActive,
            ]}
            onPress={() => setFilterType(type)}
          >
            <Text
              style={[
                styles.filterText,
                filterType === type && styles.filterTextActive,
              ]}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Animated.View style={{ flex: 1 }} layout={LinearTransition}>
        <FlatList
          data={filteredData}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No transactions found</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          initialNumToRender={20}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={Platform.OS === "android"}
        />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.active,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: COLORS.text,
  },
  filtersWrapper: {
    flexDirection: "row",
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.active,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.text,
    borderColor: COLORS.text,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.lightGray,
  },
  filterTextActive: {
    color: COLORS.background,
  },
  sectionHeader: {
    backgroundColor: COLORS.background,
    paddingVertical: 8,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.muted,
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
  },
});
