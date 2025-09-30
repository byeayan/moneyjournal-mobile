import { API_BASE_URL } from '@/config/api';
import { create } from 'zustand';
import { useAuthStore } from './authStore';


interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  type: 'income' | 'expense';
  date: string;
}

interface TransactionState {
  transactions: Transaction[];
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  fetchTransactions: (date) => Promise<void>;
  getTransactionMetrics: () => Promise<void>;
}

const token = useAuthStore.getState().authToken;

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  setTransactions: (transactions: Transaction[]) => set({ transactions }),
  addTransaction: async (transaction) => {
    // ZIYAUDDIN
  },
  fetchTransactions: async (date) => {
    const today = new Date(date).toISOString().split("T")[0];

    const response = await fetch(`${API_BASE_URL}/transactions?date=${today}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (response.ok) {
      set({ transactions: data });
    } else {
      throw new Error(data.message || "Fetching transactions failed");
    }
  },

  getTransactionMetrics: async () => {
    // Ayan
  }
}));