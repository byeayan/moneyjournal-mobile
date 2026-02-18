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
  transactionMetrics: TransactionMetrics;
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  fetchTransactions: (date: Date | string) => Promise<void>;
  getTransactionMetrics: () => Promise<TransactionMetrics>;
}



export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  transactionMetrics: { monthlyIncome: 0, monthlyExpense: 0 },
  setTransactions: (transactions: Transaction[]) => set({ transactions }),
  addTransaction: async (transaction) => {
    // ZIYAUDDIN
    try {
      const token = useAuthStore.getState().authToken;
      if (!token) {
        throw new Error("Authentication token is missing. Please log in.");
      }

      // 2. Send the authenticated POST request to the backend
      const response = await fetch(`${API_BASE_URL}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 🔑 Attach the JWT for authorization
          'Authorization': `Bearer ${token}`,
        },
        // Send the transaction data as JSON string
        body: JSON.stringify(transaction),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // If the backend returns an error (e.g., 400 validation error)
        throw new Error(responseData.message || 'Failed to add transaction.');
      }

      // 3. Update the local state with the newly created transaction
      const createdTransaction = normalizeTransaction(responseData.transaction);

      set((state) => ({
        // Add the new transaction to the start of the list
        transactions: [createdTransaction, ...state.transactions],
      }));
      await get().getTransactionMetrics();

      console.log('Transaction added successfully:', createdTransaction);

      // Corrected catch block in transactionStore.js
    } catch (error) {
      // 1. Check if 'error' is an actual Error object
      if (error instanceof Error) {
        // Now TypeScript knows 'error' has a '.message' property
        console.error("Error adding transaction:", error.message);
      } else {
        // Fallback for non-standard errors (e.g., simple strings thrown)
        console.error("Error adding transaction: An unknown error occurred.", error);
      }
      // Re-throw the original error for the component to handle
      throw error;
    }
  },
  fetchTransactions: async (date: Date | string) => {
    const token = useAuthStore.getState().authToken;
    if (!token) throw new Error('No auth token found');

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
      const normalized = Array.isArray(data) ? data.map(normalizeTransaction) : [];
      set({ transactions: normalized });
    } else {
      throw new Error(data.message || "Fetching transactions failed");
    }
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
      set({ transactionMetrics: data })
      // data contains metrics like totalIncome, totalExpense, balance
      return data;
    } catch (error) {
      console.error("Error fetching transaction metrics:", error);
      throw error;
    }
  }
}))
