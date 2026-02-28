export type RecurringType = 'weekly' | 'monthly' | 'annually' | null;
export type TransactionType = 'income' | 'expense';
export type AccountType = 'checking' | 'savings' | 'credit' | 'investment' | 'cash' | 'other';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  color: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string;
  recurring: RecurringType;
}

export interface PlanItem {
  id: string;
  category: string;
  description: string;
  amount: number;
  recurring: RecurringType;
  type: TransactionType;
}

export interface MonthlyPlan {
  id: string;
  year: number;
  month: number; // 0-11
  items: PlanItem[];
  notes: string;
}

export interface AppState {
  accounts: Account[];
  transactions: Transaction[];
  monthlyPlans: MonthlyPlan[];
}

export const INCOME_CATEGORIES = [
  'Salary', 'Freelance', 'Business', 'Investments', 'Rental', 'Gift', 'Other Income'
];

export const EXPENSE_CATEGORIES = [
  'Housing', 'Rent', 'Utilities', 'Groceries', 'Dining Out', 'Transport',
  'Fuel', 'Healthcare', 'Insurance', 'Entertainment', 'Subscriptions',
  'Clothing', 'Education', 'Travel', 'Shopping', 'Personal Care',
  'Savings', 'Debt Payment', 'Gifts', 'Other Expense'
];

export const ACCOUNT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#06b6d4'
];
