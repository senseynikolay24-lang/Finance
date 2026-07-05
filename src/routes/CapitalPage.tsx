import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { db } from '@/db/db';
import { holdingValue, netWorth } from '@/lib/finance';
import { formatMoney } from '@/lib/format';
import { SECTION_COLOR, withAlpha } from '@/lib/theme';
import { useCountUp } from '@/lib/useCountUp';
import { Skeleton } from '@/components/ui/Skeleton';
import { AccountsSection } from './AccountsPage';
import { DepositsSection } from './DepositsPage';
import { InvestmentsSection } from './InvestmentsPage';
import { CreditsSection } from './CreditsPage';
import { SimpleDebtsSection } from './SimpleDebtsPage';

// Цвета совпадают с тематическими цветами разделов Счета/Вклады/Инвестиции.
const ALLOCATION_COLORS = [
  SECTION_COLOR.accounts,
  SECTION_COLOR.deposits,
  SECTION_COLOR.investments,
];

export function CapitalPage() {
  const accounts = useLiveQuery(() => db.accounts.toArray());
  const deposits = useLiveQuery(() => db.deposits.toArray());
  const holdings = useLiveQuery(() => db.holdings.toArray());
  const credits = useLiveQuery(() => db.credits.toArray());
  const simpleDebts = useLiveQuery(() => db.simpleDebts.toArray());

  const ready =
    accounts !== undefined &&
    deposits !== undefined &&
    holdings !== undefined &&
    credits !== undefined &&
    simpleDebts !== undefined;

  const accountsTotal = (accounts ?? [])
    .filter((a) => !a.isArchived)
    .reduce((s, a) => s + a.balance, 0);
  const depositsTotal = (deposits ?? []).reduce((s, d) => s + d.amount, 0);
  const investmentsTotal = (holdings ?? []).reduce(
    (s, h) => s + holdingValue(h.quantity, h.lastPrice),
    0,
  );
  const debtsTotal = (credits ?? []).reduce((s, c) => s + c.currentDebt, 0);
  const owedToMeTotal = (simpleDebts ?? [])
    .filter((d) => d.direction === 'owed_to_me')
    .reduce((s, d) => s + d.remaining, 0);
  const iOweTotal = (simpleDebts ?? [])
    .filter((d) => d.direction === 'i_owe')
    .reduce((s, d) => s + d.remaining, 0);

  const assetsTotal = accountsTotal + depositsTotal + investmentsTotal + owedToMeTotal;
  const totalDebts = debtsTotal + iOweTotal;
  const capital = netWorth(accountsTotal, depositsTotal, investmentsTotal, debtsTotal) +
    owedToMeTotal - iOweTotal;
  const capitalAnim = useCountUp(capital);

  const allocation = useMemo(
    () =>
      [
        { name: 'Счета', value: Math.max(0, accountsTotal) },
        { name: 'Вклады', value: Math.max(0, depositsTotal) },
        { name: 'Инвестиции', value: Math.max(0, investmentsTotal) },
      ].filter((s) => s.value > 0),
    [accountsTotal, depositsTotal, investmentsTotal],
  );

  if (!ready) return <CapitalSkeleton />;

  return (
    <div className="space-y-6">
      <h1 className="pt-1 text-2xl font-bold">Капитал</h1>

      <div
        className="card-hero"
        style={{
          backgroundImage: `linear-gradient(180deg, ${withAlpha('#BA181B', '0d')}, transparent 42%)`,
        }}
      >
        <div className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: '#BA181B' }} />
        <p className="text-sm text-muted">Чистый капитал</p>
        <p className="mt-1 text-3xl font-bold tracking-tight">
          {formatMoney(capitalAnim, 'RUB', { fraction: false })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card py-3">
          <p className="text-xs text-muted">Активы</p>
          <p className="text-lg font-semibold text-income">
            {formatMoney(assetsTotal, 'RUB', { fraction: false })}
          </p>
        </div>
        <div className="card py-3">
          <p className="text-xs text-muted">Долги</p>
          <p className="text-lg font-semibold text-accent-bright">
            {formatMoney(totalDebts, 'RUB', { fraction: false })}
          </p>
        </div>
      </div>

      {allocation.length > 0 && (
        <div className="card">
          <p className="mb-3 text-sm text-muted">Распределение активов</p>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie
                  data={allocation}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={38}
                  outerRadius={58}
                  paddingAngle={2}
                  stroke="none"
                >
                  {allocation.map((s, i) => (
                    <Cell key={s.name} fill={ALLOCATION_COLORS[i % ALLOCATION_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5">
              {allocation.map((s, i) => (
                <div key={s.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length] }}
                    />
                    {s.name}
                  </span>
                  <span className="font-medium">
                    {formatMoney(s.value, 'RUB', { fraction: false })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <AccountsSection />
      <DepositsSection />
      <InvestmentsSection />
      <CreditsSection />
      <SimpleDebtsSection />
    </div>
  );
}

function CapitalSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-20 w-full" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
      <Skeleton className="h-40 w-full" />
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}
