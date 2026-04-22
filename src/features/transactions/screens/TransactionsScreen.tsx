import { format, isToday, isYesterday } from "date-fns";
import { useRouter } from "expo-router";
import { Search as SearchIcon } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { SwipeableRow } from "../../../components/SwipeableRow";
import { TransactionRow } from "../../../components/TransactionRow";
import { XpensList } from "../../../components/XpensList";
import { useStore } from "../../../store/useStore";
import { COLORS } from "../../../theme/colors";
import { Transaction } from "../../../types";

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

  // Debounce search query to reduce JS thread pressure
  React.useEffect(() => {
    const timer = setTimeout(() => setDeferredSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { filteredData, offsets } = useMemo(() => {
    const q = deferredSearch.toLowerCase().trim();
    const flatList: FlatListItem[] = [];
    const itemOffsets: number[] = [];
    let currentOffset = 0;
    let lastDayKey = "";

    const ROW_HEIGHT = 72;
    const HEADER_HEIGHT = 40;

    for (const t of transactions) {
      if (filterType !== "all" && t.type !== filterType) continue;

      if (q) {
        if (!t.searchText?.includes(q)) continue;
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

    return { filteredData: flatList, offsets: itemOffsets };
  }, [transactions, deferredSearch, filterType]);

  // Optimized O(1) category lookup map
  const categoryMap = useMemo(() => {
    const map = new Map<string, (typeof categories)[0]>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

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
          <View style={[styles.sectionHeader, { height: 40 }]}>
            <Text style={styles.sectionTitle}>{item.title}</Text>
          </View>
        );
      }

      const { transaction } = item;
      const category = transaction.categoryId
        ? categoryMap.get(transaction.categoryId)
        : undefined;

      return (
        <SwipeableRow onDelete={() => deleteTransaction(transaction.id)}>
          <TransactionRow
            transaction={transaction}
            category={category}
            onPress={() =>
              router.push(`/transaction?id=${transaction.id}` as any)
            }
          />
        </SwipeableRow>
      );
    },
    [deleteTransaction, router],
  );

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

      <XpensList
        data={filteredData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No transactions found</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
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
