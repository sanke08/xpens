import { COLORS } from '@/lib/colors';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { getIcon } from '../lib/iconMap';
import { Category } from '../lib/store';
import { formatDistanceToNow } from 'date-fns';

interface CategorySummaryRowProps {
  category: Category;
  totalAmount: number;
  transactionCount: number;
  latestTransactionDate?: number;
  onPress: () => void;
}

export function CategorySummaryRow({ category, totalAmount, transactionCount, latestTransactionDate, onPress }: CategorySummaryRowProps) {
  const IconComponent = getIcon(category.icon);

  const color = category.type === 'income' ? COLORS.success : COLORS.text;
  const bgColor = category.type === 'income' ? COLORS.successBg : COLORS.active;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
        <IconComponent size={24} color={color} />
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.name}>{category.name}</Text>
        <Text style={styles.meta}>
          {transactionCount} {transactionCount === 1 ? 'transaction' : 'transactions'}
          {latestTransactionDate ? ` • ${formatDistanceToNow(latestTransactionDate, { addSuffix: true })}` : ''}
        </Text>
      </View>
      
      <View style={styles.amountContainer}>
        <Text style={[styles.amount, category.type === 'income' && { color: COLORS.success }]}>
          {category.type === 'income' ? '+' : ''}₹{totalAmount.toLocaleString('en-IN')}
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
    paddingHorizontal: 16,
    backgroundColor: COLORS.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  meta: {
    fontSize: 13,
    color: COLORS.muted,
  },
  amountContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  }
});
