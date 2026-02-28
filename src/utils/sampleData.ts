import type { AppState, Account, Transaction, MonthlyPlan } from '../types';
import { nanoid } from './nanoid';

export function generateSampleData(): AppState {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const accounts: Account[] = [
    {
      id: 'acc1',
      name: 'Main Checking',
      type: 'checking',
      balance: 4250.00,
      color: '#6366f1',
      createdAt: new Date(year, month - 2, 1).toISOString(),
    },
    {
      id: 'acc2',
      name: 'Savings',
      type: 'savings',
      balance: 12500.00,
      color: '#22c55e',
      createdAt: new Date(year, month - 2, 1).toISOString(),
    },
    {
      id: 'acc3',
      name: 'Credit Card',
      type: 'credit',
      balance: -850.00,
      color: '#f43f5e',
      createdAt: new Date(year, month - 2, 1).toISOString(),
    },
  ];

  const transactions: Transaction[] = [
    // Current month income
    { id: nanoid(), accountId: 'acc1', type: 'income', amount: 4500, category: 'Salary', description: 'Monthly salary', date: new Date(year, month, 1).toISOString(), recurring: 'monthly' },
    { id: nanoid(), accountId: 'acc1', type: 'income', amount: 350, category: 'Freelance', description: 'Web project', date: new Date(year, month, 8).toISOString(), recurring: null },
    // Current month expenses
    { id: nanoid(), accountId: 'acc1', type: 'expense', amount: 1200, category: 'Rent', description: 'Monthly rent', date: new Date(year, month, 1).toISOString(), recurring: 'monthly' },
    { id: nanoid(), accountId: 'acc1', type: 'expense', amount: 85, category: 'Utilities', description: 'Electric bill', date: new Date(year, month, 5).toISOString(), recurring: 'monthly' },
    { id: nanoid(), accountId: 'acc3', type: 'expense', amount: 340, category: 'Groceries', description: 'Weekly groceries', date: new Date(year, month, 6).toISOString(), recurring: 'weekly' },
    { id: nanoid(), accountId: 'acc3', type: 'expense', amount: 65, category: 'Dining Out', description: 'Restaurant', date: new Date(year, month, 10).toISOString(), recurring: null },
    { id: nanoid(), accountId: 'acc3', type: 'expense', amount: 45, category: 'Subscriptions', description: 'Streaming services', date: new Date(year, month, 3).toISOString(), recurring: 'monthly' },
    { id: nanoid(), accountId: 'acc1', type: 'expense', amount: 120, category: 'Transport', description: 'Monthly transit pass', date: new Date(year, month, 2).toISOString(), recurring: 'monthly' },
    { id: nanoid(), accountId: 'acc3', type: 'expense', amount: 200, category: 'Shopping', description: 'Clothing', date: new Date(year, month, 14).toISOString(), recurring: null },
    // Previous month
    { id: nanoid(), accountId: 'acc1', type: 'income', amount: 4500, category: 'Salary', description: 'Monthly salary', date: new Date(year, month - 1, 1).toISOString(), recurring: 'monthly' },
    { id: nanoid(), accountId: 'acc1', type: 'expense', amount: 1200, category: 'Rent', description: 'Monthly rent', date: new Date(year, month - 1, 1).toISOString(), recurring: 'monthly' },
    { id: nanoid(), accountId: 'acc1', type: 'expense', amount: 85, category: 'Utilities', description: 'Electric bill', date: new Date(year, month - 1, 5).toISOString(), recurring: 'monthly' },
    { id: nanoid(), accountId: 'acc3', type: 'expense', amount: 320, category: 'Groceries', description: 'Weekly groceries', date: new Date(year, month - 1, 10).toISOString(), recurring: 'weekly' },
    { id: nanoid(), accountId: 'acc3', type: 'expense', amount: 90, category: 'Dining Out', description: 'Restaurant', date: new Date(year, month - 1, 15).toISOString(), recurring: null },
    { id: nanoid(), accountId: 'acc1', type: 'expense', amount: 120, category: 'Transport', description: 'Monthly transit pass', date: new Date(year, month - 1, 2).toISOString(), recurring: 'monthly' },
    { id: nanoid(), accountId: 'acc2', type: 'income', amount: 250, category: 'Investments', description: 'Dividend', date: new Date(year, month - 1, 20).toISOString(), recurring: 'annually' },
  ];

  const monthlyPlans: MonthlyPlan[] = [
    {
      id: `plan-${year}-${month}`,
      year,
      month,
      notes: 'Focus on reducing dining expenses this month.',
      items: [
        { id: nanoid(), category: 'Salary', description: 'Monthly salary', amount: 4500, recurring: 'monthly', type: 'income' },
        { id: nanoid(), category: 'Freelance', description: 'Freelance work', amount: 300, recurring: null, type: 'income' },
        { id: nanoid(), category: 'Rent', description: 'Monthly rent', amount: 1200, recurring: 'monthly', type: 'expense' },
        { id: nanoid(), category: 'Utilities', description: 'Utilities', amount: 100, recurring: 'monthly', type: 'expense' },
        { id: nanoid(), category: 'Groceries', description: 'Groceries', amount: 400, recurring: 'weekly', type: 'expense' },
        { id: nanoid(), category: 'Transport', description: 'Transport', amount: 120, recurring: 'monthly', type: 'expense' },
        { id: nanoid(), category: 'Subscriptions', description: 'Subscriptions', amount: 45, recurring: 'monthly', type: 'expense' },
        { id: nanoid(), category: 'Dining Out', description: 'Dining Out', amount: 50, recurring: null, type: 'expense' },
        { id: nanoid(), category: 'Entertainment', description: 'Entertainment', amount: 80, recurring: null, type: 'expense' },
      ],
    },
  ];

  return { accounts, transactions, monthlyPlans };
}
