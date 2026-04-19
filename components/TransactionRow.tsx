import { COLORS } from '@/lib/colors';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { getIcon } from '../lib/iconMap';
import { Transaction, Category } from '../lib/store';
import { format } from 'date-fns';

interface TransactionRowProps {
  transaction: Transaction;
  category?: Category;
  onPress?: () => void;
}

export function TransactionRow({ transaction, category, onPress }: TransactionRowProps) {
  const IconComponent = getIcon(category?.icon);
  const isIncome = transaction.type === 'income';

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7} disabled={!onPress}>
      <View style={[styles.iconContainer, { backgroundColor: isIncome ? COLORS.successBg : COLORS.active }]}>
        <IconComponent size={20} color={isIncome ? COLORS.success : COLORS.text} />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.categoryName}>{transaction.categoryName || 'Uncategorized'}</Text>
        {(transaction.title || transaction.note) ? (
          <Text style={styles.note} numberOfLines={1}>
            {transaction.title ? `${transaction.title} ` : ''}
            {transaction.note ? `• ${transaction.note}` : ''}
          </Text>
        ) : null}
      </View>

      <View style={styles.rightContent}>
        <Text style={[styles.amount, { color: isIncome ? COLORS.success : COLORS.text }]}>
          {isIncome ? '+' : '-'}₹{transaction.amount.toLocaleString('en-IN')}
        </Text>
        <Text style={styles.time}>{format(transaction.date, 'HH:mm')}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  note: {
    fontSize: 13,
    color: COLORS.muted,
  },
  rightContent: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  time: {
    fontSize: 12,
    color: COLORS.gray,
  }
});
