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
  fetchTransactions: () => Promise<void>;
  getTransactionMetrics: () => Promise<void>;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  setTransactions: (transactions) => set({ transactions }),
  addTransaction: async (transaction) => {
    // ZIYAUDDIN
    try {
      // 1. Get the current authentication token
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
            const createdTransaction = responseData.transaction; // Backend sends the created object
            
            set((state) => ({
                // Add the new transaction to the start of the list
                transactions: [createdTransaction, ...state.transactions],
            }));
            
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
  fetchTransactions: async () => {
    // FARIZ
  },
  getTransactionMetrics: async () => {
    // Ayan
  }
}));