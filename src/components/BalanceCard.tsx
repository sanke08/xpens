import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS } from "../theme/colors";
import { Transaction } from "../types";

interface BalanceCardProps {
  transactions: Transaction[];
}

/**
 * BalanceCard component displays the overall financial summary.
 * It shows total balance, income, and expenses, along with today's net change.
 */

export const BalanceCard = React.memo(function BalanceCard({
  transactions,
}: BalanceCardProps) {
  let totalIncome = 0;
  let totalExpense = 0;
  let todayBalance = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  transactions.forEach((tx) => {
    if (tx.type === "income") {
      totalIncome += tx.amount;
      if (tx.date >= today.getTime()) todayBalance += tx.amount;
    } else {
      totalExpense += tx.amount;
      if (tx.date >= today.getTime()) todayBalance -= tx.amount;
    }
  });

  const balance = totalIncome - totalExpense;

  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Balance</Text>
      <Text style={styles.balance}>₹{balance.toLocaleString("en-IN")}</Text>

      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={styles.subLabel}>Income</Text>
          <Text style={[styles.subAmount, { color: COLORS.success }]}>
            +₹{totalIncome.toLocaleString("en-IN")}
          </Text>
        </View>
        <View style={styles.half}>
          <Text style={styles.subLabel}>Expense</Text>
          <Text style={[styles.subAmount, { color: COLORS.danger }]}>
            -₹{totalExpense.toLocaleString("en-IN")}
          </Text>
        </View>
      </View>

      <View style={styles.todayBanner}>
        <Text style={styles.todayText}>
          Today: {todayBalance >= 0 ? "+" : "-"}₹
          {Math.abs(todayBalance).toLocaleString("en-IN")}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => router.push("/transactions")}
        style={{
          alignSelf: "flex-end",
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
        }}
      >
        <Text style={styles.viewAllBtn}>View All</Text>
        <ChevronRight size={14} color={COLORS.white} />
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    marginTop: 16,
  },
  label: {
    fontSize: 16,
    color: COLORS.muted,
    fontWeight: "500",
  },
  balance: {
    fontSize: 28,
    color: COLORS.text,
    fontWeight: "800",
    letterSpacing: -1,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  half: {
    flex: 1,
  },
  subLabel: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: "500",
  },
  subAmount: {
    fontSize: 16,
    fontWeight: "700",
  },
  todayBanner: {
    backgroundColor: COLORS.active,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  todayText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.lightGray,
  },
  viewAllBtn: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.lightGray,
  },
});
