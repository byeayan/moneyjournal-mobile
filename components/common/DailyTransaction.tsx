import type { Transaction } from '@/types/transaction';
import colors from '@/utils/colors';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface DailyTransactionsProps {
  transactions: Transaction[];
}

const DailyTransactions: React.FC<DailyTransactionsProps> = ({ transactions }) => {
  if (!transactions || transactions.length === 0) {
    return <Text style={{ color: colors.light, fontSize: 14 }}>No transactions today</Text>;
  }

  return (
    <View>
      {transactions.map((t, index) => (
        <View key={`${t.id}-${index}`} style={styles.transactionCard}>
          <Text style={styles.transactionText}>
            {t.description || t.category}: {t.type === 'income' ? `+${t.amount}` : `-${t.amount}`}
          </Text>
          <Text style={styles.transactionSubText}>Account: {t.account} | Category: {t.category}</Text>
        </View>
      ))}
    </View>
  );
};

export default DailyTransactions;

const styles = StyleSheet.create({
  transactionCard: { backgroundColor: colors.surface, padding: 15, borderRadius: 10, marginBottom: 15 },
  transactionText: { color: colors.white, fontSize: 16, fontWeight: 'bold' },
  transactionSubText: { color: colors.light, fontSize: 12, marginTop: 5 },
});
