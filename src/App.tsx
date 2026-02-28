import { useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Accounts } from './pages/Accounts';
import { Transactions } from './pages/Transactions';
import { MonthlyPlan } from './pages/MonthlyPlan';
import { Comparison } from './pages/Comparison';

type Page = 'dashboard' | 'accounts' | 'transactions' | 'planning' | 'comparison';

function App() {
  const [page, setPage] = useState<Page>('dashboard');

  return (
    <Layout currentPage={page} onNavigate={setPage}>
      {page === 'dashboard' && <Dashboard />}
      {page === 'accounts' && <Accounts />}
      {page === 'transactions' && <Transactions />}
      {page === 'planning' && <MonthlyPlan />}
      {page === 'comparison' && <Comparison />}
    </Layout>
  );
}

export default App;
