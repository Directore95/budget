import { useState } from 'react';
import { Plus, Edit2, Trash2, CreditCard, PiggyBank, Wallet, TrendingUp, Banknote, CircleDollarSign } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { Account, AccountType } from '../types';
import { ACCOUNT_COLORS } from '../types';
import { formatCurrency } from '../utils/finance';
import { Modal } from '../components/Modal';
import { StatCard } from '../components/StatCard';
import { nanoid } from '../utils/nanoid';
import { format } from 'date-fns';

const accountTypeIcons: Record<AccountType, typeof CreditCard> = {
  checking: Banknote,
  savings: PiggyBank,
  credit: CreditCard,
  investment: TrendingUp,
  cash: Wallet,
  other: CircleDollarSign,
};

const accountTypeLabels: Record<AccountType, string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit: 'Credit Card',
  investment: 'Investment',
  cash: 'Cash',
  other: 'Other',
};

interface AccountFormData {
  name: string;
  type: AccountType;
  balance: string;
  color: string;
}

const defaultForm: AccountFormData = {
  name: '',
  type: 'checking',
  balance: '',
  color: ACCOUNT_COLORS[0],
};

export function Accounts() {
  const { accounts, transactions, addAccount, updateAccount, deleteAccount } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Account | null>(null);
  const [form, setForm] = useState<AccountFormData>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const totalAssets = accounts.filter(a => a.balance > 0).reduce((s, a) => s + a.balance, 0);
  const totalDebt = accounts.filter(a => a.balance < 0).reduce((s, a) => s + Math.abs(a.balance), 0);
  const netWorth = accounts.reduce((s, a) => s + a.balance, 0);

  function openAdd() {
    setEditTarget(null);
    setForm(defaultForm);
    setShowModal(true);
  }

  function openEdit(acc: Account) {
    setEditTarget(acc);
    setForm({ name: acc.name, type: acc.type, balance: String(acc.balance), color: acc.color });
    setShowModal(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const balance = parseFloat(form.balance) || 0;
    if (!form.name.trim()) return;

    if (editTarget) {
      updateAccount({ ...editTarget, name: form.name.trim(), type: form.type, balance, color: form.color });
    } else {
      addAccount({
        id: nanoid(),
        name: form.name.trim(),
        type: form.type,
        balance,
        color: form.color,
        createdAt: new Date().toISOString(),
      });
    }
    setShowModal(false);
  }

  function handleDelete(id: string) {
    const txCount = transactions.filter(t => t.accountId === id).length;
    if (txCount > 0) {
      setDeleteConfirm(id);
    } else {
      deleteAccount(id);
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Assets" value={formatCurrency(totalAssets)} color="green" />
        <StatCard title="Total Debt" value={formatCurrency(totalDebt)} color="red" />
        <StatCard title="Net Worth" value={formatCurrency(netWorth)} color={netWorth >= 0 ? 'indigo' : 'red'} />
      </div>

      {/* Account list */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Your Accounts</h3>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={14} /> Add Account
          </button>
        </div>

        {accounts.length === 0 ? (
          <div className="py-16 text-center">
            <CircleDollarSign size={36} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No accounts yet. Add your first account to get started.</p>
            <button onClick={openAdd} className="mt-3 text-sm text-indigo-600 hover:underline">Add Account</button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {accounts.map(acc => {
              const Icon = accountTypeIcons[acc.type];
              const txCount = transactions.filter(t => t.accountId === acc.id).length;
              return (
                <div key={acc.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: acc.color + '20' }}>
                    <Icon size={20} style={{ color: acc.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{acc.name}</p>
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        {accountTypeLabels[acc.type]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {txCount} transaction{txCount !== 1 ? 's' : ''} · Added {format(new Date(acc.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-lg font-bold ${acc.balance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {formatCurrency(acc.balance)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEdit(acc)}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(acc.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={15} />
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
        <Modal title={editTarget ? 'Edit Account' : 'Add Account'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Account Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Main Checking"
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Account Type</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value as AccountType }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {Object.entries(accountTypeLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Current Balance</label>
              <input
                type="number"
                value={form.balance}
                onChange={e => setForm(f => ({ ...f, balance: e.target.value }))}
                placeholder="0.00"
                step="0.01"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-400 mt-1">Use negative for credit card / loan balances</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Color</label>
              <div className="flex gap-2 flex-wrap">
                {ACCOUNT_COLORS.map(c => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                    style={{ background: c }}
                  />
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
                {editTarget ? 'Save Changes' : 'Add Account'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <Modal title="Delete Account" onClose={() => setDeleteConfirm(null)} size="sm">
          <p className="text-sm text-gray-600 mb-4">
            This account has transactions. Deleting it will also remove all associated transactions. Are you sure?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => { deleteAccount(deleteConfirm); setDeleteConfirm(null); }}
              className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
