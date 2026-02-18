import type { RootStackParamList } from '@/navigation/AppNavigator';
import { useTransactionStore } from '@/store/transactionStore';
import type { Transaction } from '@/types/transaction';
import colors from '@/utils/colors';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';

type FullCalendarScreenProps = NativeStackScreenProps<RootStackParamList, 'FullCalendar'>;

export default function FullCalendarScreen({ route }: FullCalendarScreenProps) {
  const navigation = useNavigation<any>();
  const { fetchTransactionsByMonth, calendarTransactions } = useTransactionStore();

  const initialDate = route.params?.selectedDate ? new Date(route.params.selectedDate) : new Date();
  const [selectedDate, setSelectedDate] = useState(initialDate);

  useEffect(() => {
    fetchTransactionsByMonth(selectedDate);
  }, [selectedDate]);

  const allTransactions = useMemo<Transaction[]>(
    () => (calendarTransactions.length ? calendarTransactions : route.params?.transactions ?? []),
    [calendarTransactions, route.params?.transactions]
  );

  const handleAddPress = () => {
    Alert.alert('Add Transaction', 'Choose transaction type', [
      {
        text: 'Income',
        onPress: () => navigation.navigate('Income', { date: selectedDate.toISOString() }),
      },
      {
        text: 'Expense',
        onPress: () => navigation.navigate('Expense', { date: selectedDate.toISOString() }),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleDateSelect = (date: Date) => {
    const filteredTransactions = allTransactions.filter((t) => {
      const tDate = new Date(t.date);
      return (
        tDate.getDate() === date.getDate() &&
        tDate.getMonth() === date.getMonth() &&
        tDate.getFullYear() === date.getFullYear()
      );
    });

    navigation.navigate('DailyTransaction', {
      date: date.toISOString(),
      transactions: filteredTransactions,
    });
    setSelectedDate(date);
  };

  const [markedDates, setMarkedDates] = useState<any>({});
  useEffect(() => {
    const marks: any = {};
    allTransactions.forEach((t) => {
      const dateStr = new Date(t.date).toISOString().split('T')[0];
      if (!marks[dateStr]) marks[dateStr] = { dots: [] };
      marks[dateStr].dots.push({
        key: `${t.id}-${marks[dateStr].dots.length}`,
        color: t.type === 'income' ? colors.primary : colors.highlight,
      });
    });

    const selectedStr = selectedDate.toISOString().split('T')[0];
    marks[selectedStr] = {
      ...(marks[selectedStr] || {}),
      selected: true,
      selectedColor: colors.primary,
      selectedTextColor: colors.white,
    };

    setMarkedDates(marks);
  }, [allTransactions, selectedDate]);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={22} color={colors.white} />
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Calendar</Text>

      <View style={styles.calendarWrapper}>
        <Calendar
          current={selectedDate.toISOString().split('T')[0]}
          onDayPress={(day: DateData) => handleDateSelect(new Date(day.dateString))}
          onMonthChange={(month) => setSelectedDate(new Date(month.dateString))}
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

      <TouchableOpacity style={styles.fab} onPress={handleAddPress}>
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 10 },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  backButtonText: { color: colors.white, fontWeight: 'bold', marginLeft: 6 },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.white, marginBottom: 10 },
  calendarWrapper: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.surface,
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
