import { useState, useEffect, useCallback } from 'react';
import type { AppState, Account, Transaction, MonthlyPlan } from '../types';
import { generateSampleData } from '../utils/sampleData';

const STORAGE_KEY = 'budget_app_data';

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return generateSampleData();
}

function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let globalState: AppState = loadState();
const listeners: Set<() => void> = new Set();

function notify() {
  listeners.forEach(fn => fn());
}

function getState() {
  return globalState;
}

function setState(updater: (prev: AppState) => AppState) {
  globalState = updater(globalState);
  saveState(globalState);
  notify();
}

export function useStore() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const fn = () => forceUpdate(n => n + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);

  const state = getState();

  const addAccount = useCallback((account: Account) => {
    setState(s => ({ ...s, accounts: [...s.accounts, account] }));
  }, []);

  const updateAccount = useCallback((account: Account) => {
    setState(s => ({
      ...s,
      accounts: s.accounts.map(a => a.id === account.id ? account : a)
    }));
  }, []);

  const deleteAccount = useCallback((id: string) => {
    setState(s => ({
      ...s,
      accounts: s.accounts.filter(a => a.id !== id),
      transactions: s.transactions.filter(t => t.accountId !== id)
    }));
  }, []);

  const addTransaction = useCallback((transaction: Transaction) => {
    setState(s => ({ ...s, transactions: [...s.transactions, transaction] }));
  }, []);

  const updateTransaction = useCallback((transaction: Transaction) => {
    setState(s => ({
      ...s,
      transactions: s.transactions.map(t => t.id === transaction.id ? transaction : t)
    }));
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setState(s => ({
      ...s,
      transactions: s.transactions.filter(t => t.id !== id)
    }));
  }, []);

  const upsertMonthlyPlan = useCallback((plan: MonthlyPlan) => {
    setState(s => {
      const exists = s.monthlyPlans.some(p => p.id === plan.id);
      return {
        ...s,
        monthlyPlans: exists
          ? s.monthlyPlans.map(p => p.id === plan.id ? plan : p)
          : [...s.monthlyPlans, plan]
      };
    });
  }, []);

  const deleteMonthlyPlan = useCallback((id: string) => {
    setState(s => ({
      ...s,
      monthlyPlans: s.monthlyPlans.filter(p => p.id !== id)
    }));
  }, []);

  return {
    ...state,
    addAccount,
    updateAccount,
    deleteAccount,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    upsertMonthlyPlan,
    deleteMonthlyPlan,
  };
}
