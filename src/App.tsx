import { Route, Routes } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { FloatingAddButton } from './components/FloatingAddButton';
import { TransactionModal } from './features/transactions/TransactionModal';
import { HomePage } from './routes/HomePage';
import { OperationsPage } from './routes/OperationsPage';
import { BudgetPage } from './routes/BudgetPage';
import { CapitalPage } from './routes/CapitalPage';
import { GoalsPage } from './routes/GoalsPage';
import { CategoriesPage } from './routes/CategoriesPage';
import { CreditDetailPage } from './routes/CreditDetailPage';
import { SettingsPage } from './routes/SettingsPage';

export default function App() {
  return (
    <div className="mx-auto min-h-screen max-w-md">
      <main className="safe-bottom px-4 pt-4">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/ops" element={<OperationsPage />} />
          <Route path="/budget" element={<BudgetPage />} />
          <Route path="/capital" element={<CapitalPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/credits/:id" element={<CreditDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
      <BottomNav />
      <FloatingAddButton />
      <TransactionModal />
    </div>
  );
}
