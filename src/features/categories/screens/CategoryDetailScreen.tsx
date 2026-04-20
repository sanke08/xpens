import { format, isToday, isYesterday } from "date-fns";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React, { useMemo } from "react";
import {
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { SwipeableRow } from "../../../components/SwipeableRow";
import { TransactionRow } from "../../../components/TransactionRow";
import { useStore } from "../../../store/useStore";
import { COLORS } from "../../../theme/colors";
import { Transaction } from "../../../types";
import { getIcon } from "../iconMap";

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

    // Grouping by date for logical separation in list
    const grouped: { [key: string]: Transaction[] } = {};
    catTxs.forEach((t) => {
      total += t.amount;
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

    return { filteredData: sections, totalAmount: total };
  }, [id, transactions]);

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
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{category.name}</Text>
      </View>

      <View style={styles.summaryCard}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: isIncome ? COLORS.successBg : COLORS.active },
          ]}
        >
          <IconComponent
            size={32}
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

      <SectionList
        sections={filteredData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SwipeableRow onDelete={() => deleteTransaction(item.id)}>
            <TransactionRow
              transaction={item}
              category={category}
              variant="category"
              onPress={() =>
                router.push({
                  pathname: "/transaction",
                  params: { id: item.id },
                } as any)
              }
            />
          </SwipeableRow>
        )}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No transactions in this category yet.
            </Text>
          </View>
        }
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
      />
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
    paddingVertical: 40,
    backgroundColor: COLORS.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.muted,
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  summaryAmount: {
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: -1,
  },
  sectionHeader: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
