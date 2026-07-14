import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { db } from './db/db';
import { periodRange } from './lib/period';
import { getDuePayments } from './lib/recurring';
import { getNotificationPermission, notifyDuePayments } from './lib/notifications';
import { BottomNav } from './components/BottomNav';
import { TransactionModal } from './features/transactions/TransactionModal';

const DUE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

async function checkDuePayments(): Promise<void> {
  if (getNotificationPermission() !== 'granted') return;
  const range = periodRange(Date.now(), 'month');
  const [recurring, monthTxns] = await Promise.all([
    db.recurringPayments.toArray(),
    db.transactions.where('date').between(range.start, range.end, true, true).toArray(),
  ]);
  notifyDuePayments(getDuePayments(recurring, monthTxns));
}

const HomePage = lazy(() => import('./routes/HomePage').then((m) => ({ default: m.HomePage })));
const OperationsPage = lazy(() =>
  import('./routes/OperationsPage').then((m) => ({ default: m.OperationsPage })),
);
const CapitalPage = lazy(() =>
  import('./routes/CapitalPage').then((m) => ({ default: m.CapitalPage })),
);
const GoalsPage = lazy(() => import('./routes/GoalsPage').then((m) => ({ default: m.GoalsPage })));
const CategoriesPage = lazy(() =>
  import('./routes/CategoriesPage').then((m) => ({ default: m.CategoriesPage })),
);
const CreditDetailPage = lazy(() =>
  import('./routes/CreditDetailPage').then((m) => ({ default: m.CreditDetailPage })),
);
const SettingsPage = lazy(() =>
  import('./routes/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);

function RouteFallback() {
  return <div className="p-8 text-center text-muted">Загрузка…</div>;
}

export default function App() {
  useEffect(() => {
    checkDuePayments();
    const id = setInterval(checkDuePayments, DUE_CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mx-auto min-h-dvh max-w-md">
      <main className="safe-bottom px-4 pt-4">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/ops" element={<OperationsPage />} />
            <Route path="/capital" element={<CapitalPage />} />
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/credits/:id" element={<CreditDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Suspense>
      </main>
      <BottomNav />
      <TransactionModal />
    </div>
  );
}
