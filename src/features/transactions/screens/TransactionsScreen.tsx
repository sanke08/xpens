import { format, isToday, isYesterday } from "date-fns";
import { useRouter } from "expo-router";
import {
  Search as SearchIcon,
  SlidersHorizontal,
  X,
} from "lucide-react-native";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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

const ITEM_HEIGHT = 78;
const HEADER_HEIGHT = 48;

const TransactionItem = memo(function TransactionItem({
  id,
  onDelete,
  onPress,
  renderData,
}: {
  id: string;
  onDelete: (id: string) => void;
  onPress: (id: string) => void;
  renderData: any;
}) {
  const height = useSharedValue(ITEM_HEIGHT);
  const opacity = useSharedValue(1);

  const handleDelete = useCallback(() => {
    height.value = withTiming(0, { duration: 300 });
    opacity.value = withTiming(0, { duration: 250 }, (finished) => {
      if (finished) scheduleOnRN(onDelete, id);
    });
  }, [onDelete, id, height, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
    opacity: opacity.value,
    overflow: "hidden",
  }));

  return (
    <Animated.View style={animatedStyle}>
      <SwipeableRow onDelete={handleDelete}>
        <TransactionRow
          onPress={() => onPress(id)}
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
      renderData: any;
    };

const INITIAL_FILTERS: FilterState = {
  status: "all",
  categoryIds: [],
  dateRange: "all",
  sortBy: "date-desc",
};

export default function TransactionsScreen() {
  const router = useRouter();
  const categories = useStore((state) => state.categories);
  const deleteTransaction = useStore((state) => state.deleteTransaction);
  const queryTransactions = useStore((state) => state.queryTransactions);
  const lastSyncTime = useStore((state) => state.financialSummary.today); // Trigger for data changes

  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

  const [displayedData, setDisplayedData] = useState<FlatListItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Optimized O(1) category map
  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  // Tracks the last date header shown to prevent duplicates during pagination
  const lastHeaderDateRef = useRef<string>("");

  // Main Data Loading Logic
  const loadTransactions = useCallback(
    async (pageNum: number, isMore: boolean) => {
      if (isMore) setIsLoadingMore(true);
      else {
        setIsLoading(true);
        lastHeaderDateRef.current = ""; // Reset headers for fresh loads
      }

      const result = await queryTransactions({
        page: pageNum,
        query: searchQuery,
        status: filters.status,
        categoryIds: filters.categoryIds,
        dateRange: filters.dateRange,
        sortBy: filters.sortBy,
      });

      // Map raw transactions to UI-ready FlatList items
      const newItems: FlatListItem[] = [];
      result.data.forEach((t) => {
        // Handle Date Headers (only if sorting by date)
        if (filters.sortBy.startsWith("date")) {
          const d = new Date(t.date);
          d.setHours(0, 0, 0, 0);
          const dayKey = d.getTime().toString();

          if (dayKey !== lastHeaderDateRef.current) {
            lastHeaderDateRef.current = dayKey;
            const timestamp = Number(dayKey);
            let title = format(timestamp, "MMM dd, yyyy");
            if (isToday(timestamp)) title = "Today";
            else if (isYesterday(timestamp)) title = "Yesterday";
            newItems.push({ type: "header", title, id: `header-${dayKey}` });
          }
        }

        const category = t.categoryId
          ? categoryMap.get(t.categoryId)
          : undefined;
        const isIncome = t.type === "income";

        // Pre-calculate all visual properties here (Zero calculation in renderItem)
        newItems.push({
          type: "transaction",
          transaction: t,
          id: t.id,
          renderData: {
            primaryText: t.categoryName || "Uncategorized",
            secondaryText: t.title || t.note || "",
            displayAmount: `${isIncome ? "+" : "-"}₹${t.amount.toLocaleString("en-IN")}`,
            displayTime: format(t.date, "HH:mm"),
            isIncome,
            icon: category?.icon,
            amountColor: isIncome ? COLORS.success : COLORS.text,
            iconBg: isIncome ? COLORS.successBg : COLORS.active,
            iconColor: isIncome ? COLORS.success : COLORS.text,
          },
        });
      });

      setDisplayedData((prev) => (isMore ? [...prev, ...newItems] : newItems));
      setHasMore(result.hasMore);
      setIsLoading(false);
      setIsLoadingMore(false);
    },
    [searchQuery, filters, queryTransactions, categoryMap],
  );

  // Initial load or Filter change
  useEffect(() => {
    setPage(1);
    loadTransactions(1, false);
  }, [searchQuery, filters, lastSyncTime, loadTransactions]);

  const handleEndReached = () => {
    if (hasMore && !isLoadingMore && !isLoading) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadTransactions(nextPage, true);
    }
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status !== "all") count++;
    if (filters.categoryIds.length > 0) count++;
    if (filters.dateRange !== "all") count++;
    if (filters.sortBy !== "date-desc") count++;
    return count;
  }, [filters]);

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
          id={item.id}
          onDelete={deleteTransaction}
          onPress={(id) => router.push(`/transaction?id=${id}` as any)}
          renderData={item.renderData}
        />
      );
    },
    [deleteTransaction, router],
  );

  return (
    <KeyboardAwareView style={{ flex: 1 }}>
      <View style={styles.header}>
        <View style={styles.searchBarContainer}>
          <View style={styles.searchBar}>
            <SearchIcon size={18} color={COLORS.muted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              placeholderTextColor={COLORS.placeholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                style={styles.clearBtn}
              >
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

      {isLoading && page === 1 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={displayedData}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoadingMore ? (
              <ActivityIndicator
                style={{ margin: 20 }}
                color={COLORS.primary}
              />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No transactions found</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}

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
  header: { paddingBottom: 16 },
  searchBarContainer: { flexDirection: "row", gap: 10, alignItems: "center" },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: COLORS.text },
  clearBtn: { padding: 4 },
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
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  badgeText: { color: COLORS.white, fontSize: 10, fontWeight: "800" },
  sectionHeader: {
    backgroundColor: COLORS.background,
    height: HEADER_HEIGHT,
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
  listContent: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyState: { padding: 40, alignItems: "center", marginTop: 60 },
  emptyText: { color: COLORS.muted, fontSize: 16, fontWeight: "500" },
});
