import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useStore } from '../store/useStore';
import { formatCurrency, getTransactionsForPeriod, groupByCategory } from '../utils/finance';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface ComparisonRow {
  category: string;
  type: 'income' | 'expense';
  planned: number;
  actual: number;
  diff: number;
  pct: number; // actual/planned * 100
}

type SortKey = 'category' | 'planned' | 'actual' | 'diff' | 'pct';

export function Comparison() {
  const { transactions, monthlyPlans } = useStore();
  const [viewDate, setViewDate] = useState(startOfMonth(new Date()));
  const [sortKey, setSortKey] = useState<SortKey>('category');
  const [sortAsc, setSortAsc] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const planId = `plan-${year}-${month}`;

  const plan = useMemo(() => monthlyPlans.find(p => p.id === planId), [monthlyPlans, planId]);

  const actualTx = useMemo(() => {
    const start = startOfMonth(viewDate);
    const end = endOfMonth(viewDate);
    return getTransactionsForPeriod(transactions, start, end);
  }, [transactions, viewDate]);

  const actualIncomeByCategory = useMemo(() => groupByCategory(actualTx.filter(t => t.type === 'income')), [actualTx]);
  const actualExpenseByCategory = useMemo(() => groupByCategory(actualTx.filter(t => t.type === 'expense')), [actualTx]);

  const rows: ComparisonRow[] = useMemo(() => {
    if (!plan) return [];
    const result: ComparisonRow[] = [];
    const seenIncome = new Set<string>();
    const seenExpense = new Set<string>();

    for (const item of plan.items) {
      const actualMap = item.type === 'income' ? actualIncomeByCategory : actualExpenseByCategory;
      const seen = item.type === 'income' ? seenIncome : seenExpense;
      if (seen.has(item.category)) continue;
      seen.add(item.category);

      const planned = plan.items.filter(i => i.type === item.type && i.category === item.category).reduce((s, i) => s + i.amount, 0);
      const actual = actualMap[item.category] ?? 0;
      const diff = item.type === 'income' ? actual - planned : planned - actual;
      const pct = planned > 0 ? (actual / planned) * 100 : actual > 0 ? Infinity : 0;
      result.push({ category: item.category, type: item.type, planned, actual, diff, pct });
    }

    // Unplanned categories (actual but no plan)
    const addUnplanned = (map: Record<string, number>, type: 'income' | 'expense', seen: Set<string>) => {
      for (const [cat, actual] of Object.entries(map)) {
        if (seen.has(cat)) continue;
        const diff = type === 'income' ? actual : -actual;
        result.push({ category: cat, type, planned: 0, actual, diff, pct: Infinity });
      }
    };
    addUnplanned(actualIncomeByCategory, 'income', seenIncome);
    addUnplanned(actualExpenseByCategory, 'expense', seenExpense);

    return result;
  }, [plan, actualIncomeByCategory, actualExpenseByCategory]);

  const filtered = useMemo(() => {
    const r = typeFilter === 'all' ? rows : rows.filter(r => r.type === typeFilter);
    return [...r].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'category') cmp = a.category.localeCompare(b.category);
      else if (sortKey === 'planned') cmp = a.planned - b.planned;
      else if (sortKey === 'actual') cmp = a.actual - b.actual;
      else if (sortKey === 'diff') cmp = a.diff - b.diff;
      else if (sortKey === 'pct') cmp = (isFinite(a.pct) ? a.pct : 9999) - (isFinite(b.pct) ? b.pct : 9999);
      return sortAsc ? cmp : -cmp;
    });
  }, [rows, sortKey, sortAsc, typeFilter]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(v => !v);
    else { setSortKey(key); setSortAsc(true); }
  }

  const totalPlannedIncome = rows.filter(r => r.type === 'income').reduce((s, r) => s + r.planned, 0);
  const totalActualIncome = rows.filter(r => r.type === 'income').reduce((s, r) => s + r.actual, 0);
  const totalPlannedExpenses = rows.filter(r => r.type === 'expense').reduce((s, r) => s + r.planned, 0);
  const totalActualExpenses = rows.filter(r => r.type === 'expense').reduce((s, r) => s + r.actual, 0);

  const plannedNet = totalPlannedIncome - totalPlannedExpenses;
  const actualNet = totalActualIncome - totalActualExpenses;

  // Chart data: top categories comparison
  const chartData = filtered
    .filter(r => r.planned > 0 || r.actual > 0)
    .slice(0, 10)
    .map(r => ({ name: r.category, Planned: r.planned, Actual: r.actual }));

  // Category status counts
  const overBudget = rows.filter(r => r.type === 'expense' && r.actual > r.planned && r.planned > 0).length;
  const onTrack = rows.filter(r => r.type === 'expense' && r.actual <= r.planned && r.planned > 0).length;
  const unplanned = rows.filter(r => r.planned === 0 && r.actual > 0).length;

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <th
      onClick={() => toggleSort(k)}
      className="text-xs font-medium text-gray-500 text-right px-4 py-3 cursor-pointer select-none hover:text-gray-900 transition-colors"
    >
      {label} {sortKey === k ? (sortAsc ? '↑' : '↓') : ''}
    </th>
  );

  return (
    <div className="space-y-6">
      {/* Month navigator */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-5 py-3">
        <button onClick={() => setViewDate(d => subMonths(d, 1))} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-base font-bold text-gray-900">{format(viewDate, 'MMMM yyyy')}</p>
          <p className="text-xs text-gray-400">Plan vs Actual Comparison</p>
        </div>
        <button onClick={() => setViewDate(d => { const n = new Date(); n.setDate(1); return subMonths(n, -1) > d ? new Date(d.getFullYear(), d.getMonth() + 1, 1) : d; })} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg">
          <ChevronRight size={18} />
        </button>
      </div>

      {!plan ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <Info size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700">No budget plan for {format(viewDate, 'MMMM yyyy')}</p>
          <p className="text-xs text-gray-400 mt-1">Create a plan in the Monthly Planning section to compare against actuals.</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard label="Planned Income" value={totalPlannedIncome} />
            <SummaryCard label="Actual Income" value={totalActualIncome} diff={totalActualIncome - totalPlannedIncome} diffPositiveIsGood />
            <SummaryCard label="Planned Expenses" value={totalPlannedExpenses} />
            <SummaryCard label="Actual Expenses" value={totalActualExpenses} diff={totalActualExpenses - totalPlannedExpenses} diffPositiveIsGood={false} />
          </div>

          {/* Net comparison */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl p-5 text-white">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs opacity-70">Planned Net</p>
                <p className="text-xl font-bold mt-1">{formatCurrency(plannedNet)}</p>
              </div>
              <div>
                <p className="text-xs opacity-70">Actual Net</p>
                <p className={`text-xl font-bold mt-1 ${actualNet >= plannedNet ? 'text-green-300' : 'text-red-300'}`}>{formatCurrency(actualNet)}</p>
              </div>
              <div>
                <p className="text-xs opacity-70">Difference</p>
                <p className={`text-xl font-bold mt-1 ${actualNet >= plannedNet ? 'text-green-300' : 'text-red-300'}`}>{actualNet >= plannedNet ? '+' : ''}{formatCurrency(actualNet - plannedNet)}</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {overBudget > 0 && (
                  <span className="flex items-center gap-1 text-xs bg-red-500/30 text-red-200 px-2 py-1 rounded-full">
                    <AlertTriangle size={11} /> {overBudget} over budget
                  </span>
                )}
                {onTrack > 0 && (
                  <span className="flex items-center gap-1 text-xs bg-green-500/30 text-green-200 px-2 py-1 rounded-full">
                    <CheckCircle size={11} /> {onTrack} on track
                  </span>
                )}
                {unplanned > 0 && (
                  <span className="flex items-center gap-1 text-xs bg-amber-500/30 text-amber-200 px-2 py-1 rounded-full">
                    <Info size={11} /> {unplanned} unplanned
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bar chart */}
          {chartData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Planned vs Actual by Category</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
                  <YAxis tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number | undefined) => formatCurrency(v ?? 0)} />
                  <Legend />
                  <Bar dataKey="Planned" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Actual" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 flex-1">Detailed Breakdown</h3>
              <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
                {(['all', 'income', 'expense'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all capitalize ${typeFilter === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left text-xs font-medium text-gray-500 px-5 py-3 cursor-pointer select-none hover:text-gray-900" onClick={() => toggleSort('category')}>
                      Category {sortKey === 'category' ? (sortAsc ? '↑' : '↓') : ''}
                    </th>
                    <th className="text-xs font-medium text-gray-500 px-4 py-3 text-center">Type</th>
                    <SortHeader label="Planned" k="planned" />
                    <SortHeader label="Actual" k="actual" />
                    <SortHeader label="Difference" k="diff" />
                    <th className="text-xs font-medium text-gray-500 text-right px-5 py-3">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">No data to display</td>
                    </tr>
                  )}
                  {filtered.map((row, i) => {
                    const isExpense = row.type === 'expense';
                    const overBudget = isExpense && row.actual > row.planned && row.planned > 0;
                    const unplanned = row.planned === 0;
                    const pctCapped = Math.min(isFinite(row.pct) ? row.pct : 100, 100);
                    const diffColor = row.diff > 0 ? 'text-green-600' : row.diff < 0 ? 'text-red-600' : 'text-gray-400';

                    return (
                      <tr key={i} className={`${overBudget ? 'bg-red-50/50' : unplanned ? 'bg-amber-50/40' : ''} hover:bg-gray-50 transition-colors`}>
                        <td className="px-5 py-3 font-medium text-gray-900">
                          <div className="flex items-center gap-1.5">
                            {overBudget && <AlertTriangle size={13} className="text-red-500 flex-shrink-0" />}
                            {unplanned && <Info size={13} className="text-amber-500 flex-shrink-0" />}
                            {row.category}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${row.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {row.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">{row.planned > 0 ? formatCurrency(row.planned) : <span className="text-gray-300">—</span>}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(row.actual)}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${diffColor}`}>
                          {row.diff !== 0 ? `${row.diff > 0 ? '+' : ''}${formatCurrency(row.diff)}` : '—'}
                        </td>
                        <td className="px-5 py-3">
                          {!unplanned ? (
                            <div className="flex items-center gap-2 justify-end">
                              <div className="w-24 bg-gray-100 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full transition-all ${overBudget ? 'bg-red-500' : pctCapped > 80 ? 'bg-amber-500' : 'bg-green-500'}`}
                                  style={{ width: `${pctCapped}%` }}
                                />
                              </div>
                              <span className={`text-xs font-medium w-10 text-right ${overBudget ? 'text-red-600' : 'text-gray-600'}`}>
                                {isFinite(row.pct) ? `${row.pct.toFixed(0)}%` : '∞'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-amber-600 font-medium text-right block">Unplanned</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {filtered.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                      <td className="px-5 py-3 text-sm text-gray-700">Total</td>
                      <td />
                      <td className="px-4 py-3 text-right text-sm text-gray-700">
                        {formatCurrency(filtered.reduce((s, r) => s + r.planned, 0))}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">
                        {formatCurrency(filtered.reduce((s, r) => s + r.actual, 0))}
                      </td>
                      <td className={`px-4 py-3 text-right text-sm ${filtered.reduce((s, r) => s + r.diff, 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(filtered.reduce((s, r) => s + r.diff, 0))}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, diff, diffPositiveIsGood }: {
  label: string;
  value: number;
  diff?: number;
  diffPositiveIsGood?: boolean;
}) {
  const hasDiff = diff !== undefined && diff !== 0;
  const isPositive = diff !== undefined && diff > 0;
  const goodColor = diffPositiveIsGood ? isPositive : !isPositive;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(value)}</p>
      {hasDiff && (
        <p className={`text-xs mt-1 font-medium flex items-center gap-0.5 ${goodColor ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {isPositive ? '+' : ''}{formatCurrency(diff)} vs plan
        </p>
      )}
    </div>
  );
}
