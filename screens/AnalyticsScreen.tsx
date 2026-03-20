import type { RootStackParamList } from '@/navigation/AppNavigator';
import ChartWebView from '@/components/charts/ChartWebView';
import { API_BASE_URL } from '@/config/api';
import { useAuthStore } from '@/store/authStore';
import { toMonthKey } from '@/store/budgetStore';
import type { Transaction } from '@/types/transaction';
import colors from '@/utils/colors';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type AnalyticsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Analytics'>;
type Timeframe = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

const CONTROL_STEP = 5;
const MIN_CONTROL = -50;
const MAX_CONTROL = 50;
const TIMEFRAME_OPTIONS: { label: string; value: Timeframe }[] = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'Yearly', value: 'yearly' },
];
const MUTED_INCOME = '#B89CFF';
const MUTED_EXPENSE = '#8D71D7';
const MUTED_PRIMARY = '#A783F4';
const MUTED_PRIMARY_FILL = 'rgba(167, 131, 244, 0.22)';

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out while loading analytics.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function readResponseBody(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function normalizeTransaction(raw: any): Transaction {
  return {
    id: raw?.id ?? raw?._id ?? `${Date.now()}-${Math.random()}`,
    amount: Number(raw?.amount ?? 0),
    note: raw?.note ?? '',
    description: raw?.description ?? '',
    category: raw?.category ?? 'Other',
    type: raw?.type === 'income' ? 'income' : 'expense',
    date: raw?.date ?? raw?.createdAt ?? new Date().toISOString(),
    account: raw?.account,
  };
}

function extractTransactions(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.transactions)) return payload.transactions;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function dedupeTransactions(items: Transaction[]) {
  const map = new Map<string, Transaction>();
  items.forEach((t) => map.set(t.id, t));
  return Array.from(map.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function formatCurrency(value: number) {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeCategoryLabel(value: unknown) {
  if (typeof value !== 'string') return 'Other';
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === 'undefined' || trimmed.toLowerCase() === 'null') {
    return 'Other';
  }
  return trimmed;
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function fromDateKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`);
}

function getWeekStartSunday(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function getPeriodKey(dateStr: string, timeframe: Timeframe) {
  const date = new Date(dateStr);
  if (timeframe === 'weekly') return toDateKey(getWeekStartSunday(date));
  if (timeframe === 'monthly') return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  if (timeframe === 'quarterly') return `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;
  return `${date.getFullYear()}`;
}

function isSamePeriod(dateStr: string, anchor: Date, timeframe: Timeframe) {
  return getPeriodKey(dateStr, timeframe) === getPeriodKey(anchor.toISOString(), timeframe);
}

function buildIncomeExpenseByPeriod(transactions: Transaction[], timeframe: Timeframe, anchorDate: Date) {
  if (timeframe === 'weekly') {
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const income = Array(7).fill(0);
    const expense = Array(7).fill(0);
    const weekKey = toDateKey(getWeekStartSunday(anchorDate));

    transactions.forEach((transaction) => {
      if (getPeriodKey(transaction.date, 'weekly') !== weekKey) return;
      const day = new Date(transaction.date).getDay();
      if (transaction.type === 'income') income[day] += transaction.amount;
      else expense[day] += transaction.amount;
    });

    return {
      labels,
      datasets: [
        { label: 'Income', data: income, backgroundColor: MUTED_INCOME },
        { label: 'Expense', data: expense, backgroundColor: MUTED_EXPENSE },
      ],
    };
  }

  const bucketMap: Record<string, { income: number; expense: number }> = {};
  transactions.forEach((transaction) => {
    const key = getPeriodKey(transaction.date, timeframe);
    if (!bucketMap[key]) bucketMap[key] = { income: 0, expense: 0 };
    if (transaction.type === 'income') bucketMap[key].income += transaction.amount;
    else bucketMap[key].expense += transaction.amount;
  });

  const labels = Object.keys(bucketMap).sort();
  return {
    labels,
    datasets: [
      { label: 'Income', data: labels.map((label) => bucketMap[label].income), backgroundColor: MUTED_INCOME },
      { label: 'Expense', data: labels.map((label) => bucketMap[label].expense), backgroundColor: MUTED_EXPENSE },
    ],
  };
}

function buildTopSpendingCategories(transactions: Transaction[]) {
  const categoryMap: Record<string, number> = {};
  transactions
    .filter((transaction) => transaction.type === 'expense')
    .forEach((transaction) => {
      const category = normalizeCategoryLabel(transaction.category);
      categoryMap[category] = (categoryMap[category] ?? 0) + transaction.amount;
    });
  const top = Object.entries(categoryMap)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  const labels = top.map((x) => x.label);
  return {
    labels,
    datasets: [
      {
        data: top.map((x) => x.value),
        backgroundColor: ['#C9AEFF', '#B89CFF', '#A783F4', '#9570E5', '#845ED2'],
      },
    ],
  };
}

function buildExpenseTrendByPeriod(transactions: Transaction[], timeframe: Timeframe, anchorDate: Date) {
  if (timeframe === 'weekly') {
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const values = Array(7).fill(0);
    const weekKey = toDateKey(getWeekStartSunday(anchorDate));
    transactions
      .filter((transaction) => transaction.type === 'expense')
      .forEach((transaction) => {
        if (getPeriodKey(transaction.date, 'weekly') !== weekKey) return;
        values[new Date(transaction.date).getDay()] += transaction.amount;
      });

    return {
      labels,
      datasets: [
        {
          label: 'Weekly Expense',
          data: values,
          borderColor: MUTED_PRIMARY,
          backgroundColor: MUTED_PRIMARY_FILL,
          tension: 0.3,
          fill: true,
        },
      ],
    };
  }

  const bucketMap: Record<string, number> = {};
  transactions
    .filter((transaction) => transaction.type === 'expense')
    .forEach((transaction) => {
      const key = getPeriodKey(transaction.date, timeframe);
      bucketMap[key] = (bucketMap[key] ?? 0) + transaction.amount;
    });

  const labels = Object.keys(bucketMap).sort();
  return {
    labels,
    datasets: [
      {
        label: `${timeframe[0].toUpperCase()}${timeframe.slice(1)} Expense`,
        data: labels.map((label) => bucketMap[label]),
        borderColor: MUTED_PRIMARY,
        backgroundColor: MUTED_PRIMARY_FILL,
        tension: 0.3,
        fill: true,
      },
    ],
  };
}

export default function AnalyticsScreen() {
  const navigation = useNavigation<AnalyticsNavigationProp>();
  const authToken = useAuthStore((state) => state.authToken);

  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('monthly');
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);

  const fetchAllTransactions = useCallback(async () => {
    if (!authToken) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      };

      const pageSize = 200;
      const pageCap = 25;
      let page = 1;
      let totalPages = 1;
      const merged: Transaction[] = [];

      while (page <= totalPages && page <= pageCap) {
        const response = await fetchWithTimeout(
          `${API_BASE_URL}/transactions?page=${page}&limit=${pageSize}`,
          { method: 'GET', headers }
        );
        const data = await readResponseBody(response);
        if (!response.ok) {
          throw new Error((data as any)?.message || 'Failed to load analytics data');
        }

        const raw = extractTransactions(data);
        merged.push(...raw.map(normalizeTransaction));
        totalPages = Number((data as any)?.pagination?.totalPages ?? 1);
        if (raw.length === 0) break;
        page += 1;
      }

      setAllTransactions(dedupeTransactions(merged));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    void fetchAllTransactions();
  }, [fetchAllTransactions]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchAllTransactions();
    } finally {
      setRefreshing(false);
    }
  }, [fetchAllTransactions]);

  const hasData = allTransactions.length > 0;
  const anchorDate = useMemo(() => (hasData ? new Date(allTransactions[0].date) : new Date()), [hasData, allTransactions]);

  const availableWeekKeys = useMemo(() => {
    const keys = Array.from(new Set(allTransactions.map((t) => getPeriodKey(t.date, 'weekly')))).sort();
    return keys;
  }, [allTransactions]);

  useEffect(() => {
    if (availableWeekKeys.length === 0) return;
    setSelectedWeekIndex(availableWeekKeys.length - 1);
  }, [availableWeekKeys.length]);

  const weeklyAnchorDate = useMemo(() => {
    if (availableWeekKeys.length === 0) return anchorDate;
    const key = availableWeekKeys[Math.max(0, Math.min(selectedWeekIndex, availableWeekKeys.length - 1))];
    return fromDateKey(key);
  }, [availableWeekKeys, selectedWeekIndex, anchorDate]);

  const periodAnchorDate = timeframe === 'weekly' ? weeklyAnchorDate : anchorDate;

  const periodTransactions = useMemo(() => {
    return allTransactions.filter((t) => isSamePeriod(t.date, periodAnchorDate, timeframe));
  }, [allTransactions, periodAnchorDate, timeframe]);

  const analysisTransactions = periodTransactions.length > 0 ? periodTransactions : allTransactions;

  const incomeVsExpense = useMemo(
    () => buildIncomeExpenseByPeriod(allTransactions, timeframe, periodAnchorDate),
    [allTransactions, timeframe, periodAnchorDate]
  );
  const topSpendingCategories = useMemo(() => buildTopSpendingCategories(analysisTransactions), [analysisTransactions]);
  const expenseTrend = useMemo(
    () => buildExpenseTrendByPeriod(allTransactions, timeframe, periodAnchorDate),
    [allTransactions, timeframe, periodAnchorDate]
  );

  // What-if is always based on total net across all available transactions.
  const baseline = useMemo(() => {
    const income = allTransactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = allTransactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const categoryMap: Record<string, number> = {};
    allTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        categoryMap[t.category] = (categoryMap[t.category] ?? 0) + t.amount;
      });

    const topCategories = Object.entries(categoryMap)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 2);

    return { income, expense, topCategories };
  }, [allTransactions]);

  const [incomeChangePct, setIncomeChangePct] = useState(0);
  const [categoryChangePct, setCategoryChangePct] = useState<Record<string, number>>({});

  useEffect(() => {
    setCategoryChangePct((prev) => {
      const next: Record<string, number> = {};
      baseline.topCategories.forEach((c) => {
        next[c.name] = prev[c.name] ?? 0;
      });
      return next;
    });
  }, [baseline.topCategories]);

  const simulated = useMemo(() => {
    const simulatedIncome = baseline.income * (1 + incomeChangePct / 100);
    const originalTopExpenseTotal = baseline.topCategories.reduce((sum, c) => sum + c.amount, 0);
    const adjustedTopExpenseTotal = baseline.topCategories.reduce((sum, c) => {
      const pct = categoryChangePct[c.name] ?? 0;
      return sum + c.amount * (1 + pct / 100);
    }, 0);
    const simulatedExpense = baseline.expense - originalTopExpenseTotal + adjustedTopExpenseTotal;
    return { income: simulatedIncome, expense: simulatedExpense, net: simulatedIncome - simulatedExpense };
  }, [baseline, incomeChangePct, categoryChangePct]);

  const currentNet = baseline.income - baseline.expense;
  const comparisonData = useMemo(
    () => ({
      labels: ['Current', 'Simulated'],
      datasets: [
        { label: 'Income', data: [baseline.income, simulated.income], backgroundColor: MUTED_INCOME },
        { label: 'Expense', data: [baseline.expense, simulated.expense], backgroundColor: MUTED_EXPENSE },
        { label: 'Net', data: [currentNet, simulated.net], backgroundColor: MUTED_PRIMARY },
      ],
    }),
    [baseline.income, baseline.expense, simulated.income, simulated.expense, simulated.net, currentNet]
  );

  const adjustIncomeControl = (delta: number) => setIncomeChangePct((v) => clamp(v + delta, MIN_CONTROL, MAX_CONTROL));
  const adjustCategoryControl = (category: string, delta: number) => {
    setCategoryChangePct((prev) => ({ ...prev, [category]: clamp((prev[category] ?? 0) + delta, MIN_CONTROL, MAX_CONTROL) }));
  };
  const resetSimulator = () => {
    setIncomeChangePct(0);
    setCategoryChangePct(Object.fromEntries(baseline.topCategories.map((c) => [c.name, 0])));
  };

  const canGoPrevWeek = timeframe === 'weekly' && selectedWeekIndex > 0;
  const canGoNextWeek = timeframe === 'weekly' && selectedWeekIndex < availableWeekKeys.length - 1;
  const currentWeekLabel =
    timeframe === 'weekly' && availableWeekKeys.length > 0 ? availableWeekKeys[selectedWeekIndex] : '';

  const renderChartHeader = (title: string) => (
    <View style={styles.chartHeaderRow}>
      <Text style={styles.chartTitle}>{title}</Text>
      {timeframe === 'weekly' && (
        <View style={styles.weekNav}>
          <TouchableOpacity
            style={[styles.weekNavBtn, !canGoPrevWeek && styles.weekNavDisabled]}
            onPress={() => canGoPrevWeek && setSelectedWeekIndex((i) => i - 1)}
            disabled={!canGoPrevWeek}
          >
            <Text style={styles.weekNavText}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.weekLabel}>{currentWeekLabel}</Text>
          <TouchableOpacity
            style={[styles.weekNavBtn, !canGoNextWeek && styles.weekNavDisabled]}
            onPress={() => canGoNextWeek && setSelectedWeekIndex((i) => i + 1)}
            disabled={!canGoNextWeek}
          >
            <Text style={styles.weekNavText}>{'>'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const handleGenerateReport = () => {
    navigation.navigate('ReportPreview', {
      transactions: allTransactions,
      selectedMonthKey: toMonthKey(new Date()),
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.highlight} />}
      >
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleGenerateReport}
              style={[styles.reportHeaderButton, !hasData && styles.reportHeaderButtonDisabled]}
              disabled={!hasData}
            >
              <Text style={styles.reportHeaderButtonText}>Report</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>Analytics</Text>
        </View>

        <View style={styles.toggleWrap}>
          {TIMEFRAME_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.toggleBtn, timeframe === option.value && styles.toggleBtnActive]}
              onPress={() => setTimeframe(option.value)}
            >
              <Text style={[styles.toggleText, timeframe === option.value && styles.toggleTextActive]}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading && (
          <View style={styles.stateCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.stateText}>Loading analytics...</Text>
          </View>
        )}

        {!loading && error && (
          <View style={styles.stateCard}>
            <Text style={styles.stateText}>{error}</Text>
          </View>
        )}

        {!loading && !error && !hasData && (
          <View style={styles.stateCard}>
            <Text style={styles.stateText}>No transactions available yet.</Text>
          </View>
        )}

        {!loading && !error && hasData && (
          <>
            <View style={styles.chartCard}>
              <View style={styles.simulatorHeader}>
                <Text style={styles.chartTitle}>What-if Simulator</Text>
                <TouchableOpacity onPress={resetSimulator} style={styles.resetButton}>
                  <Text style={styles.resetText}>Reset</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.metricText}>Current Net: ₹{formatCurrency(currentNet)}</Text>
              <Text style={[styles.metricText, { color: simulated.net >= currentNet ? colors.income : colors.expense }]}>
                Simulated Net: ₹{formatCurrency(simulated.net)}
              </Text>
              <Text style={styles.metricDelta}>
                Change: {simulated.net - currentNet >= 0 ? '+₹' : '-₹'}{formatCurrency(Math.abs(simulated.net - currentNet))}
              </Text>

              <View style={styles.controlBlock}>
                <Text style={styles.controlLabel}>Income Change ({incomeChangePct > 0 ? '+' : ''}{incomeChangePct}%)</Text>
                <View style={styles.controlRow}>
                  <TouchableOpacity style={styles.controlButton} onPress={() => adjustIncomeControl(-CONTROL_STEP)}>
                    <Text style={styles.controlButtonText}>-</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.controlButton} onPress={() => adjustIncomeControl(CONTROL_STEP)}>
                    <Text style={styles.controlButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {baseline.topCategories.map((category) => {
                const value = categoryChangePct[category.name] ?? 0;
                return (
                  <View style={styles.controlBlock} key={category.name}>
                    <Text style={styles.controlLabel}>
                      {category.name} ({value > 0 ? '+' : '-'}{Math.abs(value)}% expense)
                    </Text>
                    <View style={styles.controlRow}>
                      <TouchableOpacity style={styles.controlButton} onPress={() => adjustCategoryControl(category.name, -CONTROL_STEP)}>
                        <Text style={styles.controlButtonText}>-</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.controlButton} onPress={() => adjustCategoryControl(category.name, CONTROL_STEP)}>
                        <Text style={styles.controlButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}

              <ChartWebView chartType="bar" data={comparisonData} height={240} />
            </View>

            <View style={styles.chartCard}>
              {renderChartHeader(`Income vs Expense (${TIMEFRAME_OPTIONS.find((t) => t.value === timeframe)?.label})`)}
              <ChartWebView chartType="bar" data={incomeVsExpense} height={260} />
            </View>

            <View style={styles.chartCard}>
              {renderChartHeader(`Top 5 Spending Categories (${TIMEFRAME_OPTIONS.find((t) => t.value === timeframe)?.label})`)}
              <ChartWebView chartType="bar" data={topSpendingCategories} height={260} />
            </View>

            <View style={styles.chartCard}>
              {renderChartHeader(`Expense Trend (${TIMEFRAME_OPTIONS.find((t) => t.value === timeframe)?.label})`)}
              <ChartWebView chartType="line" data={expenseTrend} height={260} />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 30 },
  header: { marginBottom: 14 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginBottom: 8,
  },
  backText: { color: colors.white, fontSize: 14, fontWeight: '600' },
  reportHeaderButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  reportHeaderButtonDisabled: {
    opacity: 0.45,
  },
  reportHeaderButtonText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  title: { color: colors.white, fontSize: 28, fontWeight: 'bold' },
  toggleWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  toggleBtn: {
    borderWidth: 1,
    borderColor: colors.highlight,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colors.surface,
  },
  toggleBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleText: { color: colors.light, fontSize: 13, fontWeight: '600' },
  toggleTextActive: { color: colors.white },
  stateCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    alignItems: 'center',
    gap: 8,
  },
  stateText: { color: colors.light, fontSize: 14 },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(204, 198, 225, 0.14)',
  },
  chartHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  chartTitle: { color: colors.white, fontSize: 16, fontWeight: '700', flexShrink: 1, paddingRight: 8 },
  weekNav: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8, flexShrink: 0 },
  weekNavBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(101, 78, 176, 0.35)',
  },
  weekNavDisabled: { opacity: 0.35 },
  weekNavText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  weekLabel: { color: colors.light, fontSize: 12, width: 82, textAlign: 'center' },
  simulatorHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resetButton: { borderWidth: 1, borderColor: colors.light, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  resetText: { color: colors.light, fontWeight: '700', fontSize: 12 },
  metricText: { color: colors.white, fontSize: 15, marginBottom: 3 },
  metricDelta: { color: colors.light, fontSize: 13, marginBottom: 8 },
  controlBlock: {
    borderWidth: 1,
    borderColor: colors.highlight,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    backgroundColor: colors.background,
  },
  controlLabel: { color: colors.white, fontSize: 14, marginBottom: 8, fontWeight: '600' },
  controlRow: { flexDirection: 'row', gap: 10 },
  controlButton: {
    width: 38,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(101, 78, 176, 0.38)',
  },
  controlButtonText: { color: colors.white, fontSize: 20, fontWeight: '700', lineHeight: 22 },
});
