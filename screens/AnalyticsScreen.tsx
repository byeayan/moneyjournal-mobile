import ChartWebView from '@/components/charts/ChartWebView';
import { useTransactionStore } from '@/store/transactionStore';
import type { Transaction } from '@/types/transaction';
import colors from '@/utils/colors';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { RootStackParamList } from '@/navigation/AppNavigator';

type AnalyticsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Analytics'>;

function getMonthKey(dateStr: string) {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function buildIncomeExpenseByMonth(transactions: Transaction[]) {
  const monthMap: Record<string, { income: number; expense: number }> = {};

  transactions.forEach((transaction) => {
    const key = getMonthKey(transaction.date);
    if (!monthMap[key]) {
      monthMap[key] = { income: 0, expense: 0 };
    }
    if (transaction.type === 'income') {
      monthMap[key].income += transaction.amount;
    } else {
      monthMap[key].expense += transaction.amount;
    }
  });

  const labels = Object.keys(monthMap).sort();
  return {
    labels,
    datasets: [
      {
        label: 'Income',
        data: labels.map((label) => monthMap[label].income),
        backgroundColor: colors.primary,
      },
      {
        label: 'Expense',
        data: labels.map((label) => monthMap[label].expense),
        backgroundColor: colors.highlight,
      },
    ],
  };
}

function buildCategoryExpense(transactions: Transaction[]) {
  const categoryMap: Record<string, number> = {};
  transactions
    .filter((transaction) => transaction.type === 'expense')
    .forEach((transaction) => {
      categoryMap[transaction.category] = (categoryMap[transaction.category] ?? 0) + transaction.amount;
    });

  const labels = Object.keys(categoryMap);
  return {
    labels,
    datasets: [
      {
        data: labels.map((label) => categoryMap[label]),
        backgroundColor: ['#654EB0', '#564787', '#7E6CC4', '#9F90D8', '#B9AFE8'],
      },
    ],
  };
}

function buildDailyExpenseTrend(transactions: Transaction[]) {
  const dailyMap: Record<string, number> = {};
  transactions
    .filter((transaction) => transaction.type === 'expense')
    .forEach((transaction) => {
      const dayKey = transaction.date.split('T')[0];
      dailyMap[dayKey] = (dailyMap[dayKey] ?? 0) + transaction.amount;
    });

  const labels = Object.keys(dailyMap).sort();
  return {
    labels,
    datasets: [
      {
        label: 'Daily Expense',
        data: labels.map((label) => dailyMap[label]),
        borderColor: colors.primary,
        backgroundColor: 'rgba(101, 78, 176, 0.3)',
        tension: 0.3,
        fill: true,
      },
    ],
  };
}

const mockMonthlyIncomeVsExpense = {
  labels: ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02'],
  datasets: [
    { label: 'Income', data: [1200, 1800, 1500, 2100, 2400], backgroundColor: colors.primary },
    { label: 'Expense', data: [900, 1400, 1100, 1700, 1600], backgroundColor: colors.highlight },
  ],
};

const mockCategoryExpenses = {
  labels: ['Food', 'Transport', 'Shopping', 'Bills'],
  datasets: [
    {
      data: [320, 170, 240, 300],
      backgroundColor: ['#654EB0', '#564787', '#7E6CC4', '#9F90D8'],
    },
  ],
};

const mockDailyExpenseTrend = {
  labels: ['02-11', '02-12', '02-13', '02-14', '02-15', '02-16', '02-17'],
  datasets: [
    {
      label: 'Daily Expense',
      data: [12, 45, 20, 60, 35, 80, 50],
      borderColor: colors.primary,
      backgroundColor: 'rgba(101, 78, 176, 0.3)',
      tension: 0.3,
      fill: true,
    },
  ],
};

export default function AnalyticsScreen() {
  const navigation = useNavigation<AnalyticsNavigationProp>();
  const transactions = useTransactionStore((state) => state.transactions);

  const monthlyIncomeVsExpense = useMemo(() => {
    return transactions.length > 0
      ? buildIncomeExpenseByMonth(transactions)
      : mockMonthlyIncomeVsExpense;
  }, [transactions]);

  const categoryExpenses = useMemo(() => {
    return transactions.length > 0 ? buildCategoryExpense(transactions) : mockCategoryExpenses;
  }, [transactions]);

  const dailyExpenseTrend = useMemo(() => {
    return transactions.length > 0 ? buildDailyExpenseTrend(transactions) : mockDailyExpenseTrend;
  }, [transactions]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Analytics</Text>
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Monthly Income vs Expense</Text>
        <ChartWebView chartType="bar" data={monthlyIncomeVsExpense} height={260} />
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Category-wise Expenses</Text>
        <ChartWebView chartType="pie" data={categoryExpenses} height={260} />
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Daily Expense Trend</Text>
        <ChartWebView chartType="line" data={dailyExpenseTrend} height={260} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 30,
  },
  header: {
    marginBottom: 14,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginBottom: 8,
  },
  backText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    color: colors.white,
    fontSize: 28,
    fontWeight: 'bold',
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  chartTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
});
