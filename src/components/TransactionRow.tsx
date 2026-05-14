import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { memo } from "react";
import { getIcon } from "../features/categories/iconMap";
import { COLORS } from "../theme/colors";

interface TransactionRowProps {
  onPress?: () => void;
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
}

/**
 * TransactionRow - Renders a single transaction list item.
 * Supports different layout variants and displays amount, note, and time.
 */
export const TransactionRow = memo(function TransactionRow({
  onPress,
  renderData,
}: TransactionRowProps) {
  const IconComponent = getIcon(renderData.icon);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View
        style={[styles.iconContainer, { backgroundColor: renderData.iconBg }]}
      >
        <IconComponent size={20} color={renderData.iconColor} />
      </View>

      <View style={styles.content}>
        <Text style={styles.categoryName} numberOfLines={1}>
          {renderData.primaryText}
        </Text>
        {renderData.secondaryText ? (
          <Text style={styles.note} numberOfLines={1}>
            {renderData.secondaryText}
          </Text>
        ) : null}
      </View>

      <View style={styles.rightContent}>
        <Text style={[styles.amount, { color: renderData.amountColor }]}>
          {renderData.displayAmount}
        </Text>
        <Text style={styles.time}>{renderData.displayTime}</Text>
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
