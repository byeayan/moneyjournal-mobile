export interface Transaction {
  id: string;
  amount: number;
  note?: string;
  description: string;
  category: string;
  type: 'income' | 'expense';
  date: string;
  account?: string;
}

export interface TransactionMetrics {
  monthlyIncome: number;
  monthlyExpense: number;
}
