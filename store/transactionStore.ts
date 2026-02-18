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
      const token = useAuthStore.getState().authToken;
      if (!token) {
        throw new Error('Authentication token is missing. Please log in.');
      }

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
    const token = useAuthStore.getState().authToken;
    if (!token) throw new Error('No auth token found');

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const attempts: Array<{ method: 'PUT' | 'PATCH' | 'POST'; url: string; body: any }> = [
      { method: 'PUT', url: `${API_BASE_URL}/transactions/${id}`, body: payload },
      { method: 'PATCH', url: `${API_BASE_URL}/transactions/${id}`, body: payload },
      { method: 'PUT', url: `${API_BASE_URL}/transactions`, body: { id, ...payload } },
      { method: 'PATCH', url: `${API_BASE_URL}/transactions`, body: { id, ...payload } },
      { method: 'PUT', url: `${API_BASE_URL}/transactions`, body: { _id: id, ...payload } },
      { method: 'PATCH', url: `${API_BASE_URL}/transactions`, body: { _id: id, ...payload } },
      { method: 'POST', url: `${API_BASE_URL}/transactions/update/${id}`, body: payload },
      { method: 'POST', url: `${API_BASE_URL}/transactions/update`, body: { id, ...payload } },
      { method: 'POST', url: `${API_BASE_URL}/transactions/update`, body: { _id: id, ...payload } },
      { method: 'POST', url: `${API_BASE_URL}/transactions/${id}`, body: payload },
    ];

    let lastError = 'Failed to update transaction';
    let updatedTransaction: Transaction | null = null;

    for (const attempt of attempts) {
      const response = await fetch(attempt.url, {
        method: attempt.method,
        headers,
        body: JSON.stringify(attempt.body),
      });

      const body = await readResponseBody(response);
      if (response.ok) {
        const updatedRaw = (body as any)?.transaction ?? body ?? { ...payload, id };
        updatedTransaction = normalizeTransaction({ ...updatedRaw, id });
        break;
      }

      lastError = extractErrorMessage(body, `Failed to update transaction (${response.status})`);
      if (![400, 404, 405].includes(response.status)) break;
    }

    if (!updatedTransaction) {
      throw new Error(lastError);
    }

    set((state) => ({
      transactions: state.transactions.map((t) => (t.id === id ? updatedTransaction : t)),
      calendarTransactions: state.calendarTransactions.map((t) => (t.id === id ? updatedTransaction : t)),
    }));

    await get().getTransactionMetrics();
    return updatedTransaction;
  },

  deleteTransaction: async (id) => {
    const token = useAuthStore.getState().authToken;
    if (!token) throw new Error('No auth token found');

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const attempts: Array<{ method: 'DELETE' | 'POST'; url: string; body?: any }> = [
      { method: 'DELETE', url: `${API_BASE_URL}/transactions/${id}` },
      { method: 'DELETE', url: `${API_BASE_URL}/transactions`, body: { id } },
      { method: 'DELETE', url: `${API_BASE_URL}/transactions`, body: { _id: id } },
      { method: 'POST', url: `${API_BASE_URL}/transactions/delete/${id}` },
      { method: 'POST', url: `${API_BASE_URL}/transactions/delete`, body: { id } },
      { method: 'POST', url: `${API_BASE_URL}/transactions/delete`, body: { _id: id } },
      { method: 'POST', url: `${API_BASE_URL}/transactions/${id}/delete` },
      { method: 'DELETE', url: `${API_BASE_URL}/transactions/${id}` },
      { method: 'DELETE', url: `${API_BASE_URL}/transactions`, body: { id } },
    ];

    let deleted = false;
    let lastError = 'Failed to delete transaction';

    for (const attempt of attempts) {
      const response = await fetch(attempt.url, {
        method: attempt.method,
        headers,
        body: attempt.body ? JSON.stringify(attempt.body) : undefined,
      });

      const body = await readResponseBody(response);

      if (response.ok) {
        deleted = true;
        break;
      }

      lastError = extractErrorMessage(body, `Failed to delete transaction (${response.status})`);
      if (![400, 404, 405].includes(response.status)) break;
    }

    if (!deleted) {
      throw new Error(lastError);
    }

    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
      calendarTransactions: state.calendarTransactions.filter((t) => t.id !== id),
    }));

    await get().getTransactionMetrics();
  },

  fetchTransactions: async (date: Date | string) => {
    const token = useAuthStore.getState().authToken;
    if (!token) throw new Error('No auth token found');
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
    const token = useAuthStore.getState().authToken;
    if (!token) throw new Error('No auth token found');
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
      const token = useAuthStore.getState().authToken;

      if (!token) throw new Error('No auth token found');

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
