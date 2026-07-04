import { Route, Routes } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { TransactionModal } from './features/transactions/TransactionModal';
import { HomePage } from './routes/HomePage';
import { StatsPage } from './routes/StatsPage';
import { GoalsPage } from './routes/GoalsPage';
import { MenuPage } from './routes/MenuPage';
import { AccountsPage } from './routes/AccountsPage';
import { CategoriesPage } from './routes/CategoriesPage';
import { CreditsPage } from './routes/CreditsPage';
import { CreditDetailPage } from './routes/CreditDetailPage';
import { DepositsPage } from './routes/DepositsPage';
import { InvestmentsPage } from './routes/InvestmentsPage';
import { BudgetsPage } from './routes/BudgetsPage';
import { SettingsPage } from './routes/SettingsPage';

export default function App() {
  return (
    <div className="mx-auto min-h-screen max-w-md">
      <main className="safe-bottom px-4 pt-4">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/credits" element={<CreditsPage />} />
          <Route path="/credits/:id" element={<CreditDetailPage />} />
          <Route path="/deposits" element={<DepositsPage />} />
          <Route path="/investments" element={<InvestmentsPage />} />
          <Route path="/budgets" element={<BudgetsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
      <BottomNav />
      <TransactionModal />
    </div>
  );
}
