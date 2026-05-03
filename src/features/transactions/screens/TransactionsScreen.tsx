import { format, isToday, isYesterday } from "date-fns";
import { useRouter } from "expo-router";
import { Search as SearchIcon } from "lucide-react-native";
import React, { memo, useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
  const handleDelete = useCallback(() => onDelete(transaction.id), [onDelete, transaction.id]);
  const handlePress = useCallback(() => onPress(transaction.id), [onPress, transaction.id]);
  return (
    <SwipeableRow onDelete={handleDelete}>
      <TransactionRow transaction={transaction} category={category} onPress={handlePress} />
    </SwipeableRow>
  );
});

type FlatListItem =
  | { type: "header"; title: string; id: string }
  | { type: "transaction"; transaction: Transaction; id: string };

export default function TransactionsScreen() {
  const router = useRouter();
  const transactions = useStore((state) => state.transactions);
  const categories = useStore((state) => state.categories);
  const deleteTransaction = useStore((state) => state.deleteTransaction);

  const [searchQuery, setSearchQuery] = useState("");
  const [deferredSearch, setDeferredSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">(
    "all",
  );
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
  }, [deferredSearch, filterType]);

  const { filteredData, offsets, hasMore } = useMemo(() => {
    const q = deferredSearch.toLowerCase().trim();
    const flatList: FlatListItem[] = [];
    const itemOffsets: number[] = [];
    let currentOffset = 0;
    let lastDayKey = "";
    let transactionCount = 0;
    const limit = page * PAGE_SIZE;
    let hasMoreTransactions = false;

    const ROW_HEIGHT = 78;
    const HEADER_HEIGHT = 48;

    for (const t of transactions) {
      if (filterType !== "all" && t.type !== filterType) continue;

      if (q) {
        if (!t.searchText?.includes(q)) continue;
      }

      transactionCount++;
      if (transactionCount > limit) {
        hasMoreTransactions = true;
        break;
      }

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

    return {
      filteredData: flatList,
      offsets: itemOffsets,
      hasMore: hasMoreTransactions,
    };
  }, [transactions, deferredSearch, filterType, page]);

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

  return (
    <KeyboardAwareView style={{ flex: 1 }}>
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

      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={20}
        removeClippedSubviews={false}
        showsVerticalScrollIndicator={false}
        decelerationRate={0.9}
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
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No transactions found</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </KeyboardAwareView>
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
  footerContainer: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
