import { API_BASE_URL } from '@/config/api';
import { Transaction, TransactionMetrics } from '@/types/transaction';
import { create } from 'zustand';
import { useAuthStore } from './authStore';

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your internet connection and try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

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

function extractTransactionList(body: any): any[] {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.transactions)) return body.transactions;
  if (Array.isArray(body?.data)) return body.data;
  return [];
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
  fetchTransactionsForMonth: (date: Date | string) => Promise<Transaction[]>;
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

      const response = await fetchWithTimeout(`${API_BASE_URL}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(transaction),
      });

      const responseData = await readResponseBody(response);

      if (!response.ok) {
        throw new Error(extractErrorMessage(responseData, 'Failed to add transaction.'));
      }

      const createdTransaction = normalizeTransaction((responseData as any)?.transaction ?? responseData);

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

    const response = await fetchWithTimeout(`${API_BASE_URL}/transactions/${id}`, {
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

    const response = await fetchWithTimeout(`${API_BASE_URL}/transactions/${id}`, {
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

    const response = await fetchWithTimeout(`${API_BASE_URL}/transactions?date=${day}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await readResponseBody(response);
    if (response.ok) {
      if (requestId !== latestDayFetchRequestId) return;
      const normalized = extractTransactionList(data).map(normalizeTransaction);
      set({ transactions: normalized });
    } else {
      throw new Error(extractErrorMessage(data, 'Fetching transactions failed'));
    }
  },

  fetchTransactionsByMonth: async (date: Date | string) => {
    const token = await useAuthStore.getState().requireValidToken();
    const requestId = ++latestMonthFetchRequestId;

    const d = new Date(date);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();

    const response = await fetchWithTimeout(`${API_BASE_URL}/transactions?month=${month}&year=${year}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await readResponseBody(response);
    if (response.ok) {
      if (requestId !== latestMonthFetchRequestId) return;
      const normalized = extractTransactionList(data).map(normalizeTransaction);
      set({ calendarTransactions: normalized });
    } else {
      throw new Error(extractErrorMessage(data, 'Fetching monthly transactions failed'));
    }
  },

  fetchTransactionsForMonth: async (date: Date | string) => {
    const token = await useAuthStore.getState().requireValidToken();

    const d = new Date(date);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();

    const response = await fetchWithTimeout(`${API_BASE_URL}/transactions?month=${month}&year=${year}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await readResponseBody(response);
    if (response.ok) {
      return extractTransactionList(data).map(normalizeTransaction);
    }

    throw new Error(extractErrorMessage(data, 'Fetching monthly transactions failed'));
  },

  getTransactionMetrics: async () => {
    try {
      const token = await useAuthStore.getState().requireValidToken();

      const response = await fetchWithTimeout(`${API_BASE_URL}/transactions/metrics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await readResponseBody(response);

      if (!response.ok) {
        throw new Error(extractErrorMessage(data, 'Failed to fetch transaction metrics'));
      }
      const metrics = {
        monthlyIncome: Number((data as any)?.monthlyIncome ?? 0),
        monthlyExpense: Number((data as any)?.monthlyExpense ?? 0),
      };
      set({ transactionMetrics: metrics });
      return metrics;
    } catch (error) {
      console.error('Error fetching transaction metrics:', error);
      throw error;
    }
  },
}));
