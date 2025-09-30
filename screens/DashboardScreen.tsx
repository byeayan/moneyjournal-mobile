import CalendarView from '@/components/common/CalendarView';
import DailyTransactions from '@/components/common/DailyTransaction';
import { Transaction } from '@/screens/DashboardScreen';
import colors from '@/utils/colors';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'; // 👈 added Alert

export default function DashboardScreen() {
  const navigation = useNavigation<any>();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Example transactions
  const allTransactions: Transaction[] = [
    { id: '1', type: 'income', amount: 500, category: 'Salary', account: 'Cash', date: new Date().toISOString() },
    { id: '2', type: 'expense', amount: 15, category: 'Food', account: 'Card', date: new Date().toISOString() },
    { id: '3', type: 'expense', amount: 20, category: 'Transport', account: 'Wallet', date: new Date().toISOString() },
  ];

  useEffect(() => {
    const filtered = allTransactions.filter((t) => {
      const tDate = new Date(t.date);
      return (
        tDate.getDate() === selectedDate.getDate() &&
        tDate.getMonth() === selectedDate.getMonth() &&
        tDate.getFullYear() === selectedDate.getFullYear()
      );
    });
    setTransactions(filtered);
  }, [selectedDate]);

  const dailyIncome = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const dailyExpense = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  const handleMaximizeCalendar = () => {
    navigation.navigate('FullCalendar', { transactions: allTransactions });
  };



  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>


      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('Income')}
        >
          <Text style={styles.buttonText}>+ Income</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('Expense')}
        >
          <Text style={styles.buttonText}>+ Expense</Text>
        </TouchableOpacity>
      </View>

      {/* Calendar */}
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <Text style={styles.sectionTitle}>Calendar</Text>
          <TouchableOpacity style={styles.iconCircle} onPress={handleMaximizeCalendar}>
            <Ionicons name="arrow-up-outline" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>

        <CalendarView
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          transactions={allTransactions}
          cellHeight={32}
          theme={{
            monthTextColor: colors.highlight,
            arrowColor: colors.primary,
            todayTextColor: colors.highlight,
            textDayFontSize: 16,
            textMonthFontSize: 20,
            textDayHeaderFontSize: 14,
          }}
        />
      </View>

      {/* Daily totals */}
      <View style={styles.dailyTotals}>
        <Text style={styles.dailyTotalText}>Income: +${dailyIncome}</Text>
        <Text style={styles.dailyTotalText}>Expense: -${dailyExpense}</Text>
      </View>

      {/* Daily Transactions */}
      <View style={styles.transactionsContainer}>
        <Text style={styles.sectionTitle}>Transactions</Text>
        <DailyTransactions transactions={transactions} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20, paddingTop: 20 },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  actionButton: { flex: 0.48, height: 55, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: colors.white, fontSize: 18, fontWeight: 'bold' },
  calendarContainer: { marginBottom: 10 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  iconCircle: {
    backgroundColor: colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  dailyTotals: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  dailyTotalText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  transactionsContainer: { marginBottom: 20 },
});
