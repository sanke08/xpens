import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { formatDistanceToNow } from 'date-fns';

import { COLORS } from '../theme/colors';
import { getIcon } from '../features/categories/iconMap';
import { Category } from '../types';

interface CategorySummaryRowProps {
  category: Category;
  totalAmount: number;
  transactionCount: number;
  latestTransactionDate?: number;
  onPress: () => void;
}

/**
 * CategorySummaryRow - Renders a row showing summary statistics for a specific category.
 * Used on the Dashboard to provide a high-level breakdown of spending/income.
 */
export function CategorySummaryRow({
  category,
  totalAmount,
  transactionCount,
  latestTransactionDate,
  onPress,
}: CategorySummaryRowProps) {
  const IconComponent = getIcon(category.icon);

  const isIncome = category.type === 'income';
  const color = isIncome ? COLORS.success : COLORS.text;
  const bgColor = isIncome ? COLORS.successBg : COLORS.active;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
        <IconComponent size={24} color={color} />
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.name}>{category.name}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {transactionCount} {transactionCount === 1 ? 'transaction' : 'transactions'}
          {latestTransactionDate ? ` • ${formatDistanceToNow(latestTransactionDate, { addSuffix: true })}` : ''}
        </Text>
      </View>
      
      <View style={styles.amountContainer}>
        <Text style={[styles.amount, isIncome && { color: COLORS.success }]}>
          {isIncome ? '+' : ''}₹{totalAmount.toLocaleString('en-IN')}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: COLORS.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  meta: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: '500',
  },
  amountContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 12,
  },
  amount: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  }
});
