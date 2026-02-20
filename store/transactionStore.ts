import { API_BASE_URL } from '@/config/api';
import { Transaction, TransactionMetrics } from '@/types/transaction';
import { create } from 'zustand';
import { useAuthStore } from './authStore';

function toLocalDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
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

async function readResponseBody(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function extractErrorMessage(body: any, fallback: string) {
  if (body && typeof body.message === 'string') return body.message;
  return fallback;
}

let latestDayFetchRequestId = 0;
let latestMonthFetchRequestId = 0;

interface TransactionState {
  transactions: Transaction[];
  calendarTransactions: Transaction[];
  transactionMetrics: TransactionMetrics;
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (id: string, payload: Partial<Omit<Transaction, 'id'>>) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  fetchTransactions: (date: Date | string) => Promise<void>;
  fetchTransactionsByMonth: (date: Date | string) => Promise<void>;
  getTransactionMetrics: () => Promise<TransactionMetrics>;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  calendarTransactions: [],
  transactionMetrics: { monthlyIncome: 0, monthlyExpense: 0 },
  setTransactions: (transactions: Transaction[]) => set({ transactions }),
  addTransaction: async (transaction) => {
    try {
      if (!transaction.note || !transaction.note.trim()) {
        throw new Error('Note is required.');
      }

      const token = await useAuthStore.getState().requireValidToken();

      const response = await fetch(`${API_BASE_URL}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(transaction),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to add transaction.');
      }

      const createdTransaction = normalizeTransaction(responseData.transaction);

      set((state) => ({
        transactions: [createdTransaction, ...state.transactions],
        calendarTransactions: [createdTransaction, ...state.calendarTransactions],
      }));

      await get().getTransactionMetrics();
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error adding transaction:', error.message);
      } else {
        console.error('Error adding transaction: An unknown error occurred.', error);
      }
      throw error;
    }
  },

  updateTransaction: async (id, payload) => {
    const token = await useAuthStore.getState().requireValidToken();

    const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const body = await readResponseBody(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(body, `Failed to update transaction (${response.status})`));
    }

    const updatedRaw = (body as any)?.transaction ?? body ?? { ...payload, id };
    const updatedTransaction = normalizeTransaction({ ...updatedRaw, id });

    set((state) => ({
      transactions: state.transactions.map((t) => (t.id === id ? updatedTransaction : t)),
      calendarTransactions: state.calendarTransactions.map((t) => (t.id === id ? updatedTransaction : t)),
    }));

    await get().getTransactionMetrics();
    return updatedTransaction;
  },

  deleteTransaction: async (id) => {
    const token = await useAuthStore.getState().requireValidToken();

    const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const body = await readResponseBody(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(body, `Failed to delete transaction (${response.status})`));
    }

    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
      calendarTransactions: state.calendarTransactions.filter((t) => t.id !== id),
    }));

    await get().getTransactionMetrics();
  },

  fetchTransactions: async (date: Date | string) => {
    const token = await useAuthStore.getState().requireValidToken();
    const requestId = ++latestDayFetchRequestId;

    const day = toLocalDateKey(new Date(date));

    const response = await fetch(`${API_BASE_URL}/transactions?date=${day}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (response.ok) {
      if (requestId !== latestDayFetchRequestId) return;
      const normalized = Array.isArray(data) ? data.map(normalizeTransaction) : [];
      set({ transactions: normalized });
    } else {
      throw new Error(data.message || 'Fetching transactions failed');
    }
  },

  fetchTransactionsByMonth: async (date: Date | string) => {
    const token = await useAuthStore.getState().requireValidToken();
    const requestId = ++latestMonthFetchRequestId;

    const d = new Date(date);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();

    const response = await fetch(
      `${API_BASE_URL}/transactions?month=${month}&year=${year}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();
    if (response.ok) {
      if (requestId !== latestMonthFetchRequestId) return;
      const normalized = Array.isArray(data) ? data.map(normalizeTransaction) : [];
      set({ calendarTransactions: normalized });
    } else {
      throw new Error(data.message || 'Fetching monthly transactions failed');
    }
  },

  getTransactionMetrics: async () => {
    try {
      const token = await useAuthStore.getState().requireValidToken();

      const response = await fetch(`${API_BASE_URL}/transactions/metrics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch transaction metrics');
      }
      set({ transactionMetrics: data });
      return data;
    } catch (error) {
      console.error('Error fetching transaction metrics:', error);
      throw error;
    }
  },
}));
