import { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, ChevronLeft, ChevronRight, Copy, RefreshCw, FileText, TrendingUp, TrendingDown } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth } from 'date-fns';
import { useStore } from '../store/useStore';
import type { MonthlyPlan as MonthlyPlanType, PlanItem, TransactionType, RecurringType } from '../types';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../types';
import { formatCurrency, recurringLabel } from '../utils/finance';
import { Modal } from '../components/Modal';
import { nanoid } from '../utils/nanoid';

interface PlanItemFormData {
  type: TransactionType;
  category: string;
  description: string;
  amount: string;
  recurring: RecurringType;
}

const RECURRING_OPTIONS: { value: RecurringType; label: string }[] = [
  { value: null, label: 'One-time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'annually', label: 'Annually' },
];

function defaultItemForm(): PlanItemFormData {
  return { type: 'expense', category: '', description: '', amount: '', recurring: 'monthly' };
}

export function MonthlyPlan() {
  const { monthlyPlans, upsertMonthlyPlan, deleteMonthlyPlan } = useStore();
  const [viewDate, setViewDate] = useState(startOfMonth(new Date()));
  const [showItemModal, setShowItemModal] = useState(false);
  const [editItem, setEditItem] = useState<PlanItem | null>(null);
  const [itemForm, setItemForm] = useState<PlanItemFormData>(defaultItemForm);
  const [notes, setNotes] = useState('');
  const [notesEditing, setNotesEditing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const planId = `plan-${year}-${month}`;

  const plan = useMemo(() => monthlyPlans.find(p => p.id === planId), [monthlyPlans, planId]);

  const items = plan?.items ?? [];
  const incomeItems = items.filter(i => i.type === 'income');
  const expenseItems = items.filter(i => i.type === 'expense');
  const totalIncome = incomeItems.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = expenseItems.reduce((s, i) => s + i.amount, 0);
  const netPlan = totalIncome - totalExpenses;

  function ensurePlan(): MonthlyPlanType {
    return plan ?? { id: planId, year, month, items: [], notes: '' };
  }

  function upsertItem(item: PlanItem) {
    const p = ensurePlan();
    const exists = p.items.some(i => i.id === item.id);
    const newItems = exists ? p.items.map(i => i.id === item.id ? item : i) : [...p.items, item];
    upsertMonthlyPlan({ ...p, items: newItems });
  }

  function removeItem(itemId: string) {
    const p = ensurePlan();
    upsertMonthlyPlan({ ...p, items: p.items.filter(i => i.id !== itemId) });
  }

  function saveNotes(n: string) {
    upsertMonthlyPlan({ ...ensurePlan(), notes: n });
    setNotesEditing(false);
  }

  function openAddItem(type?: TransactionType) {
    setEditItem(null);
    setItemForm({ ...defaultItemForm(), type: type ?? 'expense' });
    setShowItemModal(true);
  }

  function openEditItem(item: PlanItem) {
    setEditItem(item);
    setItemForm({ type: item.type, category: item.category, description: item.description, amount: String(item.amount), recurring: item.recurring });
    setShowItemModal(true);
  }

  function handleItemSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(itemForm.amount);
    if (!itemForm.category || !amount) return;
    const item: PlanItem = {
      id: editItem ? editItem.id : nanoid(),
      type: itemForm.type,
      category: itemForm.category,
      description: itemForm.description.trim() || itemForm.category,
      amount,
      recurring: itemForm.recurring,
    };
    upsertItem(item);
    setShowItemModal(false);
  }

  function copyFromPrevious() {
    const prevDate = subMonths(viewDate, 1);
    const prevPlanId = `plan-${prevDate.getFullYear()}-${prevDate.getMonth()}`;
    const prevPlan = monthlyPlans.find(p => p.id === prevPlanId);
    if (!prevPlan) return;
    const newItems = prevPlan.items.map(i => ({ ...i, id: nanoid() }));
    upsertMonthlyPlan({ ...ensurePlan(), items: newItems, notes: prevPlan.notes });
  }

  const categories = itemForm.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const hasPrevPlan = monthlyPlans.some(p => {
    const pd = subMonths(viewDate, 1);
    return p.id === `plan-${pd.getFullYear()}-${pd.getMonth()}`;
  });

  return (
    <div className="space-y-6">
      {/* Month navigator */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-5 py-3">
        <button
          onClick={() => setViewDate(d => subMonths(d, 1))}
          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-base font-bold text-gray-900">{format(viewDate, 'MMMM yyyy')}</p>
          <p className="text-xs text-gray-400">Monthly Budget Plan</p>
        </div>
        <button
          onClick={() => setViewDate(d => addMonths(d, 1))}
          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 rounded-xl border border-green-100 p-4 text-center">
          <TrendingUp size={18} className="text-green-500 mx-auto mb-1" />
          <p className="text-xs text-green-700 font-medium">Planned Income</p>
          <p className="text-xl font-bold text-green-900 mt-1">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-100 p-4 text-center">
          <TrendingDown size={18} className="text-red-500 mx-auto mb-1" />
          <p className="text-xs text-red-700 font-medium">Planned Expenses</p>
          <p className="text-xl font-bold text-red-900 mt-1">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className={`${netPlan >= 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-amber-50 border-amber-100'} rounded-xl border p-4 text-center`}>
          <p className={`text-xs font-medium ${netPlan >= 0 ? 'text-indigo-700' : 'text-amber-700'}`}>Planned Net</p>
          <p className={`text-xl font-bold mt-1 ${netPlan >= 0 ? 'text-indigo-900' : 'text-amber-900'}`}>{formatCurrency(netPlan)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{netPlan >= 0 ? 'Surplus' : 'Deficit'}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => openAddItem('income')}
          className="flex items-center gap-1.5 text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus size={14} /> Add Income
        </button>
        <button
          onClick={() => openAddItem('expense')}
          className="flex items-center gap-1.5 text-sm bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors"
        >
          <Plus size={14} /> Add Expense
        </button>
        {hasPrevPlan && items.length === 0 && (
          <button
            onClick={copyFromPrevious}
            className="flex items-center gap-1.5 text-sm bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Copy size={14} /> Copy from Previous Month
          </button>
        )}
        {plan && (
          <button
            onClick={() => { if (confirm('Delete this entire plan?')) deleteMonthlyPlan(planId); }}
            className="flex items-center gap-1.5 text-sm bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors ml-auto"
          >
            <Trash2 size={14} /> Delete Plan
          </button>
        )}
      </div>

      {/* Income section */}
      <PlanSection
        title="Income"
        color="green"
        items={incomeItems}
        total={totalIncome}
        onEdit={openEditItem}
        onDelete={id => setDeleteConfirm(id)}
        onAdd={() => openAddItem('income')}
      />

      {/* Expenses section */}
      <PlanSection
        title="Expenses"
        color="red"
        items={expenseItems}
        total={totalExpenses}
        onEdit={openEditItem}
        onDelete={id => setDeleteConfirm(id)}
        onAdd={() => openAddItem('expense')}
      />

      {/* Notes */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={16} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700">Month Notes</h3>
          {!notesEditing && (
            <button onClick={() => { setNotes(plan?.notes ?? ''); setNotesEditing(true); }} className="ml-auto text-xs text-indigo-600 hover:underline">
              {plan?.notes ? 'Edit' : '+ Add notes'}
            </button>
          )}
        </div>
        {notesEditing ? (
          <div className="space-y-2">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Notes for this month's budget..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <div className="flex gap-2">
              <button onClick={() => setNotesEditing(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
              <button onClick={() => saveNotes(notes)} className="text-sm bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700">Save</button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">{plan?.notes || <span className="italic text-gray-300">No notes for this month.</span>}</p>
        )}
      </div>

      {/* Add/Edit Item Modal */}
      {showItemModal && (
        <Modal title={editItem ? 'Edit Budget Item' : 'Add Budget Item'} onClose={() => setShowItemModal(false)}>
          <form onSubmit={handleItemSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                {(['income', 'expense'] as TransactionType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setItemForm(f => ({ ...f, type: t, category: '' }))}
                    className={`flex-1 py-2 text-sm font-medium transition-colors capitalize ${itemForm.type === t
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
                <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={itemForm.category}
                  onChange={e => setItemForm(f => ({ ...f, category: e.target.value }))}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select...</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  value={itemForm.amount}
                  onChange={e => setItemForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description (optional)</label>
              <input
                type="text"
                value={itemForm.description}
                onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))}
                placeholder="e.g. Netflix, Monthly salary..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Frequency</label>
              <div className="flex gap-2 flex-wrap">
                {RECURRING_OPTIONS.map(opt => (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => setItemForm(f => ({ ...f, recurring: opt.value }))}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      itemForm.recurring === opt.value
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
              <button type="button" onClick={() => setShowItemModal(false)} className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50">Cancel</button>
              <button type="submit" className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700">
                {editItem ? 'Save Changes' : 'Add Item'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <Modal title="Delete Item" onClose={() => setDeleteConfirm(null)} size="sm">
          <p className="text-sm text-gray-600 mb-4">Remove this item from the plan?</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteConfirm(null)} className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={() => { removeItem(deleteConfirm); setDeleteConfirm(null); }} className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-red-700">Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function PlanSection({
  title, color, items, total, onEdit, onDelete, onAdd,
}: {
  title: string;
  color: 'green' | 'red';
  items: PlanItem[];
  total: number;
  onEdit: (item: PlanItem) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}) {
  const colorCls = color === 'green'
    ? { header: 'bg-green-50 border-green-100', badge: 'text-green-700 bg-green-100', amount: 'text-green-700', recurring: 'text-green-500 bg-green-50' }
    : { header: 'bg-red-50 border-red-100', badge: 'text-red-700 bg-red-100', amount: 'text-red-700', recurring: 'text-red-500 bg-red-50' };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className={`flex items-center justify-between px-5 py-3 border-b ${colorCls.header}`}>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorCls.badge}`}>
            {items.length} item{items.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-bold ${colorCls.amount}`}>{formatCurrency(total)}</span>
          <button onClick={onAdd} className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-white/60 transition-colors">
            <Plus size={16} />
          </button>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-gray-400">No {title.toLowerCase()} items planned.</p>
          <button onClick={onAdd} className="mt-2 text-xs text-indigo-600 hover:underline">Add one</button>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 group transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800 truncate">{item.description}</span>
                  {item.recurring && (
                    <span className={`flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full font-medium ${colorCls.recurring}`}>
                      <RefreshCw size={9} /> {recurringLabel(item.recurring)}
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400">{item.category}</span>
              </div>
              <span className={`text-sm font-bold ${colorCls.amount} flex-shrink-0`}>{formatCurrency(item.amount)}</span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button onClick={() => onEdit(item)} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg">
                  <Edit2 size={13} />
                </button>
                <button onClick={() => onDelete(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
