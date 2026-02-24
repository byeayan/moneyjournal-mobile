import type { RootStackParamList } from '@/navigation/AppNavigator';
import { useGoalsStore } from '@/store/goalsStore';
import { useTransactionStore } from '@/store/transactionStore';
import type { Transaction } from '@/types/transaction';
import colors from '@/utils/colors';
import { buildLiabilityCalendarItems } from '@/utils/liabilitySchedule';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, DateData } from 'react-native-calendars';

type FullCalendarScreenProps = NativeStackScreenProps<RootStackParamList, 'FullCalendar'>;

function isSameDay(a: Date, b: Date) {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

function formatCurrency(value: number) {
  return value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function toLocalDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function parseLocalDateString(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export default function FullCalendarScreen({ route }: FullCalendarScreenProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { fetchTransactionsByMonth, calendarTransactions } = useTransactionStore();
  const liabilities = useGoalsStore((state) => state.liabilities);
  const liabilityPayments = useGoalsStore((state) => state.liabilityPayments);

  const initialDate = route.params?.selectedDate ? new Date(route.params.selectedDate) : new Date();
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedChipTransaction, setSelectedChipTransaction] = useState<Transaction | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const liabilityItems = useMemo(
    () => buildLiabilityCalendarItems(liabilities, liabilityPayments),
    [liabilities, liabilityPayments]
  );

  const loadMonth = useCallback(async () => {
    await fetchTransactionsByMonth(selectedDate);
  }, [fetchTransactionsByMonth, selectedDate]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        await loadMonth();
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : 'Failed to load monthly transactions.';
        Alert.alert('Error', message);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [loadMonth]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadMonth();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh calendar.';
      Alert.alert('Error', message);
    } finally {
      setRefreshing(false);
    }
  }, [loadMonth]);

  const allTransactions = useMemo<Transaction[]>(
    () => (calendarTransactions.length ? calendarTransactions : route.params?.transactions ?? []),
    [calendarTransactions, route.params?.transactions]
  );

  const selectedDayTransactions = useMemo(() => {
    return allTransactions
      .filter((t) => isSameDay(new Date(t.date), selectedDate))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allTransactions, selectedDate]);

  const selectedSummary = useMemo(() => {
    const income = selectedDayTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = selectedDayTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      income,
      expense,
      net: income - expense,
      count: selectedDayTransactions.length,
    };
  }, [selectedDayTransactions]);
  const selectedDayLiabilities = useMemo(
    () => liabilityItems.filter((item) => item.date === toLocalDateKey(selectedDate)),
    [liabilityItems, selectedDate]
  );

  const selectedCategoryChips = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {};
    selectedDayTransactions.forEach((t) => {
      if (!map[t.category]) map[t.category] = { income: 0, expense: 0 };
      if (t.type === 'income') {
        map[t.category].income += t.amount;
      } else {
        map[t.category].expense += t.amount;
      }
    });

    return Object.entries(map).map(([category, totals]) => {
      const income = totals.income;
      const expense = totals.expense;
      const net = income - expense;
      const latestTransaction =
        selectedDayTransactions.find((t) => t.category === category) ?? null;
      return { category, income, expense, net, latestTransaction };
    });
  }, [selectedDayTransactions]);

  const monthlyInsight = useMemo(() => {
    const monthTransactions = allTransactions.filter((t) => {
      const date = new Date(t.date);
      return date.getMonth() === selectedDate.getMonth() && date.getFullYear() === selectedDate.getFullYear();
    });

    const expenseByCategory: Record<string, number> = {};
    monthTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        expenseByCategory[t.category] = (expenseByCategory[t.category] ?? 0) + t.amount;
      });

    const entries = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return null;

    return {
      category: entries[0][0],
      amount: entries[0][1],
    };
  }, [allTransactions, selectedDate]);

  useEffect(() => {
    setSelectedChipTransaction(null);
  }, [selectedDate]);

  const handleAddPress = () => setShowAddModal(true);

  const openIncome = () => {
    setShowAddModal(false);
    navigation.navigate('Income', { date: selectedDate.toISOString() });
  };

  const openExpense = () => {
    setShowAddModal(false);
    navigation.navigate('Expense', { date: selectedDate.toISOString() });
  };

  const openDayTransactions = () => {
    navigation.navigate('DailyTransaction', {
      date: selectedDate.toISOString(),
      transactions: selectedDayTransactions,
    });
  };

  const [markedDates, setMarkedDates] = useState<any>({});
  useEffect(() => {
    const marks: any = {};
    allTransactions.forEach((t) => {
      const dateStr = toLocalDateKey(new Date(t.date));
      if (!marks[dateStr]) marks[dateStr] = { dots: [] };
      marks[dateStr].dots.push({
        key: `${t.id}-${marks[dateStr].dots.length}`,
        color: t.type === 'income' ? colors.income : colors.expense,
      });
    });
    liabilityItems.forEach((item) => {
      if (!marks[item.date]) marks[item.date] = { dots: [] };
      marks[item.date].dots.push({
        key: `${item.id}-${marks[item.date].dots.length}`,
        color: '#F5A623',
      });
    });

    const selectedStr = toLocalDateKey(selectedDate);
    marks[selectedStr] = {
      ...(marks[selectedStr] || {}),
      selected: true,
      selectedColor: colors.primary,
      selectedTextColor: colors.white,
    };

    setMarkedDates(marks);
  }, [allTransactions, liabilityItems, selectedDate]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.highlight} />}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Calendar</Text>

        <View style={styles.calendarWrapper}>
          <Calendar
            current={toLocalDateKey(selectedDate)}
            onDayPress={(day: DateData) => setSelectedDate(parseLocalDateString(day.dateString))}
            onMonthChange={(month) => setSelectedDate(parseLocalDateString(month.dateString))}
            markingType={'multi-dot'}
            markedDates={markedDates}
            hideExtraDays={false}
            firstDay={0}
            theme={{
              todayTextColor: colors.highlight,
              arrowColor: colors.primary,
              monthTextColor: colors.highlight,
              textDayFontSize: 16,
              textMonthFontSize: 22,
              textDayHeaderFontSize: 14,
              selectedDayBackgroundColor: colors.primary,
              selectedDayTextColor: colors.white,
            }}
            style={{ borderRadius: 10 }}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Selected Day Summary</Text>
          <Text style={styles.cardText}>Transactions: {selectedSummary.count}</Text>
          <Text style={[styles.cardText, { color: colors.income }]}>Income: +Rs {formatCurrency(selectedSummary.income)}</Text>
          <Text style={[styles.cardText, { color: colors.expense }]}>Expense: -Rs {formatCurrency(selectedSummary.expense)}</Text>
          <Text style={[styles.cardText, styles.netText]}>
            Net: {selectedSummary.net >= 0 ? '+Rs ' : '-Rs '}
            {formatCurrency(Math.abs(selectedSummary.net))}
          </Text>
          {selectedDayLiabilities.length > 0 && (
            <>
              <Text style={[styles.cardText, { marginTop: 6, color: '#F5A623', fontWeight: '700' }]}>
                Total Liability Due: Rs
                {formatCurrency(selectedDayLiabilities.reduce((sum, item) => sum + item.amount, 0))}
              </Text>
              {selectedDayLiabilities.map((item) => (
                <Text key={item.id} style={[styles.cardText, { color: '#F5A623' }]}>
                  • {item.title} ({item.type.toUpperCase()}): Rs{formatCurrency(item.amount)}
                </Text>
              ))}
            </>
          )}
          <TouchableOpacity style={styles.linkButton} onPress={openDayTransactions}>
            <Text style={styles.linkButtonText}>View Day Transactions</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Category Chips</Text>
          {selectedCategoryChips.length === 0 ? (
            <Text style={styles.cardMuted}>No category data for selected date.</Text>
          ) : (
            <View style={styles.chipsWrap}>
              {selectedCategoryChips.map((chip) => (
                <TouchableOpacity
                  key={chip.category}
                  style={styles.chip}
                  onPress={() => setSelectedChipTransaction(chip.latestTransaction)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.chipTitle}>{chip.category}</Text>
                  <Text style={[styles.chipValue, { color: chip.net >= 0 ? colors.income : colors.expense }]}>
                    {chip.net >= 0 ? '+Rs ' : '-Rs '}
                    {formatCurrency(Math.abs(chip.net))}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Monthly Insight</Text>
          {monthlyInsight ? (
            <Text style={styles.cardText}>
              Highest spend category this month: {monthlyInsight.category} (Rs {formatCurrency(monthlyInsight.amount)})
            </Text>
          ) : (
            <Text style={styles.cardMuted}>No expense insight available for this month.</Text>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={!!selectedChipTransaction}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedChipTransaction(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedChipTransaction?.category ?? 'Transaction'} Preview
              </Text>
              <TouchableOpacity onPress={() => setSelectedChipTransaction(null)}>
                <Text style={styles.modalClose}>Close</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.previewLabel}>Note</Text>
            <Text style={selectedChipTransaction?.note?.trim() ? styles.cardText : styles.cardMuted}>
              {selectedChipTransaction?.note?.trim() || 'No note for this transaction.'}
            </Text>

            <Text style={[styles.previewLabel, { marginTop: 8 }]}>Description</Text>
            <Text style={selectedChipTransaction?.description?.trim() ? styles.cardText : styles.cardMuted}>
              {selectedChipTransaction?.description?.trim() || 'No description for this transaction.'}
            </Text>
          </View>
        </View>
      </Modal>

      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.addModalBackdrop}>
          <View style={styles.addModalCard}>
            <View style={styles.addModalHeader}>
              <Text style={styles.addModalTitle}>Add Transaction</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalClose}>Close</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.addModalSubTitle}>For {selectedDate.toDateString()}</Text>

            <TouchableOpacity style={[styles.addOptionBtn, styles.addIncomeBtn]} onPress={openIncome}>
              <Ionicons name="trending-up-outline" size={18} color={colors.white} />
              <Text style={styles.addOptionText}>Add Income</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.addOptionBtn, styles.addExpenseBtn]} onPress={openExpense}>
              <Ionicons name="trending-down-outline" size={18} color={colors.white} />
              <Text style={styles.addOptionText}>Add Expense</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.addCancelBtn} onPress={() => setShowAddModal(false)}>
              <Text style={styles.addCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <TouchableOpacity style={styles.fab} onPress={handleAddPress}>
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 10, paddingBottom: 110 },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  backButtonText: { color: colors.white, fontWeight: 'bold', marginLeft: 6 },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.white, marginBottom: 10 },
  calendarWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  cardTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardText: {
    color: colors.white,
    fontSize: 14,
    marginBottom: 4,
  },
  cardMuted: {
    color: colors.light,
    fontSize: 14,
  },
  netText: {
    marginTop: 2,
    fontWeight: '700',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.highlight,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipTitle: {
    color: colors.white,
    fontSize: 13,
    marginRight: 8,
  },
  chipValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  linkButton: {
    marginTop: 8,
    backgroundColor: colors.primary,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  linkButtonText: {
    color: colors.white,
    fontWeight: '600',
  },
  previewLabel: {
    color: colors.light,
    fontSize: 12,
    marginBottom: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.highlight,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  modalClose: {
    color: colors.light,
    fontWeight: '700',
  },
  addModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  addModalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    borderTopWidth: 1,
    borderColor: colors.highlight,
  },
  addModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  addModalTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  addModalSubTitle: {
    color: colors.light,
    fontSize: 13,
    marginBottom: 14,
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 10,
    gap: 8,
  },
  addIncomeBtn: {
    backgroundColor: colors.income,
  },
  addExpenseBtn: {
    backgroundColor: colors.expense,
  },
  addOptionText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  addCancelBtn: {
    marginTop: 2,
    borderWidth: 1,
    borderColor: colors.light,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  addCancelText: {
    color: colors.light,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: colors.highlight,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
});


