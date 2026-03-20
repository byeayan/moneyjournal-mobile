import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/store/authStore';
import { create } from 'zustand';
import type { BudgetLimit } from '@/types/budget';

const BUDGET_LIMITS_KEY_PREFIX = 'budget_limits_v2';
const BUDGET_TOTALS_KEY_PREFIX = 'budget_totals_v2';

function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function normalizeCategory(category: string) {
  return category.trim().toLowerCase();
}

function toDisplayCategory(category: string) {
  return category
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

interface BudgetState {
  budgets: BudgetLimit[];
  monthlyTotals: Record<string, number>;
  activeUserKey: string | null;
  isHydrated: boolean;
  initializeBudgets: () => Promise<void>;
  setBudgetLimit: (month: string, category: string, amount: number) => Promise<void>;
  setMonthlyTotal: (month: string, amount: number) => Promise<void>;
  deleteBudgetLimit: (month: string, category: string) => Promise<void>;
  getMonthlyTotal: (month: string) => number;
  getBudgetsByMonth: (month: string) => BudgetLimit[];
}

function resolveCurrentUserKey() {
  const user = useAuthStore.getState().user;
  const rawKey =
    user?.id ??
    user?._id ??
    (typeof user?.email === 'string' ? user.email.trim().toLowerCase() : '');
  return rawKey ? String(rawKey) : 'guest';
}

function buildBudgetStorageKeys(userKey: string) {
  return {
    limits: `${BUDGET_LIMITS_KEY_PREFIX}:${userKey}`,
    totals: `${BUDGET_TOTALS_KEY_PREFIX}:${userKey}`,
  };
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  budgets: [],
  monthlyTotals: {},
  activeUserKey: null,
  isHydrated: false,

  initializeBudgets: async () => {
    const currentUserKey = resolveCurrentUserKey();
    if (get().isHydrated && get().activeUserKey === currentUserKey) {
      return;
    }

    set({ isHydrated: false });

    try {
      const keys = buildBudgetStorageKeys(currentUserKey);
      const [rawLimits, rawTotals] = await Promise.all([
        AsyncStorage.getItem(keys.limits),
        AsyncStorage.getItem(keys.totals),
      ]);

      const parsedLimits = rawLimits ? JSON.parse(rawLimits) : [];
      const parsedTotals = rawTotals ? JSON.parse(rawTotals) : {};

      set({
        budgets: Array.isArray(parsedLimits) ? parsedLimits : [],
        monthlyTotals:
          parsedTotals && typeof parsedTotals === 'object' && !Array.isArray(parsedTotals)
            ? parsedTotals
            : {},
        activeUserKey: currentUserKey,
        isHydrated: true,
      });
    } catch {
      set({ budgets: [], monthlyTotals: {}, activeUserKey: currentUserKey, isHydrated: true });
    }
  },

  setBudgetLimit: async (month, category, amount) => {
    await get().initializeBudgets();
    const normalizedCategory = normalizeCategory(category);
    const displayCategory = toDisplayCategory(category);
    const now = new Date().toISOString();
    const nextBudgets = [...get().budgets];

    const index = nextBudgets.findIndex(
      (item) => item.month === month && normalizeCategory(item.category) === normalizedCategory
    );

    if (index >= 0) {
      nextBudgets[index] = {
        ...nextBudgets[index],
        amount,
        category: displayCategory,
        updatedAt: now,
      };
    } else {
      nextBudgets.push({
        id: `${month}-${normalizedCategory}`,
        month,
        category: displayCategory,
        amount,
        createdAt: now,
        updatedAt: now,
      });
    }

    set({ budgets: nextBudgets });
    const keys = buildBudgetStorageKeys(get().activeUserKey ?? resolveCurrentUserKey());
    await AsyncStorage.setItem(keys.limits, JSON.stringify(nextBudgets));
  },

  setMonthlyTotal: async (month, amount) => {
    await get().initializeBudgets();
    const nextTotals = { ...get().monthlyTotals, [month]: amount };
    set({ monthlyTotals: nextTotals });
    const keys = buildBudgetStorageKeys(get().activeUserKey ?? resolveCurrentUserKey());
    await AsyncStorage.setItem(keys.totals, JSON.stringify(nextTotals));
  },

  deleteBudgetLimit: async (month, category) => {
    await get().initializeBudgets();
    const normalizedCategory = normalizeCategory(category);
    const nextBudgets = get().budgets.filter(
      (item) => !(item.month === month && normalizeCategory(item.category) === normalizedCategory)
    );
    set({ budgets: nextBudgets });
    const keys = buildBudgetStorageKeys(get().activeUserKey ?? resolveCurrentUserKey());
    await AsyncStorage.setItem(keys.limits, JSON.stringify(nextBudgets));
  },

  getMonthlyTotal: (month) => get().monthlyTotals[month] ?? 0,
  getBudgetsByMonth: (month) => get().budgets.filter((item) => item.month === month),
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

  useBudgetStore.setState({
    budgets: [],
    monthlyTotals: {},
    activeUserKey: null,
    isHydrated: false,
  });
});

export { toMonthKey };
