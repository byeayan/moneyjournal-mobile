import type { BudgetLimit } from '@/types/budget';
import type { MonthlyReport } from '@/types/report';
import type { Transaction } from '@/types/transaction';

export function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function toMonthLabel(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function parseMonthKey(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, (month || 1) - 1, 1);
}

function normalizeCategory(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : 'Other';
}

function withinMonth(transactionDate: string, monthKey: string) {
  const date = new Date(transactionDate);
  if (Number.isNaN(date.getTime())) return false;
  return toMonthKey(date) === monthKey;
}

function sumIncome(transactions: Transaction[]) {
  return transactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
}

function sumExpense(transactions: Transaction[]) {
  return transactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
}

export function generateMonthlyReport(input: {
  transactions: Transaction[];
  budgets: BudgetLimit[];
  monthlyTotals: Record<string, number>;
  selectedMonth: Date;
}): MonthlyReport {
  const monthStart = startOfMonth(input.selectedMonth);
  const monthKey = toMonthKey(monthStart);
  const monthLabel = toMonthLabel(monthStart);
  const previousMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
  const previousMonthKey = toMonthKey(previousMonthStart);

  const currentTransactions = input.transactions.filter((transaction) => withinMonth(transaction.date, monthKey));
  const previousTransactions = input.transactions.filter((transaction) => withinMonth(transaction.date, previousMonthKey));

  const income = sumIncome(currentTransactions);
  const expense = sumExpense(currentTransactions);
  const netSavings = income - expense;
  const savingsRate = income > 0 ? (netSavings / income) * 100 : 0;

  const previousIncome = sumIncome(previousTransactions);
  const previousExpense = sumExpense(previousTransactions);
  const previousNet = previousIncome - previousExpense;

  const categoryMap = new Map<string, number>();
  currentTransactions
    .filter((transaction) => transaction.type === 'expense')
    .forEach((transaction) => {
      const category = normalizeCategory(transaction.category);
      categoryMap.set(category, (categoryMap.get(category) ?? 0) + transaction.amount);
    });

  const topCategories = Array.from(categoryMap.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  const monthBudgets = input.budgets.filter((budget) => budget.month === monthKey);
  const budgetMap = new Map<string, number>();
  monthBudgets.forEach((budget) => {
    budgetMap.set(normalizeCategory(budget.category), Number(budget.amount || 0));
  });

  const budgetCategories = new Set<string>([
    ...Array.from(budgetMap.keys()),
    ...Array.from(categoryMap.keys()),
  ]);

  const budgetItems = Array.from(budgetCategories)
    .map((category) => {
      const planned = budgetMap.get(category) ?? 0;
      const spent = categoryMap.get(category) ?? 0;
      const difference = planned - spent;
      const status = planned <= 0 ? 'unplanned' : spent > planned ? 'over' : 'under';

      return {
        category,
        planned,
        spent,
        status,
        difference,
      } as const;
    })
    .sort((a, b) => b.spent - a.spent);

  const explicitMonthlyTotal = input.monthlyTotals[monthKey] ?? 0;
  const categoryBudgetTotal = monthBudgets.reduce((sum, budget) => sum + Number(budget.amount || 0), 0);
  const totalBudget = explicitMonthlyTotal > 0 ? explicitMonthlyTotal : categoryBudgetTotal;
  const totalSpent = expense;
  const utilizationRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const topCategory = topCategories[0];
  const overBudgetCount = budgetItems.filter((item) => item.status === 'over').length;

  const insights: string[] = [];
  if (topCategory) {
    insights.push(`Top spending category: ${topCategory.category} at Rs ${topCategory.amount.toFixed(0)}.`);
  }
  if (overBudgetCount > 0) {
    insights.push(`${overBudgetCount} category budget${overBudgetCount > 1 ? 's are' : ' is'} over limit.`);
  } else if (budgetItems.length > 0) {
    insights.push('All tracked categories are within budget for this month.');
  }

  const netDelta = netSavings - previousNet;
  if (previousTransactions.length > 0) {
    insights.push(
      netDelta >= 0
        ? `Net savings improved by Rs ${Math.abs(netDelta).toFixed(0)} compared to last month.`
        : `Net savings dropped by Rs ${Math.abs(netDelta).toFixed(0)} compared to last month.`
    );
  } else {
    insights.push('No prior month data available for comparison.');
  }

  return {
    id: `report-${monthKey}-${Date.now()}`,
    monthKey,
    monthLabel,
    generatedAt: new Date().toISOString(),
    summary: {
      income,
      expense,
      netSavings,
      savingsRate,
    },
    topCategories,
    comparison: {
      incomeDelta: income - previousIncome,
      expenseDelta: expense - previousExpense,
      netDelta,
    },
    budget: {
      totalBudget,
      totalSpent,
      utilizationRate,
      items: budgetItems,
    },
    insights,
  };
}
