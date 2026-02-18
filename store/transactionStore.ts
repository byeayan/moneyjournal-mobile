import { API_BASE_URL } from '@/config/api';
import { Transaction, TransactionMetrics } from '@/types/transaction';
import { create } from 'zustand';
import { useAuthStore } from './authStore';

function normalizeTransaction(raw: any): Transaction {
  return {
    id: raw?.id ?? raw?._id ?? `${Date.now()}-${Math.random()}`,
    amount: Number(raw?.amount ?? 0),
    description: raw?.description ?? '',
    category: raw?.category ?? 'Other',
    type: raw?.type === 'income' ? 'income' : 'expense',
    date: raw?.date ?? raw?.createdAt ?? new Date().toISOString(),
    account: raw?.account,
  };
}

interface TransactionState {
  transactions: Transaction[];
  calendarTransactions: Transaction[];
  transactionMetrics: TransactionMetrics;
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
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

  fetchTransactions: async (date: Date | string) => {
    const token = useAuthStore.getState().authToken;
    if (!token) throw new Error('No auth token found');

    const day = new Date(date).toISOString().split('T')[0];

    const response = await fetch(`${API_BASE_URL}/transactions?date=${day}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (response.ok) {
      const normalized = Array.isArray(data) ? data.map(normalizeTransaction) : [];
      set({ transactions: normalized });
    } else {
      throw new Error(data.message || 'Fetching transactions failed');
    }
  },

  fetchTransactionsByMonth: async (date: Date | string) => {
    const token = useAuthStore.getState().authToken;
    if (!token) throw new Error('No auth token found');

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
