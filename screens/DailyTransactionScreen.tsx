import type { Transaction } from '@/types/transaction';
import colors from '@/utils/colors';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface DailyTransactionScreenProps {
  route: {
    params: {
      date: string; // coming as ISO string from navigation
      transactions: Transaction[];
    };
  };
}

export default function DailyTransactionScreen({ route }: DailyTransactionScreenProps) {
  const navigation = useNavigation<any>();
  const { date: dateString, transactions } = route.params;

  // Convert string to Date object
  const date = new Date(dateString);

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.dateTitle}>{date.toDateString()}</Text>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.transactionItem}>
            <Text style={styles.category}>{item.category}</Text>
            <Text
              style={[
                styles.amount,
                { color: item.type === 'income' ? colors.primary : colors.highlight },
              ]}
            >
              {item.type === 'income' ? '+' : '-'}${item.amount}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No transactions for this day.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: colors.background },
  backButton: {
    marginBottom: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: 5,
  },
  backButtonText: { color: colors.white, fontWeight: 'bold' },
  dateTitle: { fontSize: 22, fontWeight: 'bold', color: colors.white, marginBottom: 20 },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: colors.surface,
  },
  category: { color: colors.white, fontSize: 16 },
  amount: { fontSize: 16, fontWeight: '600' },
  emptyText: { color: colors.white, fontStyle: 'italic', textAlign: 'center', marginTop: 20 },
});
