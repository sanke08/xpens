import {
  format,
  isToday,
  isYesterday,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { useRouter } from "expo-router";
import {
  Search as SearchIcon,
  SlidersHorizontal,
  X,
} from "lucide-react-native";
import React, { memo, useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { KeyboardAwareView } from "@/src/components/keyboard/KeyboardAwareView";
import { SwipeableRow } from "../../../components/SwipeableRow";
import { TransactionRow } from "../../../components/TransactionRow";
import { useStore } from "../../../store/useStore";
import { COLORS } from "../../../theme/colors";
import { Category, Transaction } from "../../../types";
import { FilterModal, FilterState } from "../components/FilterModal";

interface TransactionItemProps {
  transaction: Transaction;
  category: Category | undefined;
  onDelete: (id: string) => void;
  onPress: (id: string) => void;
}

const TransactionItem = memo(function TransactionItem({
  transaction,
  category,
  onDelete,
  onPress,
}: TransactionItemProps) {
  const handleDelete = useCallback(
    () => onDelete(transaction.id),
    [onDelete, transaction.id],
  );
  const handlePress = useCallback(
    () => onPress(transaction.id),
    [onPress, transaction.id],
  );
  return (
    <SwipeableRow onDelete={handleDelete}>
      <TransactionRow
        transaction={transaction}
        category={category}
        onPress={handlePress}
      />
    </SwipeableRow>
  );
});

type FlatListItem =
  | { type: "header"; title: string; id: string }
  | { type: "transaction"; transaction: Transaction; id: string };

const INITIAL_FILTERS: FilterState = {
  status: "all",
  categoryIds: [],
  dateRange: "all",
  sortBy: "date-desc",
};

export default function TransactionsScreen() {
  const router = useRouter();
  const transactions = useStore((state) => state.transactions);
  const categories = useStore((state) => state.categories);
  const deleteTransaction = useStore((state) => state.deleteTransaction);

  const [searchQuery, setSearchQuery] = useState("");
  const [deferredSearch, setDeferredSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const PAGE_SIZE = 50;

  // Debounce search query to reduce JS thread pressure
  React.useEffect(() => {
    const timer = setTimeout(() => setDeferredSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset pagination on filter or search change
  React.useEffect(() => {
    setPage(1);
  }, [deferredSearch, filters]);

  const { filteredData, offsets, hasMore, activeFilterCount } = useMemo(() => {
    const q = deferredSearch.toLowerCase().trim();
    const now = new Date();
    const today = startOfDay(now).getTime();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }).getTime();
    const monthStart = startOfMonth(now).getTime();

    // 1. Initial Filtering
    let results = transactions.filter((t) => {
      // Search Text
      if (q && !t.searchText?.includes(q)) return false;

      // Status Filter
      if (filters.status !== "all" && t.status !== filters.status) return false;

      // Category Filter
      if (
        filters.categoryIds.length > 0 &&
        (!t.categoryId || !filters.categoryIds.includes(t.categoryId))
      ) {
        return false;
      }

      // Date Range Filter
      if (filters.dateRange !== "all") {
        const tDate = startOfDay(t.date).getTime();
        if (filters.dateRange === "today" && tDate !== today) return false;
        if (filters.dateRange === "week" && tDate < weekStart) return false;
        if (filters.dateRange === "month" && tDate < monthStart) return false;
      }

      return true;
    });

    // 2. Sorting
    results.sort((a, b) => {
      switch (filters.sortBy) {
        case "date-asc":
          return a.date - b.date;
        case "amount-desc":
          return b.amount - a.amount;
        case "amount-asc":
          return a.amount - b.amount;
        case "date-desc":
        default:
          return b.date - a.date;
      }
    });

    // 3. Pagination & FlatList Preparation
    const flatList: FlatListItem[] = [];
    const itemOffsets: number[] = [];
    let currentOffset = 0;
    let lastDayKey = "";
    let transactionCount = 0;
    const limit = page * PAGE_SIZE;
    let hasMoreTransactions = false;

    const ROW_HEIGHT = 78;
    const HEADER_HEIGHT = 48;

    for (const t of results) {
      transactionCount++;
      if (transactionCount > limit) {
        hasMoreTransactions = true;
        break;
      }

      // Grouping by date (only if sorted by date)
      if (filters.sortBy.startsWith("date")) {
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
      }

      flatList.push({ type: "transaction", transaction: t, id: t.id });
      itemOffsets.push(currentOffset);
      currentOffset += ROW_HEIGHT;
    }

    // Count active filters (excluding default values)
    let count = 0;
    if (filters.status !== "all") count++;
    if (filters.categoryIds.length > 0) count++;
    if (filters.dateRange !== "all") count++;
    if (filters.sortBy !== "date-desc") count++;

    return {
      filteredData: flatList,
      offsets: itemOffsets,
      hasMore: hasMoreTransactions,
      activeFilterCount: count,
    };
  }, [transactions, deferredSearch, filters, page]);

  // Optimized O(1) category lookup map
  const categoryMap = useMemo(() => {
    const map = new Map<string, (typeof categories)[0]>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const handleDelete = useCallback(
    (id: string) => deleteTransaction(id),
    [deleteTransaction],
  );

  const handlePress = useCallback(
    (id: string) => router.push(`/transaction?id=${id}` as any),
    [router],
  );

  const getItemLayout = useCallback(
    (data: ArrayLike<FlatListItem> | null | undefined, index: number) => {
      const ROW_HEIGHT = 78;
      const HEADER_HEIGHT = 48;
      const isHeader = data?.[index]?.type === "header";

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
      const category = transaction.categoryId
        ? categoryMap.get(transaction.categoryId)
        : undefined;
      return (
        <TransactionItem
          transaction={transaction}
          category={category}
          onDelete={handleDelete}
          onPress={handlePress}
        />
      );
    },
    [categoryMap, handleDelete, handlePress],
  );

  const clearSearch = () => setSearchQuery("");

  return (
    <KeyboardAwareView style={{ flex: 1 }}>
      <View style={styles.header}>
        <View style={styles.searchBarContainer}>
          <View style={styles.searchBar}>
            <SearchIcon size={18} color={COLORS.muted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search descriptions, notes..."
              placeholderTextColor={COLORS.placeholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearBtn}>
                <X size={16} color={COLORS.muted} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.filterToggle,
              activeFilterCount > 0 && styles.filterToggleActive,
            ]}
            onPress={() => setIsFilterModalVisible(true)}
          >
            <SlidersHorizontal
              size={20}
              color={activeFilterCount > 0 ? COLORS.background : COLORS.text}
            />
            {activeFilterCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={10}
        removeClippedSubviews={Platform.OS === "android"}
        showsVerticalScrollIndicator={false}
        onEndReached={() => {
          if (hasMore && !isLoadingMore) {
            setIsLoadingMore(true);
            setTimeout(() => {
              setPage((p) => p + 1);
              setIsLoadingMore(false);
            }, 300);
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          <View style={styles.footerContainer}>
            {isLoadingMore ? (
              <ActivityIndicator size="small" color={COLORS.muted} />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No matching transactions</Text>
            {(searchQuery || activeFilterCount > 0) && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery("");
                  setFilters(INITIAL_FILTERS);
                }}
                style={styles.resetEmptyBtn}
              >
                <Text style={styles.resetEmptyText}>Clear all filters</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      <FilterModal
        visible={isFilterModalVisible}
        onClose={() => setIsFilterModalVisible(false)}
        onApply={setFilters}
        categories={categories}
        initialFilters={filters}
      />
    </KeyboardAwareView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: 16,
  },
  searchBarContainer: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: COLORS.text,
  },
  clearBtn: {
    padding: 4,
  },
  filterToggle: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterToggleActive: {
    backgroundColor: COLORS.text,
    borderColor: COLORS.text,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: COLORS.danger,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "800",
  },
  sectionHeader: {
    backgroundColor: COLORS.background,
    paddingVertical: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  listContent: {
    paddingBottom: 40,
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
    marginTop: 60,
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 16,
    fontWeight: "500",
  },
  resetEmptyBtn: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.card,
  },
  resetEmptyText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "600",
  },
  footerContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },
});
