import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/store/authStore';
import { create } from 'zustand';
import type {
  GoalSavingsEntry,
  LiabilityItem,
  LiabilityPaymentEntry,
  LiabilityType,
  SavingsGoal,
} from '@/types/goal';

const GOALS_KEY_PREFIX = 'savings_goals_v2';
const LIABILITIES_KEY_PREFIX = 'liabilities_v2';
const GOAL_ENTRIES_KEY_PREFIX = 'goal_savings_entries_v2';
const LIABILITY_PAYMENTS_KEY_PREFIX = 'liability_payments_v2';

function toMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function addMonths(monthKey: string, delta: number) {
  const [year, month] = monthKey.split('-').map(Number);
  const d = new Date((year || 1970), (month || 1) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getGoalStatus(savedAmount: number, targetAmount: number): 'active' | 'completed' {
  return savedAmount >= targetAmount ? 'completed' : 'active';
}

function getCompletedAt(
  prevStatus: 'active' | 'completed',
  nextStatus: 'active' | 'completed',
  prevCompletedAt: string | null,
  now: string
) {
  if (nextStatus === 'completed') {
    return prevStatus === 'completed' ? prevCompletedAt : now;
  }
  return null;
}

interface GoalStorageKeys {
  goals: string;
  liabilities: string;
  goalEntries: string;
  liabilityPayments: string;
}

interface GoalStorageSnapshot {
  goals: SavingsGoal[];
  liabilities: LiabilityItem[];
  goalEntries: GoalSavingsEntry[];
  liabilityPayments: LiabilityPaymentEntry[];
}

function resolveCurrentUserKey() {
  const user = useAuthStore.getState().user;
  const rawKey =
    user?.id ??
    user?._id ??
    (typeof user?.email === 'string' ? user.email.trim().toLowerCase() : '');
  return rawKey ? String(rawKey) : 'guest';
}

function buildStorageKeys(userKey: string): GoalStorageKeys {
  return {
    goals: `${GOALS_KEY_PREFIX}:${userKey}`,
    liabilities: `${LIABILITIES_KEY_PREFIX}:${userKey}`,
    goalEntries: `${GOAL_ENTRIES_KEY_PREFIX}:${userKey}`,
    liabilityPayments: `${LIABILITY_PAYMENTS_KEY_PREFIX}:${userKey}`,
  };
}

function getEmptySnapshot(): GoalStorageSnapshot {
  return {
    goals: [],
    liabilities: [],
    goalEntries: [],
    liabilityPayments: [],
  };
}

async function persistSnapshot(userKey: string, snapshot: GoalStorageSnapshot) {
  const keys = buildStorageKeys(userKey);
  await AsyncStorage.multiSet([
    [keys.goals, JSON.stringify(snapshot.goals)],
    [keys.liabilities, JSON.stringify(snapshot.liabilities)],
    [keys.goalEntries, JSON.stringify(snapshot.goalEntries)],
    [keys.liabilityPayments, JSON.stringify(snapshot.liabilityPayments)],
  ]);
}

interface AddGoalPayload {
  title: string;
  targetAmount: number;
  savedAmount?: number;
}

interface AddLiabilityPayload {
  title: string;
  totalAmount: number;
  remainingAmount?: number;
  monthlyPayment?: number;
  type: LiabilityType;
}

interface GoalsState {
  goals: SavingsGoal[];
  liabilities: LiabilityItem[];
  goalEntries: GoalSavingsEntry[];
  liabilityPayments: LiabilityPaymentEntry[];
  activeUserKey: string | null;
  isHydrated: boolean;
  initializeGoals: () => Promise<void>;
  addGoal: (payload: AddGoalPayload) => Promise<void>;
  updateGoal: (goalId: string, payload: Partial<AddGoalPayload>) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  addSavingsToGoal: (goalId: string, amount: number) => Promise<void>;
  withdrawSavingsFromGoal: (goalId: string, amount: number) => Promise<void>;
  deleteGoalEntry: (entryId: string) => Promise<void>;
  addLiability: (payload: AddLiabilityPayload) => Promise<void>;
  updateLiability: (liabilityId: string, payload: Partial<AddLiabilityPayload>) => Promise<void>;
  deleteLiability: (liabilityId: string) => Promise<void>;
  makeLiabilityPayment: (liabilityId: string, amount: number, monthKey?: string) => Promise<void>;
  deleteLiabilityPayment: (paymentId: string) => Promise<void>;
  getRentDueForMonth: (liabilityId: string, monthKey?: string) => number;
  getEmiDueForMonth: (liabilityId: string, monthKey?: string) => number;
}

export const useGoalsStore = create<GoalsState>((set, get) => ({
  goals: [],
  liabilities: [],
  goalEntries: [],
  liabilityPayments: [],
  activeUserKey: null,
  isHydrated: false,

  initializeGoals: async () => {
    const currentUserKey = resolveCurrentUserKey();
    if (get().isHydrated && get().activeUserKey === currentUserKey) {
      return;
    }

    set({ isHydrated: false });

    try {
      const keys = buildStorageKeys(currentUserKey);
      const [rawGoals, rawLiabilities, rawGoalEntries, rawLiabilityPayments] = await Promise.all([
        AsyncStorage.getItem(keys.goals),
        AsyncStorage.getItem(keys.liabilities),
        AsyncStorage.getItem(keys.goalEntries),
        AsyncStorage.getItem(keys.liabilityPayments),
      ]);

      const parsedGoals = rawGoals ? JSON.parse(rawGoals) : [];
      const parsedLiabilities = rawLiabilities ? JSON.parse(rawLiabilities) : [];
      const parsedGoalEntries = rawGoalEntries ? JSON.parse(rawGoalEntries) : [];
      const parsedLiabilityPayments = rawLiabilityPayments ? JSON.parse(rawLiabilityPayments) : [];

      const normalizedGoals = (Array.isArray(parsedGoals) ? parsedGoals : []).map((goal) => {
        const saved = Number(goal?.savedAmount ?? 0);
        const target = Number(goal?.targetAmount ?? 0);
        const status = getGoalStatus(saved, target);
        return {
          ...goal,
          savedAmount: saved,
          targetAmount: target,
          status,
          completedAt: goal?.completedAt ?? (status === 'completed' ? goal?.updatedAt ?? goal?.createdAt ?? null : null),
        };
      });

      set({
        goals: normalizedGoals,
        liabilities: Array.isArray(parsedLiabilities) ? parsedLiabilities : [],
        goalEntries: Array.isArray(parsedGoalEntries) ? parsedGoalEntries : [],
        liabilityPayments: Array.isArray(parsedLiabilityPayments) ? parsedLiabilityPayments : [],
        activeUserKey: currentUserKey,
        isHydrated: true,
      });
    } catch {
      const empty = getEmptySnapshot();
      set({
        ...empty,
        activeUserKey: currentUserKey,
        isHydrated: true,
      });
    }
  },

  addGoal: async ({ title, targetAmount, savedAmount = 0 }) => {
    await get().initializeGoals();
    const now = new Date().toISOString();
    const normalizedTitle = title.trim();
    const clampedSaved = clampNumber(savedAmount, 0, targetAmount);
    const next: SavingsGoal = {
      id: `goal-${Date.now()}`,
      title: normalizedTitle,
      targetAmount,
      savedAmount: clampedSaved,
      status: getGoalStatus(clampedSaved, targetAmount),
      createdAt: now,
      completedAt: clampedSaved >= targetAmount ? now : null,
      updatedAt: now,
    };

    const nextGoals = [next, ...get().goals];
    set({ goals: nextGoals });
    const userKey = get().activeUserKey ?? resolveCurrentUserKey();
    await persistSnapshot(userKey, {
      goals: nextGoals,
      liabilities: get().liabilities,
      goalEntries: get().goalEntries,
      liabilityPayments: get().liabilityPayments,
    });

    if (clampedSaved > 0) {
      const nextEntry: GoalSavingsEntry = {
        id: `goal-entry-${Date.now()}`,
        goalId: next.id,
        amount: clampedSaved,
        kind: 'deposit',
        createdAt: now,
      };
      const nextEntries = [nextEntry, ...get().goalEntries];
      set({ goalEntries: nextEntries });
      await persistSnapshot(userKey, {
        goals: get().goals,
        liabilities: get().liabilities,
        goalEntries: nextEntries,
        liabilityPayments: get().liabilityPayments,
      });
    }
  },

  updateGoal: async (goalId, payload) => {
    await get().initializeGoals();
    const now = new Date().toISOString();
    const nextGoals = get().goals.map((goal) => {
      if (goal.id !== goalId) return goal;
      const targetAmount = payload.targetAmount ?? goal.targetAmount;
      const savedAmount = clampNumber(payload.savedAmount ?? goal.savedAmount, 0, targetAmount);
      const nextStatus = getGoalStatus(savedAmount, targetAmount);
      return {
        ...goal,
        title: payload.title?.trim() || goal.title,
        targetAmount,
        savedAmount,
        status: nextStatus,
        completedAt: getCompletedAt(goal.status, nextStatus, goal.completedAt ?? null, now),
        updatedAt: now,
      };
    });

    set({ goals: nextGoals });
    const userKey = get().activeUserKey ?? resolveCurrentUserKey();
    await persistSnapshot(userKey, {
      goals: nextGoals,
      liabilities: get().liabilities,
      goalEntries: get().goalEntries,
      liabilityPayments: get().liabilityPayments,
    });
  },

  deleteGoal: async (goalId) => {
    await get().initializeGoals();
    const nextGoals = get().goals.filter((goal) => goal.id !== goalId);
    const nextEntries = get().goalEntries.filter((entry) => entry.goalId !== goalId);
    set({ goals: nextGoals, goalEntries: nextEntries });
    const userKey = get().activeUserKey ?? resolveCurrentUserKey();
    await persistSnapshot(userKey, {
      goals: nextGoals,
      liabilities: get().liabilities,
      goalEntries: nextEntries,
      liabilityPayments: get().liabilityPayments,
    });
  },

  addSavingsToGoal: async (goalId, amount) => {
    await get().initializeGoals();
    const now = new Date().toISOString();
    const goal = get().goals.find((item) => item.id === goalId);
    if (!goal) throw new Error('Goal not found.');
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Savings amount must be greater than 0.');

    const remaining = Math.max(goal.targetAmount - goal.savedAmount, 0);
    if (amount > remaining) {
      throw new Error(`Amount exceeds remaining goal amount (Rs ${remaining}).`);
    }

    const nextGoals = get().goals.map((item) => {
      if (item.id !== goalId) return item;
      const savedAmount = item.savedAmount + amount;
      const nextStatus = getGoalStatus(savedAmount, item.targetAmount);
      return {
        ...item,
        savedAmount,
        status: nextStatus,
        completedAt: getCompletedAt(item.status, nextStatus, item.completedAt ?? null, now),
        updatedAt: now,
      };
    });

    const nextEntry: GoalSavingsEntry = {
      id: `goal-entry-${Date.now()}`,
      goalId,
      amount,
      kind: 'deposit',
      createdAt: now,
    };
    const nextEntries = [nextEntry, ...get().goalEntries];

    set({ goals: nextGoals, goalEntries: nextEntries });
    const userKey = get().activeUserKey ?? resolveCurrentUserKey();
    await persistSnapshot(userKey, {
      goals: nextGoals,
      liabilities: get().liabilities,
      goalEntries: nextEntries,
      liabilityPayments: get().liabilityPayments,
    });
  },

  withdrawSavingsFromGoal: async (goalId, amount) => {
    await get().initializeGoals();
    const now = new Date().toISOString();
    const goal = get().goals.find((item) => item.id === goalId);
    if (!goal) throw new Error('Goal not found.');
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Withdrawal amount must be greater than 0.');
    if (amount > goal.savedAmount) throw new Error('Withdrawal amount cannot exceed saved amount.');

    const nextGoals = get().goals.map((item) => {
      if (item.id !== goalId) return item;
      const savedAmount = item.savedAmount - amount;
      const nextStatus = getGoalStatus(savedAmount, item.targetAmount);
      return {
        ...item,
        savedAmount,
        status: nextStatus,
        completedAt: getCompletedAt(item.status, nextStatus, item.completedAt ?? null, now),
        updatedAt: now,
      };
    });

    const nextEntry: GoalSavingsEntry = {
      id: `goal-entry-${Date.now()}`,
      goalId,
      amount,
      kind: 'withdrawal',
      createdAt: now,
    };
    const nextEntries = [nextEntry, ...get().goalEntries];
    set({ goals: nextGoals, goalEntries: nextEntries });
    const userKey = get().activeUserKey ?? resolveCurrentUserKey();
    await persistSnapshot(userKey, {
      goals: nextGoals,
      liabilities: get().liabilities,
      goalEntries: nextEntries,
      liabilityPayments: get().liabilityPayments,
    });
  },

  deleteGoalEntry: async (entryId) => {
    await get().initializeGoals();
    const now = new Date().toISOString();
    const targetEntry = get().goalEntries.find((entry) => entry.id === entryId);
    if (!targetEntry) return;

    const goal = get().goals.find((item) => item.id === targetEntry.goalId);
    if (!goal) return;

    const nextGoals = get().goals.map((item) => {
      if (item.id !== targetEntry.goalId) return item;
      const nextSaved =
        targetEntry.kind === 'deposit'
          ? clampNumber(item.savedAmount - targetEntry.amount, 0, item.targetAmount)
          : clampNumber(item.savedAmount + targetEntry.amount, 0, item.targetAmount);
      const nextStatus = getGoalStatus(nextSaved, item.targetAmount);
      return {
        ...item,
        savedAmount: nextSaved,
        status: nextStatus,
        completedAt: getCompletedAt(item.status, nextStatus, item.completedAt ?? null, now),
        updatedAt: now,
      };
    });

    const nextEntries = get().goalEntries.filter((entry) => entry.id !== entryId);
    set({ goals: nextGoals, goalEntries: nextEntries });
    const userKey = get().activeUserKey ?? resolveCurrentUserKey();
    await persistSnapshot(userKey, {
      goals: nextGoals,
      liabilities: get().liabilities,
      goalEntries: nextEntries,
      liabilityPayments: get().liabilityPayments,
    });
  },

  addLiability: async ({ title, totalAmount, remainingAmount, monthlyPayment, type }) => {
    await get().initializeGoals();
    const now = new Date().toISOString();
    if (type === 'rent') {
      const hasRent = get().liabilities.some((item) => item.type === 'rent');
      if (hasRent) {
        throw new Error('Only one active rent is allowed. Update or delete existing rent first.');
      }
    }
    if (type !== 'rent') {
      if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
        throw new Error('Total amount must be greater than 0.');
      }
      if (remainingAmount !== undefined && (!Number.isFinite(remainingAmount) || remainingAmount < 0)) {
        throw new Error('Remaining amount must be 0 or greater.');
      }
      if (remainingAmount !== undefined && remainingAmount > totalAmount) {
        throw new Error('Remaining amount cannot exceed total amount.');
      }
    }
    if (type === 'emi') {
      const monthly = Number(monthlyPayment ?? 0);
      const base = remainingAmount ?? totalAmount;
      if (!Number.isFinite(monthly) || monthly <= 0) {
        throw new Error('Monthly EMI must be greater than 0.');
      }
      if (monthly > base) {
        throw new Error('Monthly EMI cannot exceed principal/remaining amount.');
      }
    }
    const total = type === 'rent' ? 0 : totalAmount;
    const remaining = type === 'rent' ? 0 : Math.max(0, Math.min(remainingAmount ?? totalAmount, totalAmount));
    const resolvedMonthly = type === 'debt' ? 0 : Number(monthlyPayment ?? 0);
    const next: LiabilityItem = {
      id: `liability-${Date.now()}`,
      title: title.trim(),
      totalAmount: total,
      remainingAmount: remaining,
      monthlyPayment: resolvedMonthly,
      type,
      createdAt: now,
      updatedAt: now,
    };

    const nextLiabilities = [next, ...get().liabilities];
    set({ liabilities: nextLiabilities });
    const userKey = get().activeUserKey ?? resolveCurrentUserKey();
    await persistSnapshot(userKey, {
      goals: get().goals,
      liabilities: nextLiabilities,
      goalEntries: get().goalEntries,
      liabilityPayments: get().liabilityPayments,
    });
  },

  updateLiability: async (liabilityId, payload) => {
    await get().initializeGoals();
    const now = new Date().toISOString();
    const nextLiabilities = get().liabilities.map((item) => {
      if (item.id !== liabilityId) return item;
      const nextType = payload.type ?? item.type;
      const nextTotal = nextType === 'rent' ? 0 : payload.totalAmount ?? item.totalAmount;
      const nextRemainingRaw = payload.remainingAmount ?? item.remainingAmount;
      const nextRemaining = nextType === 'rent' ? 0 : clampNumber(nextRemainingRaw, 0, nextTotal);
      const nextMonthly = nextType === 'debt' ? 0 : payload.monthlyPayment ?? item.monthlyPayment;
      return {
        ...item,
        title: payload.title?.trim() || item.title,
        monthlyPayment: nextMonthly,
        type: nextType,
        totalAmount: nextTotal,
        remainingAmount: nextRemaining,
        updatedAt: now,
      };
    });

    set({ liabilities: nextLiabilities });
    const userKey = get().activeUserKey ?? resolveCurrentUserKey();
    await persistSnapshot(userKey, {
      goals: get().goals,
      liabilities: nextLiabilities,
      goalEntries: get().goalEntries,
      liabilityPayments: get().liabilityPayments,
    });
  },

  deleteLiability: async (liabilityId) => {
    await get().initializeGoals();
    const nextLiabilities = get().liabilities.filter((item) => item.id !== liabilityId);
    const nextPayments = get().liabilityPayments.filter((entry) => entry.liabilityId !== liabilityId);
    set({ liabilities: nextLiabilities, liabilityPayments: nextPayments });
    const userKey = get().activeUserKey ?? resolveCurrentUserKey();
    await persistSnapshot(userKey, {
      goals: get().goals,
      liabilities: nextLiabilities,
      goalEntries: get().goalEntries,
      liabilityPayments: nextPayments,
    });
  },

  makeLiabilityPayment: async (liabilityId, amount, monthKey) => {
    await get().initializeGoals();
    const now = new Date().toISOString();
    const target = get().liabilities.find((item) => item.id === liabilityId);
    if (!target) return;

    let appliedAmount = amount;
    let appliedMonthKey = monthKey ?? toMonthKey();
    let nextLiabilities = get().liabilities;

    if (target.type === 'debt') {
      appliedAmount = Math.min(amount, target.remainingAmount);
      nextLiabilities = get().liabilities.map((item) => {
        if (item.id !== liabilityId) return item;
        return {
          ...item,
          remainingAmount: Math.max(0, item.remainingAmount - appliedAmount),
          updatedAt: now,
        };
      });
    } else if (target.type === 'emi') {
      const baseMonth = toMonthKey();
      const payments = get().liabilityPayments;
      let remainingTracker = target.remainingAmount;
      let nextPayableMonth = baseMonth;
      for (let i = 0; i < 120; i += 1) {
        const candidateMonth = addMonths(baseMonth, i);
        const paidThisMonth = payments
          .filter((entry) => entry.liabilityId === liabilityId && entry.monthKey === candidateMonth)
          .reduce((sum, entry) => sum + entry.amount, 0);
        const dueThisMonth = Math.max(Math.min(target.monthlyPayment - paidThisMonth, remainingTracker), 0);
        if (dueThisMonth > 0) {
          nextPayableMonth = candidateMonth;
          break;
        }
        remainingTracker -= Math.min(Math.max(target.monthlyPayment - paidThisMonth, 0), remainingTracker);
      }

      const selectedMonthKey = monthKey ?? nextPayableMonth;
      if (selectedMonthKey !== nextPayableMonth) {
        throw new Error(`Pay ${nextPayableMonth} EMI first before future months.`);
      }
      appliedMonthKey = selectedMonthKey;
      const paidThisMonth = get()
        .liabilityPayments
        .filter((entry) => entry.liabilityId === liabilityId && entry.monthKey === selectedMonthKey)
        .reduce((sum, entry) => sum + entry.amount, 0);
      const dueThisMonth = Math.max(Math.min(target.monthlyPayment - paidThisMonth, target.remainingAmount), 0);
      if (dueThisMonth <= 0) {
        throw new Error('Selected EMI month is already paid. Choose another month.');
      }
      appliedAmount = Math.min(amount, dueThisMonth);
      nextLiabilities = get().liabilities.map((item) => {
        if (item.id !== liabilityId) return item;
        return {
          ...item,
          remainingAmount: Math.max(0, item.remainingAmount - appliedAmount),
          updatedAt: now,
        };
      });
    } else {
      const baseMonth = toMonthKey();
      let selectedMonthKey = monthKey ?? baseMonth;
      if (!monthKey) {
        for (let i = 0; i < 120; i += 1) {
          const candidateMonth = addMonths(baseMonth, i);
          const paidForCandidate = get()
            .liabilityPayments
            .filter((entry) => entry.liabilityId === liabilityId && entry.monthKey === candidateMonth)
            .reduce((sum, entry) => sum + entry.amount, 0);
          const dueForCandidate = Math.max(target.monthlyPayment - paidForCandidate, 0);
          if (dueForCandidate > 0) {
            selectedMonthKey = candidateMonth;
            break;
          }
        }
      }
      const paidThisMonth = get()
        .liabilityPayments
        .filter((entry) => entry.liabilityId === liabilityId && entry.monthKey === selectedMonthKey)
        .reduce((sum, entry) => sum + entry.amount, 0);
      const dueThisMonth = Math.max(roundCurrency(target.monthlyPayment - paidThisMonth), 0);
      appliedAmount = Math.min(amount, dueThisMonth);
      appliedMonthKey = selectedMonthKey;
    }

    if (appliedAmount <= 0) return;

    const payment: LiabilityPaymentEntry = {
      id: `liability-payment-${Date.now()}`,
      liabilityId,
      amount: appliedAmount,
      monthKey: target.type === 'emi' ? appliedMonthKey : target.type === 'rent' ? appliedMonthKey : toMonthKey(),
      createdAt: now,
    };
    const nextPayments = [payment, ...get().liabilityPayments];

    set({ liabilities: nextLiabilities, liabilityPayments: nextPayments });
    const userKey = get().activeUserKey ?? resolveCurrentUserKey();
    await persistSnapshot(userKey, {
      goals: get().goals,
      liabilities: nextLiabilities,
      goalEntries: get().goalEntries,
      liabilityPayments: nextPayments,
    });
  },

  deleteLiabilityPayment: async (paymentId) => {
    await get().initializeGoals();
    const payment = get().liabilityPayments.find((entry) => entry.id === paymentId);
    if (!payment) return;

    const targetLiability = get().liabilities.find((item) => item.id === payment.liabilityId);
    if (!targetLiability) return;

    let nextLiabilities = get().liabilities;
    if (targetLiability.type !== 'rent') {
      nextLiabilities = get().liabilities.map((item) => {
        if (item.id !== targetLiability.id) return item;
        return {
          ...item,
          remainingAmount: clampNumber(item.remainingAmount + payment.amount, 0, item.totalAmount),
          updatedAt: new Date().toISOString(),
        };
      });
    }

    const nextPayments = get().liabilityPayments.filter((entry) => entry.id !== paymentId);
    set({ liabilities: nextLiabilities, liabilityPayments: nextPayments });
    const userKey = get().activeUserKey ?? resolveCurrentUserKey();
    await persistSnapshot(userKey, {
      goals: get().goals,
      liabilities: nextLiabilities,
      goalEntries: get().goalEntries,
      liabilityPayments: nextPayments,
    });
  },

  getRentDueForMonth: (liabilityId, monthKey = toMonthKey()) => {
    const item = get().liabilities.find((entry) => entry.id === liabilityId);
    if (!item || item.type !== 'rent') return 0;
    const paid = get()
      .liabilityPayments
      .filter((entry) => entry.liabilityId === liabilityId && entry.monthKey === monthKey)
      .reduce((sum, entry) => sum + entry.amount, 0);
    return Math.max(roundCurrency(item.monthlyPayment - paid), 0);
  },
  getEmiDueForMonth: (liabilityId, monthKey = toMonthKey()) => {
    const item = get().liabilities.find((entry) => entry.id === liabilityId);
    if (!item || item.type !== 'emi') return 0;
    if (item.remainingAmount <= 0) return 0;
    const paid = get()
      .liabilityPayments
      .filter((entry) => entry.liabilityId === liabilityId && entry.monthKey === monthKey)
      .reduce((sum, entry) => sum + entry.amount, 0);
    return Math.max(Math.min(item.monthlyPayment - paid, item.remainingAmount), 0);
  },
}));

useAuthStore.subscribe((state, prevState) => {
  const nextUserKey =
    state.user?.id ??
    state.user?._id ??
    (typeof state.user?.email === 'string' ? state.user.email.trim().toLowerCase() : '') ??
    'guest';
  const prevUserKey =
    prevState.user?.id ??
    prevState.user?._id ??
    (typeof prevState.user?.email === 'string' ? prevState.user.email.trim().toLowerCase() : '') ??
    'guest';

  if (String(nextUserKey || 'guest') === String(prevUserKey || 'guest')) {
    return;
  }

  const empty = getEmptySnapshot();
  useGoalsStore.setState({
    ...empty,
    activeUserKey: null,
    isHydrated: false,
  });
});
