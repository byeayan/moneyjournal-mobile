import DropdownField from '@/components/common/DropdownField';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { toMonthKey, useBudgetStore } from '@/store/budgetStore';
import { useTransactionStore } from '@/store/transactionStore';
import type { Transaction } from '@/types/transaction';
import { expenseCategories } from '@/utils/categories';
import colors from '@/utils/colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type BudgetCard = {
  id: string;
  name: string;
  spent: number;
  planned: number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor: string;
  iconBackground: string;
};

type BudgetNavigationProp = NativeStackNavigationProp<RootStackParamList>;

function formatCurrency(value: number) {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function titleCase(value: string) {
  if (!value.trim()) return 'Other';
  return value
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function getCategoryVisuals(name: string) {
  const key = name.trim().toLowerCase();
  if (['food', 'dining', 'restaurant', 'groceries'].includes(key)) {
    return { icon: 'silverware-fork-knife' as const, iconColor: '#F97316', iconBackground: '#FFF1DE' };
  }
  if (['transport', 'travel', 'fuel', 'gas'].includes(key)) {
    return { icon: 'car-outline' as const, iconColor: '#3B82F6', iconBackground: '#EAF2FF' };
  }
  if (['entertainment', 'movies', 'fun'].includes(key)) {
    return { icon: 'movie-open-outline' as const, iconColor: '#A855F7', iconBackground: '#F4E8FF' };
  }
  if (['bills', 'utilities', 'rent', 'emi'].includes(key)) {
    return { icon: 'cash-multiple' as const, iconColor: '#EF4444', iconBackground: '#FFE8E8' };
  }
  if (['shopping', 'clothes', 'lifestyle'].includes(key)) {
    return { icon: 'shopping-outline' as const, iconColor: '#22C55E', iconBackground: '#E6FAF0' };
  }
  return { icon: 'dots-horizontal' as const, iconColor: '#9CA3AF', iconBackground: '#F1F5F9' };
}

function getStatus(totalBudget: number, spentRatio: number) {
  if (totalBudget <= 0) {
    return {
      label: 'Budget Not Set',
      color: '#475569',
      background: '#E2E8F0',
      icon: 'information-circle-outline' as const,
    };
  }
  if (spentRatio >= 1) return { label: 'Over Budget', color: '#DC2626', background: '#FEE2E2', icon: 'alert-circle-outline' as const };
  if (spentRatio >= 0.8) return { label: 'Near Limit', color: '#C2410C', background: '#FFEDD5', icon: 'warning-outline' as const };
  return { label: 'On Track', color: '#047857', background: '#D1FAE5', icon: 'checkmark-circle-outline' as const };
}

export default function BudgetScreen() {
  const navigation = useNavigation<BudgetNavigationProp>();
  const now = useMemo(() => new Date(), []);
  const currentMonthStart = useMemo(() => new Date(now.getFullYear(), now.getMonth(), 1), [now]);

  const [selectedMonth, setSelectedMonth] = useState(currentMonthStart);
  const [setBudgetVisible, setSetBudgetVisible] = useState(false);
  const [setTotalVisible, setSetTotalVisible] = useState(false);
  const [budgetCategory, setBudgetCategory] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [monthlyTotalAmount, setMonthlyTotalAmount] = useState('');

  const budgets = useBudgetStore((state) => state.budgets);
  const monthlyTotals = useBudgetStore((state) => state.monthlyTotals);
  const isBudgetHydrated = useBudgetStore((state) => state.isHydrated);
  const initializeBudgets = useBudgetStore((state) => state.initializeBudgets);
  const setBudgetLimit = useBudgetStore((state) => state.setBudgetLimit);
  const setMonthlyTotal = useBudgetStore((state) => state.setMonthlyTotal);

  const fetchTransactionsForMonth = useTransactionStore((state) => state.fetchTransactionsForMonth);
  const [monthTransactions, setMonthTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (!isBudgetHydrated) {
      void initializeBudgets();
    }
  }, [initializeBudgets, isBudgetHydrated]);

  useEffect(() => {
    let active = true;

    const loadMonthTransactions = async () => {
      try {
        const data = await fetchTransactionsForMonth(selectedMonth);
        if (!active) return;
        setMonthTransactions(data);
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : 'Failed to load monthly transactions.';
        Alert.alert('Error', message);
      }
    };

    void loadMonthTransactions();

    return () => {
      active = false;
    };
  }, [fetchTransactionsForMonth, selectedMonth]);

  const monthKey = toMonthKey(selectedMonth);
  const monthStart = useMemo(
    () => new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1),
    [selectedMonth]
  );
  const monthEnd = useMemo(
    () => new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0),
    [selectedMonth]
  );

  const expenseTransactions = useMemo(
    () => monthTransactions.filter((transaction) => transaction.type === 'expense'),
    [monthTransactions]
  );

  const monthBudgets = useMemo(
    () => budgets.filter((item) => item.month === monthKey),
    [budgets, monthKey]
  );

  const spentByCategory = useMemo(() => {
    const grouped = new Map<string, number>();
    expenseTransactions.forEach((transaction) => {
      const category = titleCase(transaction.category || 'Other');
      grouped.set(category, (grouped.get(category) ?? 0) + Number(transaction.amount || 0));
    });
    return grouped;
  }, [expenseTransactions]);

  const plannedByCategory = useMemo(() => {
    const grouped = new Map<string, number>();
    monthBudgets.forEach((budget) => {
      const category = titleCase(budget.category || 'Other');
      grouped.set(category, Number(budget.amount || 0));
    });
    return grouped;
  }, [monthBudgets]);

  const cards = useMemo<BudgetCard[]>(() => {
    const names = new Set<string>([
      ...Array.from(plannedByCategory.keys()),
      ...Array.from(spentByCategory.keys()),
    ]);

    if (names.size === 0) {
      expenseCategories.forEach((name) => names.add(titleCase(name)));
    }

    return Array.from(names)
      .map((name) => {
        const visuals = getCategoryVisuals(name);
        return {
          id: name.toLowerCase().replace(/\s+/g, '-'),
          name,
          spent: spentByCategory.get(name) ?? 0,
          planned: plannedByCategory.get(name) ?? 0,
          ...visuals,
        };
      })
      .sort((a, b) => b.spent - a.spent || b.planned - a.planned);
  }, [plannedByCategory, spentByCategory]);

  const categoryTotalBudget = useMemo(
    () => cards.reduce((sum, category) => sum + category.planned, 0),
    [cards]
  );
  const explicitMonthlyTotal = monthlyTotals[monthKey] ?? 0;
  const totalBudget = explicitMonthlyTotal > 0 ? explicitMonthlyTotal : categoryTotalBudget;
  const totalSpent = useMemo(
    () => cards.reduce((sum, category) => sum + category.spent, 0),
    [cards]
  );
  const spentRatio = totalBudget > 0 ? totalSpent / totalBudget : 0;
  const left = totalBudget - totalSpent;
  const status = getStatus(totalBudget, spentRatio);

  const monthLabel = selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const canGoNextMonth = selectedMonth < currentMonthStart;
  const categoryOptions = useMemo(() => {
    const dynamic = cards.map((item) => item.name);
    return Array.from(new Set([...expenseCategories.map(titleCase), ...dynamic]));
  }, [cards]);

  const handleShiftMonth = (delta: number) => {
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const handleSeeAll = () => {
    navigation.navigate('DailyTransaction', {
      date: monthStart.toISOString(),
      transactions: expenseTransactions,
      showAll: true,
      title: `${monthLabel} Expenses`,
    });
  };

  const handleOpenCategory = (categoryName: string) => {
    const filtered = expenseTransactions.filter(
      (transaction) => titleCase(transaction.category || 'Other') === categoryName
    );

    navigation.navigate('DailyTransaction', {
      date: monthStart.toISOString(),
      transactions: filtered,
      showAll: true,
      title: `${categoryName} - ${monthLabel}`,
    });
  };

  const openCategoryBudgetModal = (categoryName: string, plannedAmount: number) => {
    setBudgetCategory(categoryName);
    setBudgetAmount(plannedAmount > 0 ? String(plannedAmount) : '');
    setSetBudgetVisible(true);
  };
  const openTotalModal = () => {
    setMonthlyTotalAmount(explicitMonthlyTotal > 0 ? String(explicitMonthlyTotal) : '');
    setSetTotalVisible(true);
  };

  const handleSaveBudget = async () => {
    const parsed = Number(budgetAmount);
    if (!budgetCategory.trim()) {
      Alert.alert('Validation', 'Category is required.');
      return;
    }
    if (!Number.isFinite(parsed) || parsed <= 0) {
      Alert.alert('Validation', 'Budget amount must be greater than 0.');
      return;
    }

    await setBudgetLimit(monthKey, budgetCategory, parsed);
    setSetBudgetVisible(false);
  };
  const handleSaveTotalBudget = async () => {
    const parsed = Number(monthlyTotalAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      Alert.alert('Validation', 'Total budget amount must be greater than 0.');
      return;
    }
    await setMonthlyTotal(monthKey, parsed);
    setSetTotalVisible(false);
  };

  const segmentBase = totalBudget > 0 ? totalBudget : totalSpent;
  const segmentData = cards.filter((item) => item.spent > 0 && segmentBase > 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.monthRow}>
            <TouchableOpacity style={styles.monthButton} onPress={() => handleShiftMonth(-1)}>
              <Ionicons name="chevron-back" size={16} color={colors.white} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{monthLabel}</Text>
            <TouchableOpacity
              style={[styles.monthButton, !canGoNextMonth && styles.monthButtonDisabled]}
              onPress={() => handleShiftMonth(1)}
              disabled={!canGoNextMonth}
            >
              <Ionicons name="chevron-forward" size={16} color={colors.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryBlock}>
              <View style={styles.summaryTitleRow}>
                <View style={styles.summaryLabelRow}>
                  <Text style={styles.summaryLabel}>TOTAL BUDGET</Text>
                  <TouchableOpacity style={styles.iconOnlyButton} onPress={openTotalModal}>
                    <Ionicons name="pencil-outline" size={12} color={colors.light} />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.summaryValue}>
                ₹{formatCurrency(totalBudget)}
                <Text style={styles.perMonth}> / mo</Text>
              </Text>
            </View>
            <View style={styles.summaryBlockRight}>
              <Text style={styles.summaryLabel}>SPENT</Text>
              <Text style={styles.summaryValue}>₹{formatCurrency(totalSpent)}</Text>
              <Text style={[styles.leftText, left < 0 ? styles.leftNegative : styles.leftPositive]}>
                {totalBudget <= 0
                  ? 'Set budget to track left'
                  : left < 0
                    ? `₹${formatCurrency(Math.abs(left))} over`
                    : `₹${formatCurrency(left)} left`}
              </Text>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: status.background }]}>
            <Ionicons name={status.icon} size={14} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>

          <View style={styles.segmentBar}>
            {segmentData.map((category, index) => {
              const width = `${Math.max((category.spent / segmentBase) * 100, 4)}%` as `${number}%`;
              return (
                <View
                  key={category.id}
                  style={[
                    styles.segment,
                    {
                      width,
                      backgroundColor: category.iconColor,
                      borderTopLeftRadius: index === 0 ? 14 : 0,
                      borderBottomLeftRadius: index === 0 ? 14 : 0,
                    },
                  ]}
                />
              );
            })}
          </View>

          <View style={styles.dateRow}>
            <Text style={styles.datePill}>{monthStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
            <View style={styles.dateLine} />
            <Text style={styles.datePill}>{monthEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
          </View>

          <View style={styles.breakdownHeader}>
            <Text style={styles.breakdownTitle}>Breakdown</Text>
            <TouchableOpacity onPress={handleSeeAll}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cardsWrap}>
            {cards.map((category) => {
              const cardRatio = category.planned > 0 ? category.spent / category.planned : 0;
              const progressWidth = `${Math.min(Math.max(cardRatio * 100, 0), 100)}%` as `${number}%`;

              return (
                <TouchableOpacity key={category.id} style={styles.card} onPress={() => handleOpenCategory(category.name)}>
                  <View style={[styles.iconBox, { backgroundColor: category.iconBackground }]}>
                    <MaterialCommunityIcons name={category.icon} size={20} color={category.iconColor} />
                  </View>

                  <View style={styles.cardMain}>
                    <View style={styles.cardTop}>
                      <Text style={styles.cardTitle}>{category.name}</Text>
                      <View style={styles.cardTopRight}>
                        <TouchableOpacity
                          style={styles.cardEditButton}
                          onPress={() => openCategoryBudgetModal(category.name, category.planned)}
                        >
                          <Text style={styles.cardEditText}>Edit Budget</Text>
                        </TouchableOpacity>
                        <Text style={styles.cardAmount}>₹{formatCurrency(category.spent)}</Text>
                      </View>
                    </View>

                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: progressWidth, backgroundColor: category.iconColor }]} />
                    </View>

                    <Text style={styles.percentText}>
                      {category.planned > 0
                        ? `${(cardRatio * 100).toFixed(1)}% of ₹${formatCurrency(category.planned)}`
                        : `No budget set`}
                    </Text>
                  </View>

                  <Ionicons name="chevron-forward" size={16} color={colors.light} />
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <Modal visible={setBudgetVisible} transparent animationType="fade" onRequestClose={() => setSetBudgetVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Set Monthly Budget</Text>
              <TouchableOpacity onPress={() => setSetBudgetVisible(false)}>
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubTitle}>{monthLabel}</Text>

            <DropdownField
              label="Category"
              value={budgetCategory}
              options={categoryOptions}
              onSelect={setBudgetCategory}
            />

            <Text style={styles.inputLabel}>Budget Amount</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter amount"
              placeholderTextColor={colors.light}
              keyboardType="decimal-pad"
              value={budgetAmount}
              onChangeText={setBudgetAmount}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSetBudgetVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveBudget}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={setTotalVisible} transparent animationType="fade" onRequestClose={() => setSetTotalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Set Total Budget</Text>
              <TouchableOpacity onPress={() => setSetTotalVisible(false)}>
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubTitle}>{monthLabel}</Text>

            <Text style={styles.inputLabel}>Total Amount</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter total monthly budget"
              placeholderTextColor={colors.light}
              keyboardType="decimal-pad"
              value={monthlyTotalAmount}
              onChangeText={setMonthlyTotalAmount}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSetTotalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveTotalBudget}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 96,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  monthButtonDisabled: {
    opacity: 0.35,
  },
  monthLabel: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 4,
  },
  summaryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconOnlyButton: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryBlock: {
    flex: 1,
    marginRight: 12,
  },
  summaryBlockRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  summaryLabel: {
    fontSize: 12,
    letterSpacing: 1,
    color: colors.light,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.white,
  },
  perMonth: {
    fontSize: 14,
    color: colors.light,
    fontWeight: '600',
  },
  leftText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  leftPositive: {
    color: '#059669',
  },
  leftNegative: {
    color: '#DC2626',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
    marginBottom: 14,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  segmentBar: {
    height: 32,
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginBottom: 12,
  },
  segment: {
    height: '100%',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  datePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.surface,
    fontSize: 12,
    color: colors.light,
    fontWeight: '600',
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.highlight,
    marginHorizontal: 10,
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  breakdownTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.white,
  },
  seeAll: {
    fontSize: 14,
    color: colors.highlight,
    fontWeight: '700',
  },
  cardsWrap: {
    gap: 10,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.highlight,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardMain: {
    flex: 1,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  cardTopRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  cardEditButton: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.highlight,
    backgroundColor: colors.background,
  },
  cardEditText: {
    color: colors.light,
    fontSize: 10,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.white,
  },
  cardAmount: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.white,
  },
  progressTrack: {
    height: 6,
    borderRadius: 99,
    backgroundColor: colors.background,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
  },
  percentText: {
    fontSize: 12,
    color: colors.light,
    fontWeight: '600',
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
  modalTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalCloseText: {
    color: colors.light,
    fontSize: 13,
    fontWeight: '700',
  },
  modalSubTitle: {
    color: colors.light,
    fontSize: 13,
    marginBottom: 4,
  },
  inputLabel: {
    color: colors.light,
    marginBottom: 4,
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.highlight,
    borderRadius: 8,
    color: colors.white,
    paddingHorizontal: 10,
    height: 42,
    marginTop: 6,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: colors.light,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelBtnText: {
    color: colors.light,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  saveBtnText: {
    color: colors.white,
    fontWeight: '700',
  },
});
