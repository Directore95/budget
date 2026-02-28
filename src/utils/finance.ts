import type { Transaction, MonthlyPlan, RecurringType } from '../types';
import { startOfMonth, endOfMonth, isWithinInterval, addWeeks, parseISO } from 'date-fns';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function getTransactionsForPeriod(
  transactions: Transaction[],
  start: Date,
  end: Date
): Transaction[] {
  return transactions.filter(t => {
    const date = parseISO(t.date);
    return isWithinInterval(date, { start, end });
  });
}

export function sumByType(transactions: Transaction[], type: 'income' | 'expense'): number {
  return transactions
    .filter(t => t.type === type)
    .reduce((sum, t) => sum + t.amount, 0);
}

export function groupByCategory(transactions: Transaction[]): Record<string, number> {
  return transactions.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);
}

/**
 * Projects recurring transactions into a target month.
 * Returns the expected amounts for that month based on recurring rules.
 */
export function projectRecurringForMonth(
  transactions: Transaction[],
  targetYear: number,
  targetMonth: number // 0-indexed
): Transaction[] {
  const targetStart = startOfMonth(new Date(targetYear, targetMonth));
  const targetEnd = endOfMonth(new Date(targetYear, targetMonth));
  const projected: Transaction[] = [];

  for (const t of transactions) {
    if (!t.recurring) continue;
    const date = parseISO(t.date);

    if (t.recurring === 'monthly') {
      // One occurrence per month
      projected.push({
        ...t,
        id: `proj_${t.id}`,
        date: new Date(targetYear, targetMonth, date.getDate()).toISOString(),
      });
    } else if (t.recurring === 'weekly') {
      // Find all occurrences within the target month
      let cursor = new Date(date);
      // Roll forward to first occurrence on or after target month start
      while (cursor < targetStart) {
        cursor = addWeeks(cursor, 1);
      }
      while (cursor <= targetEnd) {
        projected.push({
          ...t,
          id: `proj_${t.id}_${cursor.getTime()}`,
          date: cursor.toISOString(),
        });
        cursor = addWeeks(cursor, 1);
      }
    } else if (t.recurring === 'annually') {
      // Same month each year
      if (date.getMonth() === targetMonth) {
        projected.push({
          ...t,
          id: `proj_${t.id}`,
          date: new Date(targetYear, targetMonth, date.getDate()).toISOString(),
        });
      }
    }
  }

  return projected;
}

export function getMonthPlanTotals(plan: MonthlyPlan): { plannedIncome: number; plannedExpenses: number } {
  const plannedIncome = plan.items
    .filter(i => i.type === 'income')
    .reduce((sum, i) => sum + i.amount, 0);
  const plannedExpenses = plan.items
    .filter(i => i.type === 'expense')
    .reduce((sum, i) => sum + i.amount, 0);
  return { plannedIncome, plannedExpenses };
}

export function recurringLabel(r: RecurringType): string {
  if (!r) return 'One-time';
  return r.charAt(0).toUpperCase() + r.slice(1);
}
