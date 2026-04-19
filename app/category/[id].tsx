import { COLORS } from '@/lib/colors';
import { format, isToday, isYesterday } from "date-fns";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React, { useMemo } from "react";
import {
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { TransactionRow } from "../../components/TransactionRow";
import { getIcon } from "../../lib/iconMap";
import { Transaction, useStore } from "../../lib/store";

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { transactions, categories } = useStore();

  const category = categories.find((c) => c.id === id);

  const { filteredData, totalAmount } = useMemo(() => {
    let total = 0;
    const catTxs = transactions.filter((t) => t.categoryId === id);

    // Grouping by date
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
      <>
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
      </>
    );
  }

  const IconComponent = getIcon(category.icon);
  const isIncome = category.type === "income";

  return (
    <>
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
          <IconComponent size={32} color={isIncome ? COLORS.success : COLORS.text} />
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
          <TransactionRow
            transaction={item}
            category={category}
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
            <Text style={styles.emptyText}>
              No transactions in this category
            </Text>
          </View>
        }
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
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
  summaryCard: {
    alignItems: "center",
    paddingVertical: 32,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.muted,
    fontWeight: "500",
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -1,
  },
  sectionHeader: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
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
