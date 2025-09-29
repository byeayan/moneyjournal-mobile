// utils/calendar.ts
import { Transaction } from '@/screens/DashboardScreen';

export type DayItem = {
  date: Date;
  isCurrentMonth: boolean;
  income?: number;
  expense?: number;
};

// Get all dates for a month in a 6x7 grid
export function getMonthDays(year: number, month: number, transactions: Transaction[]): DayItem[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const days: DayItem[] = [];

  // Start weekday (0 = Sunday, 1 = Monday)
  const startWeekday = firstDay.getDay();

  // Previous month days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDay - i);
    days.push({ date: d, isCurrentMonth: false, income: 0, expense: 0 });
  }

  // Current month days
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d);
    const dayTransactions = transactions.filter(
      (t) =>
        new Date(t.date).getDate() === date.getDate() &&
        new Date(t.date).getMonth() === date.getMonth() &&
        new Date(t.date).getFullYear() === date.getFullYear()
    );
    const income = dayTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = dayTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    days.push({ date, isCurrentMonth: true, income, expense });
  }

  // Next month padding to fill rows (6x7 grid)
  let nextDay = 1;
  while (days.length % 7 !== 0 || days.length < 42) {
    const d = new Date(year, month + 1, nextDay++);
    days.push({ date: d, isCurrentMonth: false, income: 0, expense: 0 });
  }

  return days;
}

// Format date to string like "2025-09-17"
export function formatDate(date: Date) {
  return date.toISOString().split('T')[0];
}
