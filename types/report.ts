export type ReportBudgetStatus = 'over' | 'under' | 'unplanned';

export interface ReportSummary {
  income: number;
  expense: number;
  netSavings: number;
  savingsRate: number;
}

export interface ReportCategoryTotal {
  category: string;
  amount: number;
}

export interface ReportComparison {
  incomeDelta: number;
  expenseDelta: number;
  netDelta: number;
}

export interface ReportBudgetItem {
  category: string;
  spent: number;
  planned: number;
  status: ReportBudgetStatus;
  difference: number;
}

export interface MonthlyReport {
  id: string;
  monthKey: string;
  monthLabel: string;
  generatedAt: string;
  summary: ReportSummary;
  topCategories: ReportCategoryTotal[];
  comparison: ReportComparison;
  budget: {
    totalBudget: number;
    totalSpent: number;
    utilizationRate: number;
    items: ReportBudgetItem[];
  };
  insights: string[];
}
