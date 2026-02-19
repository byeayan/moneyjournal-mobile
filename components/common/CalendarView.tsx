import type { Transaction } from '@/types/transaction';
import colors from '@/utils/colors';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';

type CalendarViewProps = {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  transactions: Transaction[];
  showFullScreen?: boolean;
  cellHeight?: number;
  theme?: Record<string, unknown>;
};

function toLocalDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function parseLocalDateString(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export default function CalendarView({
  selectedDate,
  onDateSelect,
  transactions,
  showFullScreen = false,
  cellHeight = 32,
  theme,
}: CalendarViewProps) {
  const [markedDates, setMarkedDates] = useState<any>({});

  useEffect(() => {
    const marks: any = {};
    transactions.forEach((t) => {
      const dateStr = toLocalDateKey(new Date(t.date));
      if (!marks[dateStr]) marks[dateStr] = { dots: [] };
      marks[dateStr].dots.push({
        key: `${t.id}-${marks[dateStr].dots.length}`,
        color: t.type === 'income' ? colors.primary : colors.highlight,
      });
    });

    const selectedStr = toLocalDateKey(selectedDate);
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
      <Calendar
        current={toLocalDateKey(selectedDate)}
        onDayPress={(day: DateData) => onDateSelect(parseLocalDateString(day.dateString))}
        onMonthChange={(month) => onDateSelect(parseLocalDateString(month.dateString))}
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
});
