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
  fetchTransactions: () => Promise<void>;
  getTransactionMetrics: () => Promise<void>;
}

const token = useAuthStore.getState().authToken;

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  setTransactions: (transactions) => set({ transactions }),
  addTransaction: async (transaction) => {
    // ZIYAUDDIN
  },
  fetchTransactions: async () => {
    // FARIZ
  },
  getTransactionMetrics: async () => {
    // Ayan
  }
}));