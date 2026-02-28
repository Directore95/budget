import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { useStore } from '../store/useStore';
import { StatCard } from '../components/StatCard';
import {
  formatCurrency,
  getTransactionsForPeriod,
  sumByType,
  groupByCategory,
  projectRecurringForMonth,
} from '../utils/finance';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#06b6d4'];

export function Dashboard() {
  const { accounts, transactions } = useStore();

  const now = new Date();
  const currentStart = startOfMonth(now);
  const currentEnd = endOfMonth(now);
  const nextMonth = addMonths(now, 1);
  const nextYear = nextMonth.getFullYear();
  const nextMonthIdx = nextMonth.getMonth();

  const totalBalance = useMemo(
    () => accounts.reduce((sum, a) => sum + a.balance, 0),
    [accounts]
  );

  const currentTx = useMemo(
    () => getTransactionsForPeriod(transactions, currentStart, currentEnd),
    [transactions, currentStart, currentEnd]
  );

  const currentIncome = useMemo(() => sumByType(currentTx, 'income'), [currentTx]);
  const currentExpenses = useMemo(() => sumByType(currentTx, 'expense'), [currentTx]);
  const currentNet = currentIncome - currentExpenses;

  // Next month projections from recurring transactions
  const projectedTx = useMemo(
    () => projectRecurringForMonth(transactions, nextYear, nextMonthIdx),
    [transactions, nextYear, nextMonthIdx]
  );
  const projectedIncome = useMemo(() => sumByType(projectedTx, 'income'), [projectedTx]);
  const projectedExpenses = useMemo(() => sumByType(projectedTx, 'expense'), [projectedTx]);
  const projectedNet = projectedIncome - projectedExpenses;

  // Expense breakdown for current month
  const expenseByCategory = useMemo(
    () => groupByCategory(currentTx.filter(t => t.type === 'expense')),
    [currentTx]
  );
  const pieData = Object.entries(expenseByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  // Income vs expense bar chart (last 3 months + current)
  const barData = useMemo(() => {
    const months = [-2, -1, 0].map(offset => {
      const d = addMonths(now, offset);
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const txs = getTransactionsForPeriod(transactions, start, end);
      return {
        month: format(d, 'MMM'),
        income: sumByType(txs, 'income'),
        expenses: sumByType(txs, 'expense'),
      };
    });
    months.push({
      month: `${format(nextMonth, 'MMM')} (proj.)`,
      income: projectedIncome,
      expenses: projectedExpenses,
    });
    return months;
  }, [transactions, projectedIncome, projectedExpenses]);

  // Recurring summary
  const recurringExpenses = transactions.filter(t => t.recurring && t.type === 'expense');
  const monthlyRecurring = recurringExpenses.filter(t => t.recurring === 'monthly').reduce((s, t) => s + t.amount, 0);
  const weeklyRecurring = recurringExpenses.filter(t => t.recurring === 'weekly').reduce((s, t) => s + t.amount * 4.33, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Financial Overview</h2>
        <p className="text-sm text-gray-500 mt-0.5">{format(now, 'MMMM yyyy')} · Current state + next month projection</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Net Worth"
          value={formatCurrency(totalBalance)}
          subtitle={`Across ${accounts.length} account${accounts.length !== 1 ? 's' : ''}`}
          icon={<Wallet size={28} className="text-indigo-500" />}
          color="indigo"
        />
        <StatCard
          title="This Month Income"
          value={formatCurrency(currentIncome)}
          icon={<ArrowUpRight size={28} className="text-green-500" />}
          color="green"
        />
        <StatCard
          title="This Month Expenses"
          value={formatCurrency(currentExpenses)}
          icon={<ArrowDownRight size={28} className="text-red-500" />}
          color="red"
        />
        <StatCard
          title="This Month Net"
          value={formatCurrency(currentNet)}
          subtitle={currentNet >= 0 ? 'Surplus' : 'Deficit'}
          icon={currentNet >= 0
            ? <TrendingUp size={28} className="text-green-500" />
            : <TrendingDown size={28} className="text-red-500" />}
          color={currentNet >= 0 ? 'green' : 'red'}
        />
      </div>

      {/* Next month projection */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl p-5 text-white">
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw size={16} className="opacity-80" />
          <span className="text-sm font-medium opacity-90">Next Month Projection — {format(nextMonth, 'MMMM yyyy')}</span>
          <span className="ml-auto text-xs opacity-70">Based on recurring transactions</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs opacity-70 uppercase tracking-wide">Expected Income</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(projectedIncome)}</p>
          </div>
          <div>
            <p className="text-xs opacity-70 uppercase tracking-wide">Expected Expenses</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(projectedExpenses)}</p>
          </div>
          <div>
            <p className="text-xs opacity-70 uppercase tracking-wide">Projected Net</p>
            <p className={`text-xl font-bold mt-1 ${projectedNet < 0 ? 'text-red-300' : 'text-green-300'}`}>
              {formatCurrency(projectedNet)}
            </p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-white/20 flex gap-6 text-xs opacity-80">
          <span>Monthly recurring: {formatCurrency(monthlyRecurring)}/mo</span>
          <span>Weekly recurring (avg): {formatCurrency(weeklyRecurring)}/mo</span>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income vs Expense bar chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Income vs Expenses (Monthly)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number | undefined) => formatCurrency(v ?? 0)} />
              <Legend />
              <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} name="Income" />
              <Bar dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Expense breakdown pie */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Expense Breakdown — This Month</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number | undefined) => formatCurrency(v ?? 0)} />
                <Legend formatter={v => <span style={{ fontSize: 11 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-52 text-gray-400 text-sm">
              No expenses recorded this month
            </div>
          )}
        </div>
      </div>

      {/* Account balances */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Account Balances</h3>
        {accounts.length === 0 ? (
          <p className="text-sm text-gray-400">No accounts yet. Add an account to get started.</p>
        ) : (
          <div className="space-y-3">
            {accounts.map(acc => {
              const pct = totalBalance !== 0 ? Math.abs(acc.balance / Math.abs(totalBalance)) * 100 : 0;
              return (
                <div key={acc.id} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: acc.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800 truncate">{acc.name}</span>
                      <span className={`text-sm font-semibold ml-3 flex-shrink-0 ${acc.balance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        {formatCurrency(acc.balance)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(pct, 100)}%`, background: acc.color }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent transactions */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Recent Transactions</h3>
        {currentTx.length === 0 ? (
          <p className="text-sm text-gray-400">No transactions this month.</p>
        ) : (
          <div className="space-y-2">
            {[...currentTx]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 8)
              .map(tx => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.type === 'income' ? 'bg-green-100' : 'bg-red-100'}`}>
                      {tx.type === 'income'
                        ? <ArrowUpRight size={14} className="text-green-600" />
                        : <ArrowDownRight size={14} className="text-red-600" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{tx.description}</p>
                      <p className="text-xs text-gray-400">{tx.category} · {format(new Date(tx.date), 'MMM d')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </p>
                    {tx.recurring && (
                      <p className="text-xs text-indigo-500">{tx.recurring}</p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
