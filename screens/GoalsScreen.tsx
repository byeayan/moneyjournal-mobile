import type { RootStackParamList } from '@/navigation/AppNavigator';
import { useGoalsStore } from '@/store/goalsStore';
import type { LiabilityType } from '@/types/goal';
import DropdownField from '@/components/common/DropdownField';
import colors from '@/utils/colors';
import { subscribeTabDoublePress } from '@/utils/tabDoublePressBus';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import Svg, { Circle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

function formatCurrency(value: number) {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function toMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
function addMonthKey(monthKey: string, delta: number) {
  const [year, month] = monthKey.split('-').map(Number);
  const d = new Date((year || 1970), (month || 1) - 1 + delta, 1);
  return toMonthKey(d);
}
function monthKeyToDisplayDate(monthKey: string, dayOfMonth: number) {
  const [year, month] = monthKey.split('-').map(Number);
  const safeYear = year || new Date().getFullYear();
  const safeMonth = (month || 1) - 1;
  const monthEndDay = new Date(safeYear, safeMonth + 1, 0).getDate();
  const safeDay = Math.max(1, Math.min(dayOfMonth, monthEndDay));
  const d = new Date(safeYear, safeMonth, safeDay);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function monthKeyToDate(monthKey: string, dayOfMonth: number) {
  const [year, month] = monthKey.split('-').map(Number);
  const safeYear = year || new Date().getFullYear();
  const safeMonth = (month || 1) - 1;
  const monthEndDay = new Date(safeYear, safeMonth + 1, 0).getDate();
  const safeDay = Math.max(1, Math.min(dayOfMonth, monthEndDay));
  return new Date(safeYear, safeMonth, safeDay);
}
function toDateGroupKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
function toDateGroupHeader(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month, day);
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;
  if (dateKey === todayKey) return 'Today';
  if (dateKey === yesterdayKey) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const LIABILITY_TYPE_OPTIONS = ['Debt', 'EMI'] as const;

function toLiabilityType(label: string): LiabilityType {
  const key = label.trim().toLowerCase();
  if (key === 'emi') return 'emi';
  return 'debt';
}

function toLiabilityTypeLabel(type: LiabilityType): string {
  if (type === 'emi') return 'EMI';
  return 'Debt';
}

export default function GoalsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();  const showGoalsSection = true;
  const showLiabilitySection = false;
  const {
    goals,
    liabilities,
    goalEntries,
    liabilityPayments,
    isHydrated,
    initializeGoals,
    addGoal,
    deleteGoal,
    addSavingsToGoal,
    withdrawSavingsFromGoal,
    deleteGoalEntry,
    addLiability,
    deleteLiability,
    makeLiabilityPayment,
    deleteLiabilityPayment,
    getRentDueForMonth,
    getEmiDueForMonth,
    refreshGoals,
  } = useGoalsStore();

  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [liabilityModalVisible, setLiabilityModalVisible] = useState(false);
  const [rentModalVisible, setRentModalVisible] = useState(false);
  const [savingsModalVisible, setSavingsModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);

  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalSaved, setGoalSaved] = useState('');

  const [liabilityTitle, setLiabilityTitle] = useState('');
  const [liabilityTotal, setLiabilityTotal] = useState('');
  const [liabilityRemaining, setLiabilityRemaining] = useState('');
  const [liabilityMonthly, setLiabilityMonthly] = useState('');
  const [liabilityType, setLiabilityType] = useState<LiabilityType>('debt');
  const [rentTitle, setRentTitle] = useState('');
  const [rentMonthly, setRentMonthly] = useState('');

  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [savingsAmount, setSavingsAmount] = useState('');
  const [savingsMode, setSavingsMode] = useState<'add' | 'withdraw'>('add');

  const [selectedLiabilityId, setSelectedLiabilityId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMonthKey, setPaymentMonthKey] = useState(toMonthKey());
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyType, setHistoryType] = useState<'savings' | 'liability'>('savings');
  const [showAllGoalEntries, setShowAllGoalEntries] = useState(false);
  const [dismissedRecentGoalEntryIds, setDismissedRecentGoalEntryIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: '',
  });
  const [refreshing, setRefreshing] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: null | (() => Promise<void> | void);
  }>({
    visible: false,
    title: '',
    message: '',
    onConfirm: null,
  });
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    if (!isHydrated) {
      void initializeGoals();
    }
  }, [initializeGoals, isHydrated]);

  useEffect(() => {
    if (liabilityType === 'debt') {
      setLiabilityMonthly('');
      return;
    }
  }, [liabilityType]);

  const totalSaved = useMemo(() => goals.reduce((sum, item) => sum + item.savedAmount, 0), [goals]);
  const totalTarget = useMemo(() => goals.reduce((sum, item) => sum + item.targetAmount, 0), [goals]);
  const monthKey = useMemo(() => toMonthKey(), []);
  const currentMonthKey = useMemo(() => toMonthKey(), []);
  const totalLiabilityRemaining = useMemo(() => {
    return liabilities.reduce((sum, item) => {
      if (item.type !== 'rent') return sum + item.remainingAmount;
      return sum + getRentDueForMonth(item.id, monthKey);
    }, 0);
  }, [getRentDueForMonth, liabilities, monthKey]);
  const totalLiabilityMonthly = useMemo(
    () => liabilities.reduce((sum, item) => (item.type === 'debt' ? sum : sum + item.monthlyPayment), 0),
    [liabilities]
  );
  const liabilityPrincipalTotal = useMemo(
    () => liabilities.filter((item) => item.type !== 'rent').reduce((sum, item) => sum + item.totalAmount, 0),
    [liabilities]
  );
  const liabilityRemainingPrincipal = useMemo(
    () => liabilities.filter((item) => item.type !== 'rent').reduce((sum, item) => sum + item.remainingAmount, 0),
    [liabilities]
  );
  const rentTotalMonthly = useMemo(
    () => liabilities.filter((item) => item.type === 'rent').reduce((sum, item) => sum + item.monthlyPayment, 0),
    [liabilities]
  );
  const rentCurrentDueTotal = useMemo(
    () =>
      liabilities
        .filter((item) => item.type === 'rent')
        .reduce((sum, item) => sum + getRentDueForMonth(item.id, monthKey), 0),
    [getRentDueForMonth, liabilities, monthKey]
  );
  const liabilityPaidValue = useMemo(() => {
    const principalPaid = Math.max(liabilityPrincipalTotal - liabilityRemainingPrincipal, 0);
    const rentPaidThisMonth = Math.max(rentTotalMonthly - rentCurrentDueTotal, 0);
    return principalPaid + rentPaidThisMonth;
  }, [liabilityPrincipalTotal, liabilityRemainingPrincipal, rentTotalMonthly, rentCurrentDueTotal]);
  const liabilityTotalReference = useMemo(
    () => liabilityPrincipalTotal + rentTotalMonthly,
    [liabilityPrincipalTotal, rentTotalMonthly]
  );
  const liabilityProgressPct = useMemo(
    () => (liabilityTotalReference > 0 ? Math.round((liabilityPaidValue / liabilityTotalReference) * 100) : 0),
    [liabilityPaidValue, liabilityTotalReference]
  );
  const activeLiabilityCount = useMemo(
    () => liabilities.filter((item) => item.type !== 'rent' && item.remainingAmount > 0).length,
    [liabilities]
  );
  const clearedLiabilityCount = useMemo(
    () =>
      liabilities.filter((item) =>
        item.type === 'rent' ? getRentDueForMonth(item.id, monthKey) <= 0 : item.remainingAmount <= 0
      ).length,
    [getRentDueForMonth, liabilities, monthKey]
  );
  const activeLiabilities = useMemo(
    () => liabilities.filter((item) => item.type !== 'rent' && item.remainingAmount > 0),
    [liabilities]
  );
  const activeRent = useMemo(() => liabilities.find((item) => item.type === 'rent') ?? null, [liabilities]);

  const netWorth = totalSaved - totalLiabilityRemaining;
  const progressPct = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  const activeGoals = useMemo(() => goals.filter((item) => item.status === 'active'), [goals]);
  const completedGoals = useMemo(() => goals.filter((item) => item.status === 'completed'), [goals]);

  const assetsPct = totalSaved + totalLiabilityRemaining > 0 ? (totalSaved / (totalSaved + totalLiabilityRemaining)) * 100 : 0;
  const savingRingSize = 190;
  const savingRingStroke = 12;
  const savingRingRadius = (savingRingSize - savingRingStroke) / 2;
  const savingRingCircumference = 2 * Math.PI * savingRingRadius;
  const savingRingProgress = Math.max(0, Math.min(progressPct, 100));
  const savingRingOffset = savingRingCircumference * (1 - savingRingProgress / 100);

  const openAddSavings = (goalId: string) => {
    setSelectedGoalId(goalId);
    setSavingsAmount('');
    setSavingsMode('add');
    setSavingsModalVisible(true);
  };

  const openLiabilityPayment = (liabilityId: string) => {
    setSelectedLiabilityId(liabilityId);
    setPaymentMonthKey(toMonthKey());
    setPaymentAmount('');
    setPaymentModalVisible(true);
  };

  const selectedGoal = useMemo(
    () => goals.find((item) => item.id === selectedGoalId) ?? null,
    [goals, selectedGoalId]
  );
  const selectedLiability = useMemo(
    () => liabilities.find((item) => item.id === selectedLiabilityId) ?? null,
    [liabilities, selectedLiabilityId]
  );
  const emiMonthOptions = useMemo(() => {
    if (!selectedLiability || selectedLiability.type !== 'emi' || selectedLiability.monthlyPayment <= 0) {
      return [];
    }
    const nextMonthKey = addMonthKey(currentMonthKey, 1);
    const options = [currentMonthKey, nextMonthKey];
    return Array.from(new Set(options));
  }, [currentMonthKey, selectedLiability]);

  const nextPayableEmiMonth = useMemo(() => {
    if (!selectedLiability || selectedLiability.type !== 'emi') return null;
    const currentDue = getEmiDueForMonth(selectedLiability.id, currentMonthKey);
    if (currentDue > 0) return currentMonthKey;
    const nextMonth = addMonthKey(currentMonthKey, 1);
    const nextDue = getEmiDueForMonth(selectedLiability.id, nextMonth);
    return nextDue > 0 ? nextMonth : null;
  }, [getEmiDueForMonth, selectedLiability]);
  const selectedEmiDue = useMemo(() => {
    if (!selectedLiability || selectedLiability.type !== 'emi') return 0;
    return getEmiDueForMonth(selectedLiability.id, paymentMonthKey);
  }, [getEmiDueForMonth, paymentMonthKey, selectedLiability]);
  const selectedRentMonthKey = useMemo(() => {
    if (!selectedLiability || selectedLiability.type !== 'rent') return currentMonthKey;
    for (let i = 0; i < 120; i += 1) {
      const candidate = addMonthKey(currentMonthKey, i);
      if (getRentDueForMonth(selectedLiability.id, candidate) > 0) {
        return candidate;
      }
    }
    return currentMonthKey;
  }, [currentMonthKey, getRentDueForMonth, selectedLiability]);
  const selectedRentDue = useMemo(() => {
    if (!selectedLiability || selectedLiability.type !== 'rent') return 0;
    return getRentDueForMonth(selectedLiability.id, selectedRentMonthKey);
  }, [getRentDueForMonth, selectedLiability, selectedRentMonthKey]);
  const activeRentDueMonthKey = useMemo(() => {
    if (!activeRent) return currentMonthKey;
    for (let i = 0; i < 120; i += 1) {
      const candidate = addMonthKey(currentMonthKey, i);
      if (getRentDueForMonth(activeRent.id, candidate) > 0) {
        return candidate;
      }
    }
    return currentMonthKey;
  }, [activeRent, currentMonthKey, getRentDueForMonth]);
  const activeRentDueAmount = useMemo(
    () => (activeRent ? getRentDueForMonth(activeRent.id, activeRentDueMonthKey) : 0),
    [activeRent, activeRentDueMonthKey, getRentDueForMonth]
  );
  const activeRentDueDate = useMemo(() => {
    if (!activeRent) return '';
    const dueDay = Math.min(Math.max(new Date(activeRent.createdAt).getDate(), 1), 28);
    return monthKeyToDisplayDate(activeRentDueMonthKey, dueDay);
  }, [activeRent, activeRentDueMonthKey]);
  const shouldShowRentPaymentCard = useMemo(() => {
    if (!activeRent || activeRentDueAmount <= 0) return false;
    const dueDay = Math.min(Math.max(new Date(activeRent.createdAt).getDate(), 1), 28);
    const dueDate = monthKeyToDate(activeRentDueMonthKey, dueDay);
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dueDateStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    return todayStart.getTime() >= dueDateStart.getTime();
  }, [activeRent, activeRentDueAmount, activeRentDueMonthKey]);
  const liabilityTotalNumber = Number(liabilityTotal);
  const liabilityMonthlyNumber = Number(liabilityMonthly);
  const estimatedEmiMonths =
    liabilityType === 'emi' &&
    Number.isFinite(liabilityTotalNumber) &&
    liabilityTotalNumber > 0 &&
    Number.isFinite(liabilityMonthlyNumber) &&
    liabilityMonthlyNumber > 0
      ? Math.ceil(liabilityTotalNumber / liabilityMonthlyNumber)
      : null;
  const enteredSavingsAmount = Number(savingsAmount);
  const selectedGoalRemaining = selectedGoal ? Math.max(selectedGoal.targetAmount - selectedGoal.savedAmount, 0) : 0;
  const projectedRemainingAfterAdd =
    selectedGoal && Number.isFinite(enteredSavingsAmount)
      ? Math.max(selectedGoalRemaining - Math.max(enteredSavingsAmount, 0), 0)
      : selectedGoalRemaining;
  const isSavingsAddExceeding =
    !!selectedGoal && Number.isFinite(enteredSavingsAmount) && enteredSavingsAmount > selectedGoalRemaining;
  const recentGoalEntries = useMemo(() => goalEntries.slice(0, 5), [goalEntries]);
  const goalEntryRows = useMemo(
    () =>
      [...goalEntries]
        .filter((entry) => !dismissedRecentGoalEntryIds.includes(entry.id))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((entry) => {
          const goal = goals.find((item) => item.id === entry.goalId);
          return {
            id: entry.id,
            title: goal?.title || 'Goal',
            kind: entry.kind,
            amount: entry.amount,
            createdAt: entry.createdAt,
          };
        }),
    [dismissedRecentGoalEntryIds, goalEntries, goals]
  );
  const displayedGoalRows = useMemo(
    () => (showAllGoalEntries ? goalEntryRows : goalEntryRows.slice(0, 3)),
    [goalEntryRows, showAllGoalEntries]
  );
  const groupedGoalRows = useMemo(() => {
    const groups: Record<string, typeof displayedGoalRows> = {};
    displayedGoalRows.forEach((row) => {
      const key = toDateGroupKey(row.createdAt);
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });
    return Object.keys(groups)
      .sort((a, b) => {
        const [ay, am, ad] = a.split('-').map(Number);
        const [by, bm, bd] = b.split('-').map(Number);
        return new Date(by, bm, bd).getTime() - new Date(ay, am, ad).getTime();
      })
      .map((key) => ({ key, header: toDateGroupHeader(key), items: groups[key] }));
  }, [displayedGoalRows]);
  const recentLiabilityPayments = useMemo(() => liabilityPayments.slice(0, 5), [liabilityPayments]);
  const showFeedback = (title: string, message: string) => setFeedback({ visible: true, title, message });
  const showToast = (message: string) => setToast({ visible: true, message });
  const openConfirm = (title: string, message: string, onConfirm: () => Promise<void> | void) =>
    setConfirmState({ visible: true, title, message, onConfirm });
  const closeConfirm = () =>
    setConfirmState((prev) => ({
      ...prev,
      visible: false,
      onConfirm: null,
    }));

  useEffect(() => {
    if (!selectedLiability) return;
    if (selectedLiability.type === 'emi' && emiMonthOptions.length > 0 && !emiMonthOptions.includes(paymentMonthKey)) {
      setPaymentMonthKey(currentMonthKey);
      return;
    }
    if (selectedLiability.type === 'rent') {
      setPaymentAmount(selectedRentDue > 0 ? String(selectedRentDue) : '');
      return;
    }
    if (selectedLiability.type === 'emi') {
      setPaymentAmount(selectedEmiDue > 0 ? String(selectedEmiDue) : '');
      return;
    }
    const suggested = selectedLiability.monthlyPayment > 0 ? selectedLiability.monthlyPayment : selectedLiability.remainingAmount;
    setPaymentAmount(String(Math.min(suggested, selectedLiability.remainingAmount)));
  }, [
    currentMonthKey,
    emiMonthOptions,
    monthKey,
    paymentMonthKey,
    selectedEmiDue,
    selectedLiability,
    selectedRentDue,
  ]);

  useEffect(() => {
    if (!toast.visible) return;
    const id = setTimeout(() => {
      setToast({ visible: false, message: '' });
    }, 2200);
    return () => clearTimeout(id);
  }, [toast.visible]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshGoals();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh goals.';
      Alert.alert('Error', message);
    } finally {
      setRefreshing(false);
    }
  }, [refreshGoals]);

  useEffect(() => {
    const tabName = 'GoalsTab';
    const unsubscribe = subscribeTabDoublePress(tabName, () => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
    return unsubscribe;
  }, []);

  if (!isHydrated) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.loaderWrap}>
            <ActivityIndicator color={colors.primary} />
          </View>
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.highlight} />}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{showGoalsSection ? 'Goals' : 'Liabilities'}</Text>
          {showGoalsSection ? (
            <TouchableOpacity style={styles.headerIconButton} onPress={() => setGoalModalVisible(true)}>
              <Ionicons name="add" size={18} color={colors.white} />
            </TouchableOpacity>
          ) : showLiabilitySection ? (
            <TouchableOpacity style={styles.headerIconButton} onPress={() => setLiabilityModalVisible(true)}>
              <Ionicons name="add" size={18} color={colors.white} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerIconButtonSpacer} />
          )}
        </View>

        {showGoalsSection && (
          <>
        <View style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <View style={styles.balanceIcon}>
              <Ionicons name="scale-outline" size={18} color="#159A7A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.balanceTitle}>Financial Balance</Text>
              <Text style={styles.balanceSub}>Net Worth: Rs {formatCurrency(netWorth)}</Text>
            </View>
          </View>

          <View style={styles.assetBarTrack}>
            <View style={[styles.assetBarFill, { width: `${Math.max(assetsPct, 3)}%` }]} />
            <View style={[styles.assetBarDebt, { width: `${100 - Math.max(assetsPct, 3)}%` }]} />
          </View>

          <View style={styles.balanceAmounts}>
            <View>
              <Text style={styles.assetLabel}>Assets (Savings)</Text>
              <Text style={styles.assetValue}>Rs {formatCurrency(totalSaved)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.debtLabel}>Liabilities (Debt/Rent)</Text>
              <Text style={styles.debtValue}>Rs {formatCurrency(totalLiabilityRemaining)}</Text>
              <Text style={styles.monthlyDebt}>Monthly: Rs {formatCurrency(totalLiabilityMonthly)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.ringCard}>
          <View style={styles.ringWrap}>
            <View style={styles.ringOuter}>
              <Svg width={savingRingSize} height={savingRingSize} style={styles.ringSvg}>
                <Circle
                  cx={savingRingSize / 2}
                  cy={savingRingSize / 2}
                  r={savingRingRadius}
                  stroke="rgba(216,223,238,0.28)"
                  strokeWidth={savingRingStroke}
                  fill="transparent"
                />
                <Circle
                  cx={savingRingSize / 2}
                  cy={savingRingSize / 2}
                  r={savingRingRadius}
                  stroke="#1BE39A"
                  strokeWidth={savingRingStroke}
                  strokeLinecap="round"
                  fill="transparent"
                  strokeDasharray={`${savingRingCircumference} ${savingRingCircumference}`}
                  strokeDashoffset={savingRingOffset}
                  transform={`rotate(-90 ${savingRingSize / 2} ${savingRingSize / 2})`}
                />
              </Svg>
              <View style={styles.ringInner}>
                <Text style={styles.ringLabel}>TOTAL SAVINGS</Text>
                <Text style={styles.ringValue}>{progressPct}%</Text>
                <Text style={styles.ringAmount}>Rs {formatCurrency(totalSaved)}</Text>
              </View>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{goals.length}</Text>
              <Text style={styles.statLabel}>Total Goals</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#1FC486' }]}>{activeGoals.length}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('CompletedGoals')}>
              <Text style={[styles.statValue, { color: '#51A8FF' }]}>{completedGoals.length}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </TouchableOpacity>
          </View>
        </View>

        {activeGoals.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Goals</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.goalRow}>
              {activeGoals.map((goal) => {
                const goalPct = Math.min(Math.round((goal.savedAmount / goal.targetAmount) * 100), 100);
                return (
                  <View key={goal.id} style={styles.goalCard}>
                    <View style={styles.goalTopRow}>
                      <Text style={styles.goalTitle}>{goal.title}</Text>
                      <Text style={styles.goalPct}>{goalPct}%</Text>
                    </View>
                    <Text style={styles.goalTarget}>Goal: Rs {formatCurrency(goal.targetAmount)}</Text>

                    <View style={styles.goalProgressTrack}>
                      <View style={[styles.goalProgressFill, { width: `${Math.max(goalPct, 4)}%` }]} />
                    </View>

                    <View style={styles.goalAmountRow}>
                      <Text style={styles.goalSavedLabel}>Saved</Text>
                      <Text style={styles.goalSavedValue}>Rs {formatCurrency(goal.savedAmount)}</Text>
                    </View>

                    <TouchableOpacity style={styles.addSavingsButton} onPress={() => openAddSavings(goal.id)}>
                      <Text style={styles.addSavingsText}>+ Add Savings</Text>
                    </TouchableOpacity>
                    <View style={styles.goalActionsRow}>
                      <TouchableOpacity
                        style={styles.goalSecondaryButton}
                        onPress={() => {
                          setSelectedGoalId(goal.id);
                          setSavingsAmount('');
                          setSavingsMode('withdraw');
                          setSavingsModalVisible(true);
                        }}
                      >
                        <Text style={styles.goalSecondaryButtonText}>Withdraw</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.goalSecondaryButton, styles.goalDangerButton]}
                        onPress={() => {
                          openConfirm('Delete Goal', `Delete "${goal.title}"?`, async () => {
                            await deleteGoal(goal.id);
                            showFeedback('Deleted', `"${goal.title}" has been deleted.`);
                          });
                        }}
                      >
                        <Text style={styles.goalSecondaryButtonText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </>
        ) : (
          <View style={styles.emptyActiveCard}>
            <Text style={styles.emptyActiveTitle}>No Active Goals</Text>
            <Text style={styles.emptyActiveText}>Use the + button above to create your first goal.</Text>
          </View>
        )}
        <View style={styles.transactionsContainer}>
          <View style={styles.transactionsHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="time-outline" size={18} color={colors.light} />
              <Text style={styles.recentHeaderTitle}>Recent Savings Activity</Text>
            </View>
            <TouchableOpacity style={styles.viewAllToggle} onPress={() => setShowAllGoalEntries((prev) => !prev)}>
              <Text style={styles.viewDayText}>{showAllGoalEntries ? 'Hide' : 'View All'}</Text>
              <Ionicons
                name={showAllGoalEntries ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.highlight}
              />
            </TouchableOpacity>
          </View>
          {groupedGoalRows.length === 0 ? (
            <Text style={styles.recentEmptyText}>No savings activity yet.</Text>
          ) : (
            groupedGoalRows.map((group) => (
              <View key={group.key} style={styles.recentGroup}>
                <Text style={styles.recentGroupHeader}>{group.header}</Text>
                {group.items.map((row) => (
                  <Swipeable
                    key={row.id}
                    overshootRight={false}
                    renderRightActions={() => (
                      <TouchableOpacity
                        style={styles.recentRemoveAction}
                        onPress={() =>
                          setDismissedRecentGoalEntryIds((prev) => (prev.includes(row.id) ? prev : [...prev, row.id]))
                        }
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.white} />
                        <Text style={styles.recentRemoveText}>Remove</Text>
                      </TouchableOpacity>
                    )}
                  >
                    <View style={styles.recentItemCard}>
                      <View style={styles.recentItemRow}>
                        <Text style={styles.recentItemTitle}>{row.title}</Text>
                        <Text style={[styles.recentItemAmount, row.kind === 'deposit' ? styles.amountPositive : styles.amountNegative]}>
                          {row.kind === 'deposit' ? '+Rs ' : '-Rs '}
                          {formatCurrency(row.amount)}
                        </Text>
                      </View>
                      <Text style={styles.recentItemMeta}>
                        Type: {row.kind === 'deposit' ? 'Savings Added' : 'Savings Withdrawn'}
                      </Text>
                    </View>
                  </Swipeable>
                ))}
              </View>
            ))
          )}
        </View>
          </>
        )}

        {showLiabilitySection && (
          <>
        <View style={styles.liabilityGraphCard}>
          <View style={styles.ringWrap}>
            <View style={[styles.ringOuter, styles.liabilityRingOuter]}>
              <View style={styles.ringInner}>
                <Text style={styles.ringLabel}>TOTAL LIABILITIES</Text>
                <Text style={[styles.ringValue, styles.liabilityRingValue]}>{liabilityProgressPct}%</Text>
                <Text style={styles.ringAmount}>Rs {formatCurrency(totalLiabilityRemaining)}</Text>
              </View>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{liabilities.length}</Text>
              <Text style={styles.statLabel}>Total Items</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#F59E8B' }]}>{activeLiabilityCount}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('ClearedLiabilities')}>
              <Text style={[styles.statValue, { color: '#7FF2C6' }]}>{clearedLiabilityCount}</Text>
              <Text style={styles.statLabel}>Cleared</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.liabilityWrap}>
          {activeLiabilities.length === 0 && (
            <View style={styles.emptyActiveCard}>
              <Text style={styles.emptyActiveTitle}>No Active Liabilities</Text>
              <Text style={styles.emptyActiveText}>Add debt or EMI using the + button.</Text>
            </View>
          )}
          {activeLiabilities.map((item) => {
            const paid =
              item.type !== 'rent'
                ? Math.max(0, item.totalAmount - item.remainingAmount)
                : item.monthlyPayment - getRentDueForMonth(item.id, monthKey);
            const due = item.type === 'rent' ? getRentDueForMonth(item.id, monthKey) : item.remainingAmount;
            const paidPct =
              item.type !== 'rent'
                ? item.totalAmount > 0
                  ? Math.min(Math.round((paid / item.totalAmount) * 100), 100)
                  : 0
                : item.monthlyPayment > 0
                  ? Math.min(Math.round((paid / item.monthlyPayment) * 100), 100)
                  : 0;
            return (
              <View key={item.id} style={styles.liabilityCard}>
                <View style={styles.liabilityHeader}>
                  <Text style={styles.liabilityTitle}>{item.title}</Text>
                  <View
                    style={[
                      styles.liabilityTag,
                      item.type === 'rent' ? styles.rentTag : item.type === 'emi' ? styles.emiTag : styles.debtTag,
                    ]}
                  >
                    <Text style={styles.liabilityTagText}>{item.type.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.liabilityMeta}>
                  {item.type === 'rent' ? 'Due This Month' : 'Remaining'}: Rs {formatCurrency(due)}
                </Text>
                {item.type === 'emi' && (
                  <Text style={styles.liabilityMeta}>Monthly EMI: Rs {formatCurrency(item.monthlyPayment)}</Text>
                )}
                {item.type === 'emi' && item.monthlyPayment > 0 && (
                  <Text style={styles.liabilityMeta}>
                    Months Left: {Math.ceil(item.remainingAmount / item.monthlyPayment)}
                  </Text>
                )}
                {item.type === 'rent' && (
                  <Text style={styles.liabilityMeta}>Monthly: Rs {formatCurrency(item.monthlyPayment)}</Text>
                )}
                {item.type === 'debt' && <Text style={styles.liabilityMeta}>Type: One-time debt</Text>}

                <View style={styles.goalProgressTrack}>
                  <View style={[styles.debtProgressFill, { width: `${Math.max(paidPct, 4)}%` }]} />
                </View>

                <TouchableOpacity style={styles.makePaymentButton} onPress={() => openLiabilityPayment(item.id)}>
                  <Text style={styles.makePaymentText}>Make Payment</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.liabilityDeleteBtn}
                  onPress={() => {
                    openConfirm('Delete Item', `Delete "${item.title}"?`, async () => {
                      await deleteLiability(item.id);
                      showFeedback('Deleted', `"${item.title}" has been deleted.`);
                    });
                  }}
                >
                  <Text style={styles.liabilityDeleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, styles.sectionTitleCompact]}>Rent</Text>
          {!activeRent && (
            <TouchableOpacity style={styles.liabilityAddButton} onPress={() => setRentModalVisible(true)}>
              <Ionicons name="add" size={16} color={colors.white} />
            </TouchableOpacity>
          )}
        </View>

        {activeRent ? (
          <View style={styles.liabilityCard}>
            <View style={styles.liabilityHeader}>
              <Text style={styles.liabilityTitle}>{activeRent.title}</Text>
              <View style={[styles.liabilityTag, styles.rentTag]}>
                <Text style={styles.liabilityTagText}>RENT</Text>
              </View>
            </View>
            {shouldShowRentPaymentCard ? (
              <Text style={styles.liabilityMeta}>Due Date: {activeRentDueDate}</Text>
            ) : (
              <Text style={styles.liabilityMeta}>Upcoming Due: {activeRentDueDate}</Text>
            )}
            <Text style={styles.liabilityMeta}>Rent Amount: Rs {formatCurrency(activeRentDueAmount)}</Text>
            <Text style={styles.liabilityMeta}>Monthly: Rs {formatCurrency(activeRent.monthlyPayment)}</Text>
            {shouldShowRentPaymentCard ? (
              <TouchableOpacity style={styles.makePaymentButton} onPress={() => openLiabilityPayment(activeRent.id)}>
                <Text style={styles.makePaymentText}>Make Payment</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.goalHintBlock}>
                <Text style={styles.goalHintText}>Payment will be enabled on due date.</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.liabilityDeleteBtn}
              onPress={() =>
                openConfirm('Delete Rent', `Delete "${activeRent.title}"?`, async () => {
                  await deleteLiability(activeRent.id);
                  showFeedback('Deleted', 'Rent has been deleted.');
                })
              }
            >
              <Text style={styles.liabilityDeleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyActiveCard}>
            <Text style={styles.emptyActiveTitle}>No Rent Added</Text>
            <Text style={styles.emptyActiveText}>Add one rent entry. Only one active rent is allowed.</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.historyOpenButton}
          onPress={() => {
            setHistoryType('liability');
            setHistoryModalVisible(true);
          }}
        >
          <Ionicons name="time-outline" size={16} color={colors.white} />
          <Text style={styles.historyOpenButtonText}>View Recent Liability Payments</Text>
        </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <Modal visible={goalModalVisible} transparent animationType="fade" onRequestClose={() => setGoalModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>New Goal</Text>
              <TouchableOpacity onPress={() => setGoalModalVisible(false)}>
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Goal title"
              placeholderTextColor={colors.light}
              value={goalTitle}
              onChangeText={setGoalTitle}
            />
            <TextInput
              style={styles.input}
              placeholder="Target amount"
              placeholderTextColor={colors.light}
              keyboardType="decimal-pad"
              value={goalTarget}
              onChangeText={setGoalTarget}
            />
            <TextInput
              style={styles.input}
              placeholder="Saved amount (optional)"
              placeholderTextColor={colors.light}
              keyboardType="decimal-pad"
              value={goalSaved}
              onChangeText={setGoalSaved}
            />

            <TouchableOpacity
              style={styles.modalPrimaryButton}
              onPress={async () => {
                const target = Number(goalTarget);
                const saved = Number(goalSaved || '0');
                if (!goalTitle.trim()) {
                  showFeedback('Validation', 'Goal title is required.');
                  return;
                }
                if (!Number.isFinite(target) || target <= 0) {
                  showFeedback('Validation', 'Target amount must be greater than 0.');
                  return;
                }
                if (!Number.isFinite(saved) || saved < 0) {
                  showFeedback('Validation', 'Saved amount cannot be negative.');
                  return;
                }
                await addGoal({ title: goalTitle, targetAmount: target, savedAmount: saved });
                setGoalTitle('');
                setGoalTarget('');
                setGoalSaved('');
                setGoalModalVisible(false);
              }}
            >
              <Text style={styles.modalPrimaryText}>Save Goal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={liabilityModalVisible} transparent animationType="fade" onRequestClose={() => setLiabilityModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Add Liability</Text>
              <TouchableOpacity onPress={() => setLiabilityModalVisible(false)}>
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>

            <DropdownField
              label="Liability Type"
              value={toLiabilityTypeLabel(liabilityType)}
              options={[...LIABILITY_TYPE_OPTIONS]}
              onSelect={(value) => setLiabilityType(toLiabilityType(value))}
            />

            <TextInput
              style={styles.input}
              placeholder="Title"
              placeholderTextColor={colors.light}
              value={liabilityTitle}
              onChangeText={setLiabilityTitle}
            />

            {liabilityType === 'debt' && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Total debt amount"
                  placeholderTextColor={colors.light}
                  keyboardType="decimal-pad"
                  value={liabilityTotal}
                  onChangeText={setLiabilityTotal}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Remaining amount (optional)"
                  placeholderTextColor={colors.light}
                  keyboardType="decimal-pad"
                  value={liabilityRemaining}
                  onChangeText={setLiabilityRemaining}
                />
              </>
            )}
            {liabilityType === 'emi' && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Principal amount"
                  placeholderTextColor={colors.light}
                  keyboardType="decimal-pad"
                  value={liabilityTotal}
                  onChangeText={setLiabilityTotal}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Remaining amount (optional)"
                  placeholderTextColor={colors.light}
                  keyboardType="decimal-pad"
                  value={liabilityRemaining}
                  onChangeText={setLiabilityRemaining}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Monthly EMI amount"
                  placeholderTextColor={colors.light}
                  keyboardType="decimal-pad"
                  value={liabilityMonthly}
                  onChangeText={setLiabilityMonthly}
                />
                {estimatedEmiMonths !== null && (
                  <Text style={styles.formHint}>Estimated EMI months: {estimatedEmiMonths}</Text>
                )}
              </>
            )}

            <TouchableOpacity
              style={styles.modalPrimaryButton}
              onPress={async () => {
                const total = Number(liabilityTotal);
                const remaining = liabilityRemaining ? Number(liabilityRemaining) : undefined;
                const monthly = Number(liabilityMonthly);

                if (!liabilityTitle.trim()) {
                  showFeedback('Validation', 'Title is required.');
                  return;
                }
                if (liabilityType === 'debt' || liabilityType === 'emi') {
                  if (!Number.isFinite(total) || total <= 0) {
                    showFeedback('Validation', 'Total amount must be greater than 0.');
                    return;
                  }
                  if (remaining !== undefined && (!Number.isFinite(remaining) || remaining < 0)) {
                    showFeedback('Validation', 'Remaining amount cannot be negative.');
                    return;
                  }
                  if (remaining !== undefined && remaining > total) {
                    showFeedback('Validation', 'Remaining amount cannot exceed total amount.');
                    return;
                  }
                }
                if (liabilityType === 'emi') {
                  if (!Number.isFinite(monthly) || monthly <= 0) {
                    showFeedback('Validation', 'Monthly EMI must be greater than 0.');
                    return;
                  }
                  if (liabilityType === 'emi' && monthly > (remaining ?? total)) {
                    showFeedback('Validation', 'Monthly EMI cannot exceed principal/remaining amount.');
                    return;
                  }
                }

                try {
                  await addLiability({
                  title: liabilityTitle,
                  totalAmount: total,
                  remainingAmount: remaining,
                  monthlyPayment: liabilityType === 'debt' ? 0 : monthly,
                  type: liabilityType,
                });
                } catch (error) {
                  const message = error instanceof Error ? error.message : 'Could not add liability.';
                  showFeedback('Validation', message);
                  return;
                }

                setLiabilityTitle('');
                setLiabilityTotal('');
                setLiabilityRemaining('');
                setLiabilityMonthly('');
                setLiabilityType('debt');
                setLiabilityModalVisible(false);
              }}
            >
              <Text style={styles.modalPrimaryText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={rentModalVisible} transparent animationType="fade" onRequestClose={() => setRentModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Add Rent</Text>
              <TouchableOpacity onPress={() => setRentModalVisible(false)}>
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Rent title (optional)"
              placeholderTextColor={colors.light}
              value={rentTitle}
              onChangeText={setRentTitle}
            />
            <TextInput
              style={styles.input}
              placeholder="Monthly rent amount"
              placeholderTextColor={colors.light}
              keyboardType="decimal-pad"
              value={rentMonthly}
              onChangeText={setRentMonthly}
            />

            <TouchableOpacity
              style={styles.modalPrimaryButton}
              onPress={async () => {
                const monthly = Number(rentMonthly);
                if (!Number.isFinite(monthly) || monthly <= 0) {
                  showFeedback('Validation', 'Monthly rent must be greater than 0.');
                  return;
                }
                try {
                  await addLiability({
                    title: rentTitle.trim() || 'House Rent',
                    totalAmount: 0,
                    monthlyPayment: monthly,
                    type: 'rent',
                  });
                } catch (error) {
                  const message = error instanceof Error ? error.message : 'Could not add rent.';
                  showFeedback('Validation', message);
                  return;
                }
                setRentTitle('');
                setRentMonthly('');
                setRentModalVisible(false);
              }}
            >
              <Text style={styles.modalPrimaryText}>Save Rent</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={savingsModalVisible} transparent animationType="fade" onRequestClose={() => setSavingsModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>{savingsMode === 'add' ? 'Add Savings' : 'Withdraw Savings'}</Text>
              <TouchableOpacity onPress={() => setSavingsModalVisible(false)}>
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalHint}>{selectedGoal ? selectedGoal.title : ''}</Text>
            {selectedGoal && (
              <View style={styles.goalHintBlock}>
                {savingsMode === 'add' ? (
                  <>
                    <Text style={styles.goalHintText}>Remaining to goal: Rs {formatCurrency(selectedGoalRemaining)}</Text>
                    <Text style={[styles.goalHintText, isSavingsAddExceeding && styles.goalHintError]}>
                      Remaining after add: Rs {formatCurrency(projectedRemainingAfterAdd)}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.goalHintText}>Saved amount: Rs {formatCurrency(selectedGoal.savedAmount)}</Text>
                    <Text style={styles.goalHintText}>
                      Balance after withdraw: Rs {formatCurrency(Math.max(selectedGoal.savedAmount - Math.max(enteredSavingsAmount || 0, 0), 0))}
                    </Text>
                  </>
                )}
              </View>
            )}
            <TextInput
              style={styles.input}
              placeholder="Amount"
              placeholderTextColor={colors.light}
              keyboardType="decimal-pad"
              value={savingsAmount}
              onChangeText={setSavingsAmount}
            />

            <TouchableOpacity
              style={styles.modalPrimaryButton}
              onPress={async () => {
                if (!selectedGoalId) return;
                const amount = Number(savingsAmount);
                if (savingsMode === 'add') {
                  if (!Number.isFinite(amount) || amount <= 0) {
                    showFeedback('Validation', 'Savings amount must be greater than 0.');
                    return;
                  }
                  try {
                    await addSavingsToGoal(selectedGoalId, amount);
                    if (selectedGoal && amount >= selectedGoalRemaining) {
                      showToast(`Goal fulfilled: ${selectedGoal.title}`);
                    }
                    setSavingsAmount('');
                    setSavingsModalVisible(false);
                  } catch (error) {
                    const message = error instanceof Error ? error.message : 'Could not add savings.';
                    showFeedback('Validation', message);
                  }
                  return;
                }

                if (!Number.isFinite(amount) || amount <= 0) {
                  showFeedback('Validation', 'Withdrawal must be greater than 0.');
                  return;
                }
                try {
                  await withdrawSavingsFromGoal(selectedGoalId, amount);
                  setSavingsAmount('');
                  setSavingsModalVisible(false);
                } catch (error) {
                  const message = error instanceof Error ? error.message : 'Could not withdraw savings.';
                  showFeedback('Validation', message);
                }
              }}
            >
              <Text style={styles.modalPrimaryText}>{savingsMode === 'add' ? 'Add' : 'Withdraw'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={paymentModalVisible} transparent animationType="fade" onRequestClose={() => setPaymentModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Make Payment</Text>
              <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Payment amount"
              placeholderTextColor={colors.light}
              keyboardType="decimal-pad"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
            />
            {selectedLiability?.type === 'emi' && (
              <>
                <DropdownField
                  label="Pay For Month"
                  value={paymentMonthKey}
                  options={emiMonthOptions}
                  onSelect={setPaymentMonthKey}
                />
                {selectedEmiDue > 0 ? (
                  <Text style={styles.formHint}>Due for {paymentMonthKey}: Rs {formatCurrency(selectedEmiDue)}</Text>
                ) : (
                  <Text style={[styles.formHint, styles.formHintPaid]}>
                    {paymentMonthKey === currentMonthKey ? 'Paid for this month' : 'Paid for selected month'}
                  </Text>
                )}
                {nextPayableEmiMonth && paymentMonthKey !== nextPayableEmiMonth && (
                  <Text style={[styles.formHint, styles.formHintPaid]}>
                    Next payable EMI month is {nextPayableEmiMonth}
                  </Text>
                )}
              </>
            )}
            {selectedLiability?.type === 'rent' && (
              <Text style={styles.formHint}>
                Upcoming rent due ({selectedRentMonthKey}): Rs {formatCurrency(selectedRentDue)}
              </Text>
            )}

            <TouchableOpacity
              style={styles.modalPrimaryButton}
              onPress={async () => {
                if (!selectedLiabilityId) return;
                const amount = Number(paymentAmount);
                if (!Number.isFinite(amount) || amount <= 0) {
                  showFeedback('Validation', 'Payment must be greater than 0.');
                  return;
                }
                if (selectedLiability?.type === 'rent' && selectedRentDue <= 0) {
                  showFeedback('Already Paid', 'No pending rent due right now.');
                  return;
                }
                if (selectedLiability?.type === 'emi') {
                  if (selectedEmiDue <= 0) {
                    showFeedback('Month Already Paid', 'Selected EMI month is already paid.');
                    return;
                  }
                  if (nextPayableEmiMonth && paymentMonthKey !== nextPayableEmiMonth) {
                    showFeedback('Invalid Month', `Pay ${nextPayableEmiMonth} EMI first.`);
                    return;
                  }
                }
                try {
                  await makeLiabilityPayment(
                    selectedLiabilityId,
                    amount,
                    selectedLiability?.type === 'emi' ? paymentMonthKey : undefined
                  );
                  setPaymentAmount('');
                  setPaymentModalVisible(false);
                } catch (error) {
                  const message = error instanceof Error ? error.message : 'Payment failed.';
                  showFeedback('Payment Error', message);
                }
              }}
            >
              <Text style={styles.modalPrimaryText}>Pay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={historyModalVisible} transparent animationType="fade" onRequestClose={() => setHistoryModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>{historyType === 'savings' ? 'Savings Activity' : 'Liability Payments'}</Text>
              <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 320 }}>
              {historyType === 'savings' ? (
                recentGoalEntries.length === 0 ? (
                  <Text style={styles.historyEmpty}>No savings activity yet.</Text>
                ) : (
                  recentGoalEntries.map((entry) => {
                    const goal = goals.find((item) => item.id === entry.goalId);
                    return (
                      <View key={entry.id} style={styles.historyRow}>
                        <Text style={styles.historyLabel}>{goal?.title || 'Goal'} ({entry.kind})</Text>
                        <View style={styles.historyRight}>
                          <Text style={styles.historyAmount}>Rs {formatCurrency(entry.amount)}</Text>
                          <TouchableOpacity
                            onPress={() =>
                              openConfirm('Delete Activity', 'Delete this savings activity?', async () => {
                                await deleteGoalEntry(entry.id);
                                showFeedback('Deleted', 'Savings activity deleted.');
                              })
                            }
                          >
                            <Text style={styles.historyDeleteText}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )
              ) : recentLiabilityPayments.length === 0 ? (
                <Text style={styles.historyEmpty}>No payments recorded yet.</Text>
              ) : (
                recentLiabilityPayments.map((entry) => {
                  const item = liabilities.find((liability) => liability.id === entry.liabilityId);
                  return (
                    <View key={entry.id} style={styles.historyRow}>
                      <Text style={styles.historyLabel}>{item?.title || 'Liability'} ({entry.monthKey})</Text>
                      <View style={styles.historyRight}>
                        <Text style={styles.historyAmount}>Rs {formatCurrency(entry.amount)}</Text>
                        <TouchableOpacity
                          onPress={() =>
                            openConfirm('Delete Payment', 'Delete this payment record?', async () => {
                              await deleteLiabilityPayment(entry.id);
                              showFeedback('Deleted', 'Payment record deleted.');
                            })
                          }
                        >
                          <Text style={styles.historyDeleteText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={confirmState.visible} transparent animationType="fade" onRequestClose={closeConfirm}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{confirmState.title}</Text>
            <Text style={styles.modalHint}>{confirmState.message}</Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.confirmCancelBtn} onPress={closeConfirm}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDeleteBtn}
                onPress={async () => {
                  const action = confirmState.onConfirm;
                  closeConfirm();
                  if (!action) return;
                  try {
                    await action();
                  } catch (error) {
                    const message = error instanceof Error ? error.message : 'Action failed.';
                    showFeedback('Error', message);
                  }
                }}
              >
                <Text style={styles.confirmDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={feedback.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setFeedback((prev) => ({ ...prev, visible: false }))}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{feedback.title}</Text>
            <Text style={styles.modalHint}>{feedback.message}</Text>
            <TouchableOpacity
              style={styles.modalPrimaryButton}
              onPress={() => setFeedback((prev) => ({ ...prev, visible: false }))}
            >
              <Text style={styles.modalPrimaryText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {toast.visible && (
        <View pointerEvents="none" style={styles.toastWrap}>
          <View style={styles.toastCard}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#7FF2C6" />
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 96 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTitle: { color: colors.white, fontSize: 24, lineHeight: 30, fontWeight: '800' },
  headerIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconButtonSpacer: {
    width: 34,
    height: 34,
  },
  balanceCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.highlight,
    padding: 12,
    marginBottom: 14,
  },
  balanceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  balanceIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8FBF4',
    marginRight: 8,
  },
  balanceTitle: { color: colors.white, fontSize: 17, lineHeight: 22, fontWeight: '800' },
  balanceSub: { color: colors.light, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  assetBarTrack: {
    height: 12,
    borderRadius: 99,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: '#1E2C57',
    marginBottom: 12,
  },
  assetBarFill: { backgroundColor: '#14C38E' },
  assetBarDebt: { backgroundColor: '#F06A8E' },
  balanceAmounts: { flexDirection: 'row', justifyContent: 'space-between' },
  assetLabel: { color: '#4BE0B3', fontSize: 12, lineHeight: 16, fontWeight: '700' },
  assetValue: { color: colors.white, fontSize: 20, lineHeight: 25, fontWeight: '800' },
  debtLabel: { color: '#F3A0B3', fontSize: 12, lineHeight: 16, fontWeight: '700' },
  debtValue: { color: colors.white, fontSize: 20, lineHeight: 25, fontWeight: '800' },
  monthlyDebt: { color: colors.light, fontSize: 12, lineHeight: 16, fontWeight: '600' },
  ringCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.highlight,
    padding: 12,
    marginBottom: 16,
  },
  liabilityGraphCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.highlight,
    padding: 12,
    marginBottom: 16,
  },
  ringWrap: { alignItems: 'center', marginBottom: 12 },
  ringOuter: {
    width: 190,
    height: 190,
    borderRadius: 95,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  ringSvg: {
    position: 'absolute',
  },
  liabilityRingOuter: {
    borderColor: '#F2D9D9',
  },
  ringInner: {
    width: 146,
    height: 146,
    borderRadius: 73,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  ringLabel: { color: colors.light, fontSize: 12, lineHeight: 16, letterSpacing: 1, fontWeight: '700' },
  ringValue: { color: colors.white, fontSize: 34, lineHeight: 40, fontWeight: '900' },
  ringAmount: { color: colors.white, fontSize: 18, lineHeight: 24, fontWeight: '700' },
  liabilityRingValue: {
    color: '#F5A623',
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: colors.white, fontSize: 24, lineHeight: 30, fontWeight: '800' },
  statLabel: { color: colors.light, fontSize: 12, lineHeight: 16, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: colors.white, fontSize: 20, lineHeight: 26, fontWeight: '800' },
  sectionTitleCompact: { fontSize: 20, lineHeight: 26, flexShrink: 1, marginRight: 10 },
  sectionAction: { color: '#23C98F', fontSize: 14, lineHeight: 18, fontWeight: '700' },
  liabilityAddButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalRow: { paddingBottom: 10, gap: 10, paddingRight: 2 },
  goalCard: {
    width: 230,
    backgroundColor: '#B9F6E5',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#95E8D0',
  },
  goalTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  goalTitle: { color: '#10223F', fontSize: 18, lineHeight: 22, fontWeight: '800', flex: 1, marginRight: 6 },
  goalPct: { color: '#10223F', fontSize: 28, lineHeight: 32, fontWeight: '900' },
  goalTarget: { color: '#1D3B62', fontSize: 14, lineHeight: 18, fontWeight: '700', marginBottom: 8 },
  goalProgressTrack: {
    height: 7,
    borderRadius: 99,
    backgroundColor: '#D7E0EF',
    overflow: 'hidden',
    marginBottom: 6,
  },
  goalProgressFill: { backgroundColor: '#1FBE94', height: '100%' },
  debtProgressFill: { backgroundColor: '#62A8FF', height: '100%' },
  goalAmountRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' },
  goalSavedLabel: { color: '#294668', fontSize: 13, lineHeight: 16, fontWeight: '600' },
  goalSavedValue: { color: '#10223F', fontSize: 16, lineHeight: 20, fontWeight: '800' },
  addSavingsButton: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4DEE9',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  addSavingsText: { color: '#10223F', fontSize: 14, lineHeight: 18, fontWeight: '800' },
  goalActionsRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  goalSecondaryButton: {
    flex: 1,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#7BB8A6',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  goalDangerButton: {
    borderColor: '#E8A2A2',
  },
  goalSecondaryButtonText: {
    color: '#10223F',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  completedWrap: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.highlight,
    padding: 12,
    marginBottom: 16,
  },
  completedTitle: {
    color: colors.white,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  completedItem: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#3D4B74',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  completedItemTitle: {
    color: colors.light,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
  },
  completedItemValue: {
    color: '#80F2CC',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
  },
  completedRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  completedDeleteText: {
    color: '#F3A0B3',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  liabilityWrap: { gap: 10, paddingBottom: 14 },
  liabilityCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.highlight,
    padding: 11,
  },
  liabilityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  liabilityTitle: { color: colors.white, fontSize: 16, lineHeight: 21, fontWeight: '800', flex: 1, marginRight: 8 },
  liabilityTag: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  debtTag: { backgroundColor: '#3E5C93' },
  emiTag: { backgroundColor: '#3B768A' },
  rentTag: { backgroundColor: '#5C4A96' },
  liabilityTagText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  liabilityMeta: { color: colors.light, fontSize: 12, lineHeight: 16, marginTop: 3 },
  makePaymentButton: {
    marginTop: 8,
    height: 36,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  makePaymentText: { color: colors.white, fontSize: 13, lineHeight: 17, fontWeight: '700' },
  liabilityDeleteBtn: {
    marginTop: 8,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E7A3B3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liabilityDeleteText: {
    color: '#F3A0B3',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  historyOpenButton: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.highlight,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  historyOpenButtonText: { color: colors.white, fontSize: 13, lineHeight: 17, fontWeight: '700' },
  historyEmpty: {
    color: colors.light,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#3D4B74',
  },
  historyLabel: {
    color: colors.light,
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
    marginRight: 8,
  },
  historyRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  historyAmount: {
    color: colors.white,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  historyDeleteText: {
    color: '#F3A0B3',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
  },
  transactionsContainer: { marginTop: 14, marginBottom: 20 },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recentHeaderTitle: {
    color: colors.white,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
  },
  viewDayText: {
    color: colors.highlight,
    fontWeight: '700',
    fontSize: 14,
  },
  viewAllToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recentEmptyText: {
    color: colors.light,
    fontSize: 14,
    fontWeight: '600',
  },
  recentGroup: {
    marginBottom: 8,
  },
  recentGroupHeader: {
    color: colors.light,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 2,
  },
  recentItemCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.highlight,
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
  },
  recentItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentItemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    flex: 1,
    marginRight: 12,
  },
  recentItemAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
  amountPositive: {
    color: '#7FF2C6',
  },
  amountNegative: {
    color: '#F3A0B3',
  },
  recentItemMeta: {
    color: colors.light,
    fontSize: 12,
    marginTop: 5,
  },
  recentRemoveAction: {
    width: 92,
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: '#8b1e2f',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  recentRemoveText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
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
    borderWidth: 1,
    borderColor: colors.highlight,
    padding: 12,
  },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { color: colors.white, fontSize: 17, lineHeight: 22, fontWeight: '800' },
  modalCloseText: { color: colors.light, fontSize: 13, lineHeight: 17, fontWeight: '700' },
  modalHint: { color: colors.light, fontSize: 13, lineHeight: 17, marginBottom: 6 },
  formHint: {
    color: '#80F2CC',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  formHintPaid: {
    color: '#F3A0B3',
  },
  goalHintBlock: {
    borderWidth: 1,
    borderColor: colors.highlight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(16,25,53,0.35)',
  },
  goalHintText: {
    color: colors.light,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  goalHintError: {
    color: '#F3A0B3',
  },
  input: {
    height: 42,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.highlight,
    color: colors.white,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  modalPrimaryButton: {
    marginTop: 4,
    height: 40,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryText: { color: colors.white, fontSize: 14, lineHeight: 18, fontWeight: '800' },
  modalSecondaryButton: {
    marginTop: 8,
    height: 40,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSecondaryText: { color: colors.light, fontSize: 14, lineHeight: 18, fontWeight: '700' },
  confirmActions: { flexDirection: 'row', gap: 8 },
  confirmCancelBtn: {
    flex: 1,
    height: 40,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelText: { color: colors.light, fontSize: 13, lineHeight: 17, fontWeight: '700' },
  confirmDeleteBtn: {
    flex: 1,
    height: 40,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b1e2f',
  },
  confirmDeleteText: { color: colors.white, fontSize: 13, lineHeight: 17, fontWeight: '700' },
  toastWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 92,
    alignItems: 'center',
  },
  toastCard: {
    backgroundColor: '#1F2A4A',
    borderWidth: 1,
    borderColor: '#3D4F80',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: '72%',
  },
  toastText: {
    color: colors.white,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
  },
  emptyActiveCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.highlight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginBottom: 14,
  },
  emptyActiveTitle: {
    color: colors.white,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptyActiveText: {
    color: colors.light,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  toggleButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    borderWidth: 1,
    borderColor: colors.highlight,
    borderRadius: 8,
  },
  toggleButtonActive: { backgroundColor: colors.primary },
  toggleText: { color: colors.white, fontSize: 14, lineHeight: 18, fontWeight: '700' },
});


