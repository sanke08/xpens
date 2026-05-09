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
import React, { memo, useCallback, useMemo, useRef, useState } from "react";
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
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { KeyboardAwareView } from "@/src/components/keyboard/KeyboardAwareView";
import { scheduleOnRN } from "react-native-worklets";
import { SwipeableRow } from "../../../components/SwipeableRow";
import { TransactionRow } from "../../../components/TransactionRow";
import { useStore } from "../../../store/useStore";
import { COLORS } from "../../../theme/colors";
import { Category, Transaction } from "../../../types";
import { FilterModal, FilterState } from "../components/FilterModal";

// Fixed heights for getItemLayout
const ITEM_HEIGHT = 78; // 68 height + 10 margin
const HEADER_HEIGHT = 48;
interface TransactionItemProps {
  transaction: Transaction;
  category: Category | undefined;
  onDelete: (id: string) => void;
  onPress: (id: string) => void;
  renderData: FlatListItem extends { type: "transaction"; renderData: infer R }
    ? R
    : any;
}

const TransactionItem = memo(function TransactionItem({
  transaction,
  category,
  onDelete,
  onPress,
  renderData,
}: TransactionItemProps) {
  const height = useSharedValue(ITEM_HEIGHT);
  const opacity = useSharedValue(1);

  const handleDelete = useCallback(() => {
    height.value = withTiming(0, { duration: 300 });
    opacity.value = withTiming(0, { duration: 250 }, (finished) => {
      if (finished) {
        scheduleOnRN(onDelete, transaction.id);
      }
    });
  }, [onDelete, transaction.id, height, opacity]);

  const handlePress = useCallback(
    () => onPress(transaction.id),
    [onPress, transaction.id],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
    opacity: opacity.value,
    overflow: "hidden",
  }));

  return (
    <Animated.View style={animatedStyle}>
      <SwipeableRow onDelete={handleDelete}>
        <TransactionRow
          transaction={transaction}
          category={category}
          onPress={handlePress}
          renderData={renderData}
        />
      </SwipeableRow>
    </Animated.View>
  );
});

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

  // Optimized O(1) category lookup map
  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  // Stage 1: Filter and Sort
  // We avoid creating Date objects inside the filter loop for performance
  const sortedTransactions = useMemo(() => {
    const q = deferredSearch.toLowerCase().trim();
    const nowTimestamp = Date.now();
    const todayStart = startOfDay(nowTimestamp).getTime();
    const weekStart = startOfWeek(nowTimestamp, { weekStartsOn: 1 }).getTime();
    const monthStart = startOfMonth(nowTimestamp).getTime();

    let results = transactions.filter((t) => {
      // 1. Search (Most common filter first)
      if (q && !t.searchText?.includes(q)) return false;

      // 2. Status
      if (filters.status !== "all" && t.status !== filters.status) return false;

      // 3. Date Range (Compare timestamps directly, no new Date() objects)
      if (filters.dateRange !== "all") {
        const tTime = t.date;
        if (filters.dateRange === "today") {
          // Check if timestamp is within today's range
          if (tTime < todayStart || tTime >= todayStart + 86400000)
            return false;
        } else if (filters.dateRange === "week") {
          if (tTime < weekStart) return false;
        } else if (filters.dateRange === "month") {
          if (tTime < monthStart) return false;
        }
      }

      // 4. Category
      if (
        filters.categoryIds.length > 0 &&
        (!t.categoryId || !filters.categoryIds.includes(t.categoryId))
      ) {
        return false;
      }

      return true;
    });

    return results.sort((a, b) => {
      switch (filters.sortBy) {
        case "date-asc":
          return a.date - b.date;
        case "amount-desc":
          return b.amount - a.amount;
        case "amount-asc":
          return a.amount - b.amount;
        default:
          return b.date - a.date;
      }
    });
  }, [transactions, deferredSearch, filters]);

  // Persistent Cache for UI-Ready Render Data AND the FlatList Objects themselves
  // This ensures that object references stay stable, preventing FlatList re-renders
  const renderDataCache = useRef<Map<string, { updatedAt: number; data: any }>>(
    new Map(),
  );
  const listItemCache = useRef<Map<string, FlatListItem>>(new Map());

  // Stage 2: Paginate and Build List Items
  const { filteredData, hasMore, activeFilterCount, offsets } = useMemo(() => {
    const flatList: FlatListItem[] = [];
    const itemOffsets: number[] = [];
    let currentOffset = 0;
    let lastDayKey = "";
    const limit = page * PAGE_SIZE;
    const hasMoreItems = sortedTransactions.length > limit;
    const pagedResults = sortedTransactions.slice(0, limit);

    for (const t of pagedResults) {
      // 1. Handle Headers
      if (filters.sortBy.startsWith("date")) {
        // Use a simple timestamp math instead of new Date() where possible
        // but for format() we need a date, so we do it once per header
        const d = new Date(t.date);
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
      }

      // 2. Handle Transactions (Check Render Data Cache)
      const cachedRender = renderDataCache.current.get(t.id);
      let uiData;

      if (cachedRender && cachedRender.updatedAt === t.updatedAt) {
        uiData = cachedRender.data;
      } else {
        const category = t.categoryId
          ? categoryMap.get(t.categoryId)
          : undefined;
        const isIncome = t.type === "income";
        const primaryText = t.categoryName || "Uncategorized";
        let secondaryText = "";
        if (t.title && t.note) secondaryText = `${t.title} • ${t.note}`;
        else if (t.title) secondaryText = t.title;
        else if (t.note) secondaryText = `• ${t.note}`;

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
      currentOffset += ITEM_HEIGHT;
    }

    let count = 0;
    if (filters.status !== "all") count++;
    if (filters.categoryIds.length > 0) count++;
    if (filters.dateRange !== "all") count++;
    if (filters.sortBy !== "date-desc") count++;

    return {
      filteredData: flatList,
      hasMore: hasMoreItems,
      activeFilterCount: count,
      offsets: itemOffsets,
    };
  }, [
    page,
    sortedTransactions,
    filters.status,
    filters.categoryIds.length,
    filters.dateRange,
    filters.sortBy,
    categoryMap,
  ]);

  const handleDelete = useCallback(
    (id: string) => deleteTransaction(id),
    [deleteTransaction],
  );
  const handlePress = useCallback(
    (id: string) => router.push(`/transaction?id=${id}` as any),
    [router],
  );

  // Optimized O(1) layout calculation
  const getItemLayout = useCallback(
    (data: any, index: number) => {
      const height =
        data[index]?.type === "header" ? HEADER_HEIGHT : ITEM_HEIGHT;
      const offset = offsets[index] || 0;
      return { length: height, offset, index };
    },
    [offsets],
  );

  const renderItem = useCallback(
    ({ item }: { item: FlatListItem }) => {
      if (item.type === "header") {
        return (
          <View style={[styles.sectionHeader, { height: HEADER_HEIGHT }]}>
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
          transaction={item.transaction}
          category={category}
          onDelete={handleDelete}
          onPress={handlePress}
          renderData={item.renderData}
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
              size={24}
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
        windowSize={15}
        decelerationRate={0.93}
        removeClippedSubviews={Platform.OS === "android"}
        showsVerticalScrollIndicator={false}
        onEndReached={() => {
          if (hasMore && !isLoadingMore) {
            setIsLoadingMore(true);
            setPage((p) => p + 1);
            setTimeout(() => setIsLoadingMore(false), 100);
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
    width: 48,
    height: 48,
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
    justifyContent: "center",
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
