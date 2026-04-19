import { COLORS } from '@/lib/colors';
import { format, isToday, isYesterday } from "date-fns";
import { useRouter } from "expo-router";
import { ArrowLeft, Search } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { TransactionRow } from "../components/TransactionRow";
import { Transaction, useStore } from "../lib/store";

export default function TransactionsScreen() {
  const router = useRouter();
  const { transactions, categories } = useStore();

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

    // Grouping by date
    const grouped: { [key: string]: Transaction[] } = {};
    filtered.forEach((t) => {
      const d = new Date(t.date);
      d.setHours(0, 0, 0, 0);
      const key = d.getTime().toString();
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(t);
    });

    const sections = Object.keys(grouped)
      .sort((a, b) => Number(b) - Number(a))
      .map((key) => {
        const timestamp = Number(key);
        let title = format(timestamp, "MMM dd, yyyy");
        if (isToday(timestamp)) title = "Today";
        else if (isYesterday(timestamp)) title = "Yesterday";

        return {
          title,
          data: grouped[key],
        };
      });

    return sections;
  }, [transactions, searchQuery, filterType]);

  const getCategory = (id?: string | null) =>
    categories.find((c) => c.id === id);

  return (
    <>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color=COLORS.text />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Transactions</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color=COLORS.muted />
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
        <TouchableOpacity
          style={[
            styles.filterChip,
            filterType === "all" && styles.filterChipActive,
          ]}
          onPress={() => setFilterType("all")}
        >
          <Text
            style={[
              styles.filterText,
              filterType === "all" && styles.filterTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterChip,
            filterType === "expense" && styles.filterChipActive,
          ]}
          onPress={() => setFilterType("expense")}
        >
          <Text
            style={[
              styles.filterText,
              filterType === "expense" && styles.filterTextActive,
            ]}
          >
            Expense
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterChip,
            filterType === "income" && styles.filterChipActive,
          ]}
          onPress={() => setFilterType("income")}
        >
          <Text
            style={[
              styles.filterText,
              filterType === "income" && styles.filterTextActive,
            ]}
          >
            Income
          </Text>
        </TouchableOpacity>
      </View>

      <SectionList
        sections={filteredData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TransactionRow
            transaction={item}
            category={getCategory(item.categoryId)}
            onPress={() =>
              router.push({
                pathname: "/transaction",
                params: { id: item.id },
              } as any)
            }
          />
        )}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No transactions found</Text>
          </View>
        }
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.active,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: COLORS.text,
  },
  filtersWrapper: {
    flexDirection: "row",
    paddingHorizontal: 16,
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.muted,
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
