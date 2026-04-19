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

  const color = category.type === 'income' ? '#16a34a' : '#171717';
  const bgColor = category.type === 'income' ? '#dcfce7' : '#f5f5f5';

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
        <Text style={[styles.amount, category.type === 'income' && { color: '#16a34a' }]}>
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
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
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
    color: '#171717',
    marginBottom: 4,
  },
  meta: {
    fontSize: 13,
    color: '#737373',
  },
  amountContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#171717',
  }
});
