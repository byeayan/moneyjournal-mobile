import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import type { BudgetLimit } from '@/types/budget';

const BUDGET_LIMITS_KEY = 'budget_limits_v1';
const BUDGET_TOTALS_KEY = 'budget_totals_v1';

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
  isHydrated: boolean;
  initializeBudgets: () => Promise<void>;
  setBudgetLimit: (month: string, category: string, amount: number) => Promise<void>;
  setMonthlyTotal: (month: string, amount: number) => Promise<void>;
  deleteBudgetLimit: (month: string, category: string) => Promise<void>;
  getMonthlyTotal: (month: string) => number;
  getBudgetsByMonth: (month: string) => BudgetLimit[];
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  budgets: [],
  monthlyTotals: {},
  isHydrated: false,

  initializeBudgets: async () => {
    try {
      const [rawLimits, rawTotals] = await Promise.all([
        AsyncStorage.getItem(BUDGET_LIMITS_KEY),
        AsyncStorage.getItem(BUDGET_TOTALS_KEY),
      ]);

      const parsedLimits = rawLimits ? JSON.parse(rawLimits) : [];
      const parsedTotals = rawTotals ? JSON.parse(rawTotals) : {};

      set({
        budgets: Array.isArray(parsedLimits) ? parsedLimits : [],
        monthlyTotals:
          parsedTotals && typeof parsedTotals === 'object' && !Array.isArray(parsedTotals)
            ? parsedTotals
            : {},
        isHydrated: true,
      });
    } catch {
      set({ isHydrated: true });
    }
  },

  setBudgetLimit: async (month, category, amount) => {
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
    await AsyncStorage.setItem(BUDGET_LIMITS_KEY, JSON.stringify(nextBudgets));
  },

  setMonthlyTotal: async (month, amount) => {
    const nextTotals = { ...get().monthlyTotals, [month]: amount };
    set({ monthlyTotals: nextTotals });
    await AsyncStorage.setItem(BUDGET_TOTALS_KEY, JSON.stringify(nextTotals));
  },

  deleteBudgetLimit: async (month, category) => {
    const normalizedCategory = normalizeCategory(category);
    const nextBudgets = get().budgets.filter(
      (item) => !(item.month === month && normalizeCategory(item.category) === normalizedCategory)
    );
    set({ budgets: nextBudgets });
    await AsyncStorage.setItem(BUDGET_LIMITS_KEY, JSON.stringify(nextBudgets));
  },

  getMonthlyTotal: (month) => get().monthlyTotals[month] ?? 0,
  getBudgetsByMonth: (month) => get().budgets.filter((item) => item.month === month),
}));

export { toMonthKey };
