import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Transaction } from '../lib/store';

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
    if (tx.type === 'income') {
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
      <Text style={styles.balance}>₹{balance.toLocaleString('en-IN')}</Text>
      
      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={styles.subLabel}>Income</Text>
          <Text style={[styles.subAmount, { color: '#16a34a' }]}>+₹{totalIncome.toLocaleString('en-IN')}</Text>
        </View>
        <View style={styles.half}>
          <Text style={styles.subLabel}>Expense</Text>
          <Text style={[styles.subAmount, { color: '#dc2626' }]}>-₹{totalExpense.toLocaleString('en-IN')}</Text>
        </View>
      </View>

      <View style={styles.todayBanner}>
        <Text style={styles.todayText}>
          Today: {todayBalance >= 0 ? '+' : '-'}₹{Math.abs(todayBalance).toLocaleString('en-IN')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    marginTop: 16,
  },
  label: {
    fontSize: 16,
    color: '#737373',
    fontFamily: 'System',
    fontWeight: '500',
    marginBottom: 4,
  },
  balance: {
    fontSize: 48,
    color: '#171717',
    fontWeight: '800',
    fontFamily: 'System',
    letterSpacing: -1,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  half: {
    flex: 1,
  },
  subLabel: {
    fontSize: 14,
    color: '#a3a3a3',
    fontWeight: '500',
    marginBottom: 4,
  },
  subAmount: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'System',
  },
  todayBanner: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  todayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#525252',
  }
});
