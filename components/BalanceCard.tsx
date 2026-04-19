import { COLORS } from "@/lib/colors";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Transaction } from "../lib/store";

interface BalanceCardProps {
  transactions: Transaction[];
}

export function BalanceCard({ transactions }: BalanceCardProps) {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  label: {
    fontSize: 16,
    color: COLORS.muted,
    fontFamily: "System",
    fontWeight: "500",
    marginBottom: 4,
  },
  balance: {
    fontSize: 32,
    color: COLORS.text,
    fontWeight: "800",
    fontFamily: "System",
    letterSpacing: -1,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  half: {
    flex: 1,
  },
  subLabel: {
    fontSize: 14,
    color: COLORS.gray,
    fontWeight: "500",
    marginBottom: 4,
  },
  subAmount: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "System",
  },
  todayBanner: {
    backgroundColor: COLORS.active,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  todayText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.lightGray,
  },
});
