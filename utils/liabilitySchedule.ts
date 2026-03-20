import type { LiabilityItem } from '@/types/goal';
import type { LiabilityPaymentEntry } from '@/types/goal';

export type LiabilityCalendarItem = {
  id: string;
  liabilityId: string;
  title: string;
  type: 'emi' | 'rent';
  amount: number;
  date: string; // ISO-like date key YYYY-MM-DD
};

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function buildMonthlyDate(baseMonth: Date, dayOfMonth: number) {
  const monthEndDay = new Date(baseMonth.getFullYear(), baseMonth.getMonth() + 1, 0).getDate();
  const day = Math.min(dayOfMonth, monthEndDay);
  return new Date(baseMonth.getFullYear(), baseMonth.getMonth(), day);
}

export function buildLiabilityCalendarItems(
  liabilities: LiabilityItem[],
  payments: LiabilityPaymentEntry[],
  now = new Date(),
  rentMonthsAhead = 12
): LiabilityCalendarItem[] {
  const currentMonth = monthStart(now);
  const items: LiabilityCalendarItem[] = [];

  liabilities.forEach((liability) => {
    if (liability.type === 'debt') return;
    if (liability.monthlyPayment <= 0) return;

    const created = new Date(liability.createdAt);
    const dueDay = Math.min(Math.max(created.getDate(), 1), 28);

    if (liability.type === 'emi') {
      const monthsLeft = Math.ceil(liability.remainingAmount / liability.monthlyPayment);
      if (monthsLeft <= 0) return;
      let remainingTracker = liability.remainingAmount;
      let scheduled = 0;
      let cursor = 0;
      while (scheduled < monthsLeft && cursor < 120) {
        const month = addMonths(currentMonth, cursor);
        const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
        const paidThisMonth = payments
          .filter((entry) => entry.liabilityId === liability.id && entry.monthKey === monthKey)
          .reduce((sum, entry) => sum + entry.amount, 0);
        const dueThisMonth = Math.max(Math.min(liability.monthlyPayment - paidThisMonth, remainingTracker), 0);
        if (dueThisMonth > 0) {
          const dueDate = buildMonthlyDate(month, dueDay);
          items.push({
            id: `${liability.id}-${toDateKey(dueDate)}`,
            liabilityId: liability.id,
            title: liability.title,
            type: 'emi',
            amount: dueThisMonth,
            date: toDateKey(dueDate),
          });
          remainingTracker -= dueThisMonth;
          scheduled += 1;
        }
        cursor += 1;
      }
      return;
    }

    for (let i = 0; i < rentMonthsAhead; i += 1) {
        const month = addMonths(currentMonth, i);
        const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
        const paidThisMonth = payments
          .filter((entry) => entry.liabilityId === liability.id && entry.monthKey === monthKey)
          .reduce((sum, entry) => sum + entry.amount, 0);
        const dueThisMonth = Math.max(liability.monthlyPayment - paidThisMonth, 0);
        if (dueThisMonth <= 0) continue;
        const dueDate = buildMonthlyDate(month, dueDay);
        items.push({
          id: `${liability.id}-${toDateKey(dueDate)}`,
          liabilityId: liability.id,
          title: liability.title,
          type: 'rent',
          amount: dueThisMonth,
          date: toDateKey(dueDate),
        });
      }
  });

  return items;
}
