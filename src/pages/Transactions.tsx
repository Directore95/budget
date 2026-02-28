import { useState, useMemo } from 'react';
import { Plus, Search, Filter, Edit2, Trash2, ArrowUpRight, ArrowDownRight, RefreshCw, X } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, parseISO, isWithinInterval } from 'date-fns';
import { useStore } from '../store/useStore';
import type { Transaction, TransactionType, RecurringType } from '../types';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../types';
import { formatCurrency, recurringLabel } from '../utils/finance';
import { Modal } from '../components/Modal';
import { nanoid } from '../utils/nanoid';

type DatePreset = 'this_month' | 'last_month' | 'last_3' | 'last_6' | 'all' | 'custom';

interface Filters {
  search: string;
  type: 'all' | TransactionType;
  accountId: string;
  category: string;
  recurring: 'all' | 'recurring' | 'one_time';
  preset: DatePreset;
  startDate: string;
  endDate: string;
}

interface TxFormData {
  accountId: string;
  type: TransactionType;
  amount: string;
  category: string;
  description: string;
  date: string;
  recurring: RecurringType;
}

const RECURRING_OPTIONS: { value: RecurringType; label: string }[] = [
  { value: null, label: 'One-time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'annually', label: 'Annually' },
];

function defaultForm(accounts: { id: string }[]): TxFormData {
  return {
    accountId: accounts[0]?.id || '',
    type: 'expense',
    amount: '',
    category: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    recurring: null,
  };
}

function getDateRange(preset: DatePreset, startDate: string, endDate: string): { start: Date; end: Date } {
  const now = new Date();
  switch (preset) {
    case 'this_month': return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'last_month': return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
    case 'last_3': return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
    case 'last_6': return { start: startOfMonth(subMonths(now, 5)), end: endOfMonth(now) };
    case 'all': return { start: new Date(2000, 0, 1), end: new Date(2100, 0, 1) };
    case 'custom': return { start: startDate ? new Date(startDate) : new Date(2000, 0, 1), end: endDate ? new Date(endDate) : new Date(2100, 0, 1) };
  }
}

const PRESET_LABELS: Record<DatePreset, string> = {
  this_month: 'This Month',
  last_month: 'Last Month',
  last_3: 'Last 3 Months',
  last_6: 'Last 6 Months',
  all: 'All Time',
  custom: 'Custom Range',
};

export function Transactions() {
  const { accounts, transactions, addTransaction, updateTransaction, deleteTransaction } = useStore();

  const [filters, setFilters] = useState<Filters>({
    search: '',
    type: 'all',
    accountId: '',
    category: '',
    recurring: 'all',
    preset: 'this_month',
    startDate: '',
    endDate: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Transaction | null>(null);
  const [form, setForm] = useState<TxFormData>(() => defaultForm(accounts));
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const filtered = useMemo(() => {
    const { start, end } = getDateRange(filters.preset, filters.startDate, filters.endDate);
    return transactions
      .filter(t => {
        const date = parseISO(t.date);
        if (!isWithinInterval(date, { start, end })) return false;
        if (filters.type !== 'all' && t.type !== filters.type) return false;
        if (filters.accountId && t.accountId !== filters.accountId) return false;
        if (filters.category && t.category !== filters.category) return false;
        if (filters.recurring === 'recurring' && !t.recurring) return false;
        if (filters.recurring === 'one_time' && t.recurring) return false;
        if (filters.search) {
          const q = filters.search.toLowerCase();
          if (!t.description.toLowerCase().includes(q) && !t.category.toLowerCase().includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, filters]);

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  function openAdd() {
    setEditTarget(null);
    setForm(defaultForm(accounts));
    setShowModal(true);
  }

  function openEdit(tx: Transaction) {
    setEditTarget(tx);
    setForm({
      accountId: tx.accountId,
      type: tx.type,
      amount: String(tx.amount),
      category: tx.category,
      description: tx.description,
      date: format(parseISO(tx.date), 'yyyy-MM-dd'),
      recurring: tx.recurring,
    });
    setShowModal(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!form.accountId || !amount || !form.category || !form.date) return;

    const tx: Transaction = {
      id: editTarget ? editTarget.id : nanoid(),
      accountId: form.accountId,
      type: form.type,
      amount,
      category: form.category,
      description: form.description.trim() || form.category,
      date: new Date(form.date + 'T12:00:00').toISOString(),
      recurring: form.recurring,
    };

    if (editTarget) updateTransaction(tx);
    else addTransaction(tx);
    setShowModal(false);
  }

  const accountMap = Object.fromEntries(accounts.map(a => [a.id, a]));

  const activeFilterCount = [
    filters.type !== 'all',
    filters.accountId !== '',
    filters.category !== '',
    filters.recurring !== 'all',
    filters.preset !== 'this_month',
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Date preset tabs */}
        <div className="flex bg-white border border-gray-200 rounded-lg p-0.5 gap-0.5">
          {(['this_month', 'last_month', 'last_3', 'last_6', 'all'] as DatePreset[]).map(p => (
            <button
              key={p}
              onClick={() => setFilters(f => ({ ...f, preset: p }))}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-all ${filters.preset === p ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {PRESET_LABELS[p]}
            </button>
          ))}
          <button
            onClick={() => setFilters(f => ({ ...f, preset: 'custom' }))}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-all ${filters.preset === 'custom' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Custom
          </button>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-1.5 text-sm border rounded-lg px-3 py-1.5 transition-colors ${showFilters || activeFilterCount > 0 ? 'border-indigo-300 text-indigo-700 bg-indigo-50' : 'border-gray-200 text-gray-600 bg-white hover:bg-gray-50'}`}
        >
          <Filter size={14} />
          Filters
          {activeFilterCount > 0 && <span className="bg-indigo-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{activeFilterCount}</span>}
        </button>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={14} /> Add Transaction
        </button>
      </div>

      {/* Custom date range */}
      {filters.preset === 'custom' && (
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3">
          <span className="text-xs text-gray-500 font-medium">From</span>
          <input
            type="date"
            value={filters.startDate}
            onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span className="text-xs text-gray-500 font-medium">To</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      )}

      {/* Expanded filters */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="col-span-2 lg:col-span-1">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Search</label>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                placeholder="Description or category..."
                className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Type</label>
            <select
              value={filters.type}
              onChange={e => setFilters(f => ({ ...f, type: e.target.value as 'all' | TransactionType }))}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Account</label>
            <select
              value={filters.accountId}
              onChange={e => setFilters(f => ({ ...f, accountId: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Accounts</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Recurring</label>
            <select
              value={filters.recurring}
              onChange={e => setFilters(f => ({ ...f, recurring: e.target.value as Filters['recurring'] }))}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All</option>
              <option value="recurring">Recurring Only</option>
              <option value="one_time">One-time Only</option>
            </select>
          </div>
          <div className="col-span-2 lg:col-span-4 flex justify-end">
            <button
              onClick={() => setFilters({ search: '', type: 'all', accountId: '', category: '', recurring: 'all', preset: 'this_month', startDate: '', endDate: '' })}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <X size={12} /> Clear filters
            </button>
          </div>
        </div>
      )}

      {/* Summary strip */}
      <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-5 py-3">
        <span className="text-xs text-gray-500">{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</span>
        <div className="flex items-center gap-1.5">
          <ArrowUpRight size={14} className="text-green-500" />
          <span className="text-sm font-semibold text-green-700">{formatCurrency(totalIncome)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ArrowDownRight size={14} className="text-red-500" />
          <span className="text-sm font-semibold text-red-700">{formatCurrency(totalExpenses)}</span>
        </div>
        <div className="ml-auto">
          <span className="text-xs text-gray-500">Net: </span>
          <span className={`text-sm font-bold ${totalIncome - totalExpenses >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {formatCurrency(totalIncome - totalExpenses)}
          </span>
        </div>
      </div>

      {/* Transaction list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <ArrowLeftRight size={36} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No transactions match your filters.</p>
            <button onClick={openAdd} className="mt-3 text-sm text-indigo-600 hover:underline">Add Transaction</button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(tx => {
              const acc = accountMap[tx.accountId];
              return (
                <div key={tx.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors group">
                  <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${tx.type === 'income' ? 'bg-green-100' : 'bg-red-100'}`}>
                    {tx.type === 'income'
                      ? <ArrowUpRight size={15} className="text-green-600" />
                      : <ArrowDownRight size={15} className="text-red-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900 truncate">{tx.description}</span>
                      {tx.recurring && (
                        <span className="flex items-center gap-0.5 text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full font-medium">
                          <RefreshCw size={10} /> {recurringLabel(tx.recurring)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">{tx.category}</span>
                      {acc && (
                        <>
                          <span className="text-gray-200">·</span>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full inline-block" style={{ background: acc.color }} />
                            {acc.name}
                          </span>
                        </>
                      )}
                      <span className="text-gray-200">·</span>
                      <span className="text-xs text-gray-400">{format(parseISO(tx.date), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={() => openEdit(tx)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(tx.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit modal */}
      {showModal && (
        <Modal title={editTarget ? 'Edit Transaction' : 'Add Transaction'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type toggle */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                {(['income', 'expense'] as TransactionType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, type: t, category: '' }))}
                    className={`flex-1 py-2 text-sm font-medium transition-colors capitalize ${form.type === t
                      ? t === 'income' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                      : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select category...</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional description"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Account</label>
              <select
                value={form.accountId}
                onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select account...</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Recurring</label>
              <div className="flex gap-2 flex-wrap">
                {RECURRING_OPTIONS.map(opt => (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, recurring: opt.value }))}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      form.recurring === opt.value
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-gray-200 text-gray-600 hover:border-indigo-300'
                    }`}
                  >
                    {opt.value && <RefreshCw size={10} />}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                {editTarget ? 'Save Changes' : 'Add Transaction'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <Modal title="Delete Transaction" onClose={() => setDeleteConfirm(null)} size="sm">
          <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete this transaction?</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteConfirm(null)} className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={() => { deleteTransaction(deleteConfirm); setDeleteConfirm(null); }} className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-red-700">Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ArrowLeftRight({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M8 3L3 8l5 5M21 8H3M16 21l5-5-5-5M3 16h18" />
    </svg>
  );
}
