import { API_BASE_URL } from '@/config/api';
import { useAuthStore } from '@/store/authStore';
import { create } from 'zustand';
import type {
  GoalSavingsEntry,
  LiabilityItem,
  LiabilityPaymentEntry,
  LiabilityType,
  SavingsGoal,
} from '@/types/goal';

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

function normalizeGoal(goal: any): SavingsGoal {
  const saved = Number(goal?.savedAmount ?? 0);
  const target = Number(goal?.targetAmount ?? 0);
  const status = getGoalStatus(saved, target);
  return {
    id: String(goal._id ?? goal.id),
    title: String(goal.title ?? ''),
    targetAmount: target,
    savedAmount: saved,
    status,
    createdAt: goal.createdAt ?? new Date().toISOString(),
    updatedAt: goal.updatedAt ?? new Date().toISOString(),
    completedAt: goal.completedAt ?? (status === 'completed' ? goal.updatedAt ?? goal.createdAt ?? null : null),
  };
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = await useAuthStore.getState().requireValidToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error((data as any)?.message || `Request failed: ${path}`);
  }
  return response.json();
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
  isHydrated: boolean;
  initializeGoals: () => Promise<void>;
  refreshGoals: () => Promise<void>;
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
  isHydrated: false,

  initializeGoals: async () => {
    set({ isHydrated: false });
    try {
      const data = await apiFetch('/goals');
      const rawGoals = Array.isArray(data.goals) ? data.goals : Array.isArray(data) ? data : [];
      const goals = rawGoals.map(normalizeGoal);
      const goalEntries: GoalSavingsEntry[] = Array.isArray(data.goalEntries)
        ? data.goalEntries.map((e: any) => ({
            id: String(e._id ?? e.id),
            goalId: String(e.goalId),
            amount: Number(e.amount),
            kind: e.kind,
            createdAt: e.createdAt ?? new Date().toISOString(),
          }))
        : [];
      set({ goals, goalEntries, isHydrated: true });
    } catch {
      set({ isHydrated: true });
    }
  },

  refreshGoals: async () => {
    await get().initializeGoals();
  },

  addGoal: async ({ title, targetAmount, savedAmount = 0 }) => {
    const clampedSaved = clampNumber(savedAmount, 0, targetAmount);
    const created = await apiFetch('/goals', {
      method: 'POST',
      body: JSON.stringify({ title: title.trim(), targetAmount, savedAmount: clampedSaved }),
    });
    const next = normalizeGoal(created.goal ?? created);
    set({ goals: [next, ...get().goals] });

    if (clampedSaved > 0) {
      const entry: GoalSavingsEntry = {
        id: `goal-entry-${Date.now()}`,
        goalId: next.id,
        amount: clampedSaved,
        kind: 'deposit',
        createdAt: new Date().toISOString(),
      };
      set({ goalEntries: [entry, ...get().goalEntries] });
    }
  },

  updateGoal: async (goalId, payload) => {
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
  },

  deleteGoal: async (goalId) => {
    try {
      await apiFetch(`/goals/${goalId}`, { method: 'DELETE' });
    } catch {
      // proceed with local removal even if API fails
    }
    set({
      goals: get().goals.filter((g) => g.id !== goalId),
      goalEntries: get().goalEntries.filter((e) => e.goalId !== goalId),
    });
  },

  addSavingsToGoal: async (goalId, amount) => {
    const now = new Date().toISOString();
    const goal = get().goals.find((item) => item.id === goalId);
    if (!goal) throw new Error('Goal not found.');
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Savings amount must be greater than 0.');
    const remaining = Math.max(goal.targetAmount - goal.savedAmount, 0);
    if (amount > remaining) throw new Error(`Amount exceeds remaining goal amount (Rs ${remaining}).`);

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
    const entry: GoalSavingsEntry = {
      id: `goal-entry-${Date.now()}`,
      goalId,
      amount,
      kind: 'deposit',
      createdAt: now,
    };
    set({ goals: nextGoals, goalEntries: [entry, ...get().goalEntries] });
  },

  withdrawSavingsFromGoal: async (goalId, amount) => {
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
    const entry: GoalSavingsEntry = {
      id: `goal-entry-${Date.now()}`,
      goalId,
      amount,
      kind: 'withdrawal',
      createdAt: now,
    };
    set({ goals: nextGoals, goalEntries: [entry, ...get().goalEntries] });
  },

  deleteGoalEntry: async (entryId) => {
    const now = new Date().toISOString();
    const targetEntry = get().goalEntries.find((e) => e.id === entryId);
    if (!targetEntry) return;

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
    set({ goals: nextGoals, goalEntries: get().goalEntries.filter((e) => e.id !== entryId) });
  },

  addLiability: async ({ title, totalAmount, remainingAmount, monthlyPayment, type }) => {
    const now = new Date().toISOString();
    if (type === 'rent' && get().liabilities.some((item) => item.type === 'rent')) {
      throw new Error('Only one active rent is allowed. Update or delete existing rent first.');
    }
    if (type !== 'rent') {
      if (!Number.isFinite(totalAmount) || totalAmount <= 0) throw new Error('Total amount must be greater than 0.');
      if (remainingAmount !== undefined && (!Number.isFinite(remainingAmount) || remainingAmount < 0)) throw new Error('Remaining amount must be 0 or greater.');
      if (remainingAmount !== undefined && remainingAmount > totalAmount) throw new Error('Remaining amount cannot exceed total amount.');
    }
    if (type === 'emi') {
      const monthly = Number(monthlyPayment ?? 0);
      const base = remainingAmount ?? totalAmount;
      if (!Number.isFinite(monthly) || monthly <= 0) throw new Error('Monthly EMI must be greater than 0.');
      if (monthly > base) throw new Error('Monthly EMI cannot exceed principal/remaining amount.');
    }
    const next: LiabilityItem = {
      id: `liability-${Date.now()}`,
      title: title.trim(),
      totalAmount: type === 'rent' ? 0 : totalAmount,
      remainingAmount: type === 'rent' ? 0 : Math.max(0, Math.min(remainingAmount ?? totalAmount, totalAmount)),
      monthlyPayment: type === 'debt' ? 0 : Number(monthlyPayment ?? 0),
      type,
      createdAt: now,
      updatedAt: now,
    };
    set({ liabilities: [next, ...get().liabilities] });
  },

  updateLiability: async (liabilityId, payload) => {
    const now = new Date().toISOString();
    const nextLiabilities = get().liabilities.map((item) => {
      if (item.id !== liabilityId) return item;
      const nextType = payload.type ?? item.type;
      const nextTotal = nextType === 'rent' ? 0 : payload.totalAmount ?? item.totalAmount;
      const nextRemaining = nextType === 'rent' ? 0 : clampNumber(payload.remainingAmount ?? item.remainingAmount, 0, nextTotal);
      const nextMonthly = nextType === 'debt' ? 0 : payload.monthlyPayment ?? item.monthlyPayment;
      return { ...item, title: payload.title?.trim() || item.title, monthlyPayment: nextMonthly, type: nextType, totalAmount: nextTotal, remainingAmount: nextRemaining, updatedAt: now };
    });
    set({ liabilities: nextLiabilities });
  },

  deleteLiability: async (liabilityId) => {
    set({
      liabilities: get().liabilities.filter((item) => item.id !== liabilityId),
      liabilityPayments: get().liabilityPayments.filter((e) => e.liabilityId !== liabilityId),
    });
  },

  makeLiabilityPayment: async (liabilityId, amount, monthKey) => {
    const now = new Date().toISOString();
    const target = get().liabilities.find((item) => item.id === liabilityId);
    if (!target) return;

    let appliedAmount = amount;
    let appliedMonthKey = monthKey ?? toMonthKey();
    let nextLiabilities = get().liabilities;

    if (target.type === 'debt') {
      appliedAmount = Math.min(amount, target.remainingAmount);
      nextLiabilities = get().liabilities.map((item) =>
        item.id !== liabilityId ? item : { ...item, remainingAmount: Math.max(0, item.remainingAmount - appliedAmount), updatedAt: now }
      );
    } else if (target.type === 'emi') {
      const baseMonth = toMonthKey();
      const payments = get().liabilityPayments;
      let remainingTracker = target.remainingAmount;
      let nextPayableMonth = baseMonth;
      for (let i = 0; i < 120; i += 1) {
        const candidateMonth = addMonths(baseMonth, i);
        const paidThisMonth = payments.filter((e) => e.liabilityId === liabilityId && e.monthKey === candidateMonth).reduce((s, e) => s + e.amount, 0);
        const dueThisMonth = Math.max(Math.min(target.monthlyPayment - paidThisMonth, remainingTracker), 0);
        if (dueThisMonth > 0) { nextPayableMonth = candidateMonth; break; }
        remainingTracker -= Math.min(Math.max(target.monthlyPayment - paidThisMonth, 0), remainingTracker);
      }
      const selectedMonthKey = monthKey ?? nextPayableMonth;
      if (selectedMonthKey !== nextPayableMonth) throw new Error(`Pay ${nextPayableMonth} EMI first before future months.`);
      appliedMonthKey = selectedMonthKey;
      const paidThisMonth = get().liabilityPayments.filter((e) => e.liabilityId === liabilityId && e.monthKey === selectedMonthKey).reduce((s, e) => s + e.amount, 0);
      const dueThisMonth = Math.max(Math.min(target.monthlyPayment - paidThisMonth, target.remainingAmount), 0);
      if (dueThisMonth <= 0) throw new Error('Selected EMI month is already paid. Choose another month.');
      appliedAmount = Math.min(amount, dueThisMonth);
      nextLiabilities = get().liabilities.map((item) =>
        item.id !== liabilityId ? item : { ...item, remainingAmount: Math.max(0, item.remainingAmount - appliedAmount), updatedAt: now }
      );
    } else {
      const baseMonth = toMonthKey();
      let selectedMonthKey = monthKey ?? baseMonth;
      if (!monthKey) {
        for (let i = 0; i < 120; i += 1) {
          const candidateMonth = addMonths(baseMonth, i);
          const paid = get().liabilityPayments.filter((e) => e.liabilityId === liabilityId && e.monthKey === candidateMonth).reduce((s, e) => s + e.amount, 0);
          if (Math.max(target.monthlyPayment - paid, 0) > 0) { selectedMonthKey = candidateMonth; break; }
        }
      }
      const paidThisMonth = get().liabilityPayments.filter((e) => e.liabilityId === liabilityId && e.monthKey === selectedMonthKey).reduce((s, e) => s + e.amount, 0);
      appliedAmount = Math.min(amount, Math.max(roundCurrency(target.monthlyPayment - paidThisMonth), 0));
      appliedMonthKey = selectedMonthKey;
    }

    if (appliedAmount <= 0) return;

    const payment: LiabilityPaymentEntry = {
      id: `liability-payment-${Date.now()}`,
      liabilityId,
      amount: appliedAmount,
      monthKey: target.type === 'debt' ? toMonthKey() : appliedMonthKey,
      createdAt: now,
    };
    set({ liabilities: nextLiabilities, liabilityPayments: [payment, ...get().liabilityPayments] });
  },

  deleteLiabilityPayment: async (paymentId) => {
    const payment = get().liabilityPayments.find((e) => e.id === paymentId);
    if (!payment) return;
    const targetLiability = get().liabilities.find((item) => item.id === payment.liabilityId);
    if (!targetLiability) return;

    const nextLiabilities = targetLiability.type !== 'rent'
      ? get().liabilities.map((item) =>
          item.id !== targetLiability.id ? item : { ...item, remainingAmount: clampNumber(item.remainingAmount + payment.amount, 0, item.totalAmount), updatedAt: new Date().toISOString() }
        )
      : get().liabilities;

    set({ liabilities: nextLiabilities, liabilityPayments: get().liabilityPayments.filter((e) => e.id !== paymentId) });
  },

  getRentDueForMonth: (liabilityId, monthKey = toMonthKey()) => {
    const item = get().liabilities.find((e) => e.id === liabilityId);
    if (!item || item.type !== 'rent') return 0;
    const paid = get().liabilityPayments.filter((e) => e.liabilityId === liabilityId && e.monthKey === monthKey).reduce((s, e) => s + e.amount, 0);
    return Math.max(roundCurrency(item.monthlyPayment - paid), 0);
  },

  getEmiDueForMonth: (liabilityId, monthKey = toMonthKey()) => {
    const item = get().liabilities.find((e) => e.id === liabilityId);
    if (!item || item.type !== 'emi' || item.remainingAmount <= 0) return 0;
    const paid = get().liabilityPayments.filter((e) => e.liabilityId === liabilityId && e.monthKey === monthKey).reduce((s, e) => s + e.amount, 0);
    return Math.max(Math.min(item.monthlyPayment - paid, item.remainingAmount), 0);
  },
}));

useAuthStore.subscribe((state, prevState) => {
  const key = (s: any) => String(s.user?.id ?? s.user?._id ?? (typeof s.user?.email === 'string' ? s.user.email.trim().toLowerCase() : '') ?? 'guest');
  if (key(state) === key(prevState)) return;
  useGoalsStore.setState({ goals: [], liabilities: [], goalEntries: [], liabilityPayments: [], isHydrated: false });
});
