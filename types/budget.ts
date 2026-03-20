export interface BudgetLimit {
  id: string;
  month: string; // YYYY-MM
  category: string;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyBudgetTotal {
  month: string; // YYYY-MM
  amount: number;
  updatedAt: string;
}
