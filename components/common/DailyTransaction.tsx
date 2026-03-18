import type { Transaction } from '@/types/transaction';
import colors from '@/utils/colors';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface DailyTransactionsProps {
  transactions: Transaction[];
  maxItems?: number;
}

const DailyTransactions: React.FC<DailyTransactionsProps> = ({ transactions, maxItems }) => {
  const items = typeof maxItems === 'number' ? transactions.slice(0, maxItems) : transactions;

  if (!items || items.length === 0) {
    return <Text style={{ color: colors.light, fontSize: 14 }}>No transactions found</Text>;
  }

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;

  const grouped = items.reduce<Record<string, Transaction[]>>((acc, transaction) => {
    const date = new Date(transaction.date);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(transaction);
    return acc;
  }, {});

  const sortedGroupKeys = Object.keys(grouped).sort((a, b) => {
    const [ay, am, ad] = a.split('-').map(Number);
    const [by, bm, bd] = b.split('-').map(Number);
    return new Date(by, bm, bd).getTime() - new Date(ay, am, ad).getTime();
  });

  return (
    <View>
      {sortedGroupKeys.map((groupKey) => {
        const [year, month, day] = groupKey.split('-').map(Number);
        const groupDate = new Date(year, month, day);
        const header =
          groupKey === todayKey
            ? 'Today'
            : groupKey === yesterdayKey
              ? 'Yesterday'
              : groupDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });

        return (
          <View key={groupKey} style={styles.group}>
            <Text style={styles.groupHeader}>{header}</Text>
            {grouped[groupKey].map((t, index) => (
              <View key={`${t.id}-${index}`} style={styles.transactionCard}>
                <View style={styles.transactionRow}>
                  <Text style={styles.transactionText}>{t.description || t.category}</Text>
                  <Text style={[styles.amountText, { color: t.type === 'income' ? colors.income : colors.expense }]}>
                    {t.type === 'income' ? `+${t.amount}` : `-${t.amount}`}
                  </Text>
                </View>
                <Text style={styles.transactionSubText}>Category: {t.category}</Text>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
};

export default DailyTransactions;

const styles = StyleSheet.create({
  group: { marginBottom: 8 },
  groupHeader: {
    color: colors.light,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 2,
  },
  transactionCard: { backgroundColor: colors.surface, padding: 15, borderRadius: 10, marginBottom: 15 },
  transactionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  transactionText: { fontSize: 16, fontWeight: 'bold', color: colors.white, flex: 1, marginRight: 12 },
  amountText: { fontSize: 16, fontWeight: 'bold' },
  transactionSubText: { color: colors.light, fontSize: 12, marginTop: 5 },
});
