import { API_BASE_URL } from '@/config/api'; // don’t forget this import
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
  getTransactionMetrics: () => Promise<any>; // returning metrics data
}

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
  try {
    const token = useAuthStore.getState().authToken;

    if (!token) throw new Error("No auth token found");

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

    // data contains metrics like totalIncome, totalExpense, balance
    return data;
  } catch (error) {
    console.error("Error fetching transaction metrics:", error);
    throw error;
  }
}}))
