import type { MonthlyReport } from '@/types/report';

function formatCurrency(value: number) {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function buildReportHtml(report: MonthlyReport) {
  const topCategoryRows =
    report.topCategories.length === 0
      ? '<tr><td colspan="2">No expense data for this month.</td></tr>'
      : report.topCategories
          .map(
            (item) =>
              `<tr><td>${escapeHtml(item.category)}</td><td style="text-align:right;">Rs ${formatCurrency(item.amount)}</td></tr>`
          )
          .join('');

  const budgetRows =
    report.budget.items.length === 0
      ? '<tr><td colspan="4">No category budget entries for this month.</td></tr>'
      : report.budget.items
          .map((item) => {
            const status = item.status === 'over' ? 'Over' : item.status === 'under' ? 'Within' : 'Unplanned';
            return `<tr>
              <td>${escapeHtml(item.category)}</td>
              <td style="text-align:right;">Rs ${formatCurrency(item.spent)}</td>
              <td style="text-align:right;">Rs ${formatCurrency(item.planned)}</td>
              <td style="text-align:right;">${status}</td>
            </tr>`;
          })
          .join('');

  const insightRows = report.insights.map((insight) => `<li>${escapeHtml(insight)}</li>`).join('');
  const generatedAt = new Date(report.generatedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #111827; padding: 24px; }
    h1, h2 { margin: 0 0 8px 0; }
    h1 { font-size: 24px; }
    h2 { font-size: 16px; margin-top: 20px; }
    p { margin: 2px 0; }
    .meta { color: #6b7280; margin-bottom: 14px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px; }
    .label { color: #6b7280; font-size: 12px; }
    .value { font-size: 18px; font-weight: 700; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border-bottom: 1px solid #e5e7eb; padding: 8px 6px; font-size: 13px; text-align: left; }
    th { background: #f9fafb; }
    ul { margin: 8px 0 0 0; padding-left: 18px; }
    li { margin: 6px 0; }
  </style>
</head>
<body>
  <h1>MoneyJournal Monthly Report</h1>
  <p><strong>${escapeHtml(report.monthLabel)}</strong></p>
  <p class="meta">Generated ${escapeHtml(generatedAt)}</p>

  <div class="grid">
    <div class="card"><div class="label">Income</div><div class="value">Rs ${formatCurrency(report.summary.income)}</div></div>
    <div class="card"><div class="label">Expense</div><div class="value">Rs ${formatCurrency(report.summary.expense)}</div></div>
    <div class="card"><div class="label">Net Savings</div><div class="value">Rs ${formatCurrency(report.summary.netSavings)}</div></div>
    <div class="card"><div class="label">Savings Rate</div><div class="value">${report.summary.savingsRate.toFixed(1)}%</div></div>
  </div>

  <h2>Top Spending Categories</h2>
  <table>
    <thead>
      <tr><th>Category</th><th style="text-align:right;">Amount</th></tr>
    </thead>
    <tbody>${topCategoryRows}</tbody>
  </table>

  <h2>Comparison vs Previous Month</h2>
  <table>
    <tbody>
      <tr><td>Income Change</td><td style="text-align:right;">${report.comparison.incomeDelta >= 0 ? '+' : '-'}Rs ${formatCurrency(Math.abs(report.comparison.incomeDelta))}</td></tr>
      <tr><td>Expense Change</td><td style="text-align:right;">${report.comparison.expenseDelta >= 0 ? '+' : '-'}Rs ${formatCurrency(Math.abs(report.comparison.expenseDelta))}</td></tr>
      <tr><td>Net Change</td><td style="text-align:right;">${report.comparison.netDelta >= 0 ? '+' : '-'}Rs ${formatCurrency(Math.abs(report.comparison.netDelta))}</td></tr>
    </tbody>
  </table>

  <h2>Budget Performance</h2>
  <p>Total Budget: Rs ${formatCurrency(report.budget.totalBudget)} | Spent: Rs ${formatCurrency(report.budget.totalSpent)} | Used: ${report.budget.utilizationRate.toFixed(1)}%</p>
  <table>
    <thead>
      <tr><th>Category</th><th style="text-align:right;">Spent</th><th style="text-align:right;">Planned</th><th style="text-align:right;">Status</th></tr>
    </thead>
    <tbody>${budgetRows}</tbody>
  </table>

  <h2>Insights</h2>
  <ul>${insightRows}</ul>
</body>
</html>`;
}
