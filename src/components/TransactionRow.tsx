import { format } from "date-fns";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { memo } from "react";
import { getIcon } from "../features/categories/iconMap";
import { COLORS } from "../theme/colors";
import { Category, Transaction } from "../types";

interface TransactionRowProps {
  transaction: Transaction;
  category?: Category;
  onPress?: () => void;
  variant?: "default" | "category";
}

/**
 * TransactionRow - Renders a single transaction list item.
 * Supports different layout variants and displays amount, note, and time.
 */
export const TransactionRow = memo(function TransactionRow({
  transaction,
  category,
  onPress,
  variant = "default",
}: TransactionRowProps) {
  const IconComponent = getIcon(category?.icon);
  const isIncome = transaction.type === "income";

  const primaryText =
    variant === "category"
      ? transaction.title ||
        transaction.note ||
        transaction.categoryName ||
        "Uncategorized"
      : transaction.categoryName || "Uncategorized";

  let secondaryText = "";
  if (variant === "category") {
    if (transaction.title && transaction.note) {
      secondaryText = transaction.note;
    }
  } else {
    if (transaction.title && transaction.note) {
      secondaryText = `${transaction.title} • ${transaction.note}`;
    } else if (transaction.title) {
      secondaryText = transaction.title;
    } else if (transaction.note) {
      secondaryText = `• ${transaction.note}`;
    }
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: isIncome ? COLORS.successBg : COLORS.active },
        ]}
      >
        <IconComponent
          size={20}
          color={isIncome ? COLORS.success : COLORS.text}
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.categoryName} numberOfLines={1}>
          {primaryText}
        </Text>
        {secondaryText ? (
          <Text style={styles.note} numberOfLines={1}>
            {secondaryText}
          </Text>
        ) : null}
      </View>

      <View style={styles.rightContent}>
        <Text
          style={[
            styles.amount,
            { color: isIncome ? COLORS.success : COLORS.text },
          ]}
        >
          {isIncome ? "+" : "-"}₹{transaction.amount.toLocaleString("en-IN")}
        </Text>
        <Text style={styles.time}>{format(transaction.date, "HH:mm")}</Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 2,
  },
  note: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: "500",
  },
  rightContent: {
    alignItems: "flex-end",
    justifyContent: "center",
    marginLeft: 8,
  },
  amount: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 2,
  },
  time: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: "600",
  },
});
