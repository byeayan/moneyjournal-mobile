import type { Transaction } from '@/types/transaction';
import colors from '@/utils/colors';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';

type CalendarViewProps = {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  transactions: Transaction[];
  showFullScreen?: boolean;
  cellHeight?: number;
  theme?: Record<string, unknown>;
};

export default function CalendarView({
  selectedDate,
  onDateSelect,
  transactions,
  showFullScreen = false,
  cellHeight = 32,
  theme,
}: CalendarViewProps) {
  const [markedDates, setMarkedDates] = useState<any>({});

  // Mark dates with transactions and selected date
  useEffect(() => {
    const marks: any = {};
    transactions.forEach((t) => {
      const dateStr = new Date(t.date).toISOString().split('T')[0];
      if (!marks[dateStr]) marks[dateStr] = { dots: [] };
      marks[dateStr].dots.push({
        key: t.id,
        color: t.type === 'income' ? colors.primary : colors.highlight,
      });
    });

    const selectedStr = selectedDate.toISOString().split('T')[0];
    marks[selectedStr] = {
      ...(marks[selectedStr] || {}),
      selected: true,
      selectedColor: colors.primary,
      selectedTextColor: colors.white,
      customStyles: showFullScreen
        ? {
            container: {
              width: cellHeight,
              height: cellHeight,
              borderRadius: 8,
              justifyContent: 'center',
              alignItems: 'center',
            },
            text: { fontWeight: 'bold', color: colors.white, fontSize: 18 },
          }
        : {
            container: {
              width: cellHeight,
              height: cellHeight,
              borderRadius: cellHeight / 2,
              justifyContent: 'center',
              alignItems: 'center',
            },
            text: { fontWeight: 'bold', color: colors.white },
          },
    };

    setMarkedDates(marks);
  }, [transactions, selectedDate, showFullScreen, cellHeight]);

  return (
    <View style={styles.container}>
      {/* Month Header */}
      <View style={styles.monthHeader}>
        <Text style={styles.monthText}>
          {selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </Text>
      </View>

      <Calendar
        current={selectedDate.toISOString().split('T')[0]}
        onDayPress={(day: DateData) => onDateSelect(new Date(day.dateString))}
        markingType={'multi-dot'}
        markedDates={markedDates}
        hideExtraDays={false}
        firstDay={0}
        theme={{
          todayTextColor: colors.highlight,
          arrowColor: colors.primary,
          monthTextColor: colors.white,
          textDayFontSize: showFullScreen ? 20 : 16,
          textMonthFontSize: showFullScreen ? 24 : 18,
          textDayHeaderFontSize: showFullScreen ? 16 : 14,
          ...(theme ?? {}),
        }}
        style={showFullScreen ? { height: '100%' } : {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  monthHeader: {
    backgroundColor: colors.surface,
    paddingVertical: 6,
    alignItems: 'center',
    marginBottom: 4,
  },
  monthText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
