import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, XAxis } from 'recharts';
import { db } from '@/db/db';
import { formatMoney } from '@/lib/format';
import { holdingValue, netWorth, savingsRatePct } from '@/lib/finance';
import { periodRange } from '@/lib/period';
import { categoryBreakdown, sumTotals, trailingMonthsTrend } from '@/lib/analytics';
import { useUI } from '@/store/ui';
import { CircularProgress } from '@/components/ui/CircularProgress';
import {
  IconArrowDown,
  IconArrowUp,
  IconBank,
  IconCash,
  IconChevronRight,
  IconSettings,
  IconTarget,
} from '@/components/ui/Icon';

const DONUT_FALLBACK_COLOR = '#8A8482';

export function HomePage() {
  const navigate = useNavigate();
  const openTxnModal = useUI((s) => s.openTxnModal);

  const settings = useLiveQuery(() => db.settings.toArray(), [], []);
  const accounts = useLiveQuery(
    () => db.accounts.filter((a) => !a.isArchived).toArray(),
    [],
    [],
  );
  const deposits = useLiveQuery(() => db.deposits.toArray(), [], []);
  const holdings = useLiveQuery(() => db.holdings.toArray(), [], []);
  const credits = useLiveQuery(() => db.credits.toArray(), [], []);
  const goals = useLiveQuery(() => db.goals.toArray(), [], []);
  const categories = useLiveQuery(() => db.categories.toArray(), [], []);
  const allTxns = useLiveQuery(() => db.transactions.toArray(), [], []);

  const monthRange = useMemo(() => periodRange(Date.now(), 'month'), []);
  const periodTxns = useLiveQuery(
    () =>
      db.transactions
        .where('date')
        .between(monthRange.start, monthRange.end, true, true)
        .toArray(),
    [monthRange.start, monthRange.end],
    [],
  );

  const userName = settings[0]?.userName ?? '';

  const accountsTotal = accounts.reduce((s, a) => s + a.balance, 0);
  const depositsTotal = deposits.reduce((s, d) => s + d.amount, 0);
  const investmentsTotal = holdings.reduce(
    (s, h) => s + holdingValue(h.quantity, h.lastPrice),
    0,
  );
  const debtsTotal = credits.reduce((s, c) => s + c.currentDebt, 0);
  const grandTotal = accountsTotal + depositsTotal + investmentsTotal;
  const capital = netWorth(accountsTotal, depositsTotal, investmentsTotal, debtsTotal);

  const { income, expense } = sumTotals(periodTxns);
  const periodBalance = income - expense;
  const freedom = savingsRatePct(income, expense);

  const expenseBreakdown = useMemo(
    () => categoryBreakdown(periodTxns, categories, 'expense').slice(0, 6),
    [periodTxns, categories],
  );
  const trend = useMemo(() => trailingMonthsTrend(allTxns, 6), [allTxns]);

  const goalDone = goals.reduce((s, g) => s + g.currentAmount, 0);
  const goalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const goalPct = goalTarget > 0 ? Math.round((goalDone / goalTarget) * 100) : 0;

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between pt-1">
        <div>
          <p className="text-sm text-muted">С возвращением</p>
          <h1 className="text-2xl font-bold">{userName}</h1>
        </div>
        <button
          onClick={() => navigate('/settings')}
          className="grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-muted"
          aria-label="Настройки"
        >
          <IconSettings width={20} height={20} />
        </button>
      </header>

      {/* Все деньги */}
      <button
        onClick={() => navigate('/capital')}
        className="card flex w-full items-center justify-between text-left"
      >
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted">
            Все деньги
          </p>
          <p className="mt-1 text-2xl font-bold tracking-tight">
            {formatMoney(grandTotal, 'RUB', { fraction: false })}
          </p>
          {debtsTotal > 0 && (
            <p className="mt-0.5 text-xs text-muted">
              {formatMoney(grandTotal - debtsTotal, 'RUB', { fraction: false })} чистыми
            </p>
          )}
        </div>
        <IconChevronRight width={20} height={20} className="text-muted" />
      </button>

      {/* Баланс периода */}
      <div className="card">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted">
          Баланс периода
        </p>
        <p
          className={`mt-1 text-4xl font-bold leading-none tracking-tight ${
            periodBalance < 0 ? 'text-accent-bright' : ''
          }`}
        >
          {formatMoney(periodBalance, 'RUB', { fraction: false })}
        </p>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 rounded-xl bg-surface-2 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-income">
              <IconArrowDown width={13} height={13} /> Доход
            </div>
            <div className="mt-0.5 text-base font-semibold">
              {formatMoney(income, 'RUB', { fraction: false })}
            </div>
          </div>
          <div className="flex-1 rounded-xl bg-surface-2 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-accent-bright">
              <IconArrowUp width={13} height={13} /> Расход
            </div>
            <div className="mt-0.5 text-base font-semibold">
              {formatMoney(expense, 'RUB', { fraction: false })}
            </div>
          </div>
        </div>
      </div>

      {/* Индекс свободы */}
      <div className="card flex items-center gap-4">
        <CircularProgress value={freedom} />
        <div className="flex-1">
          <p className="text-sm font-semibold">Индекс свободы</p>
          <p className="mt-1 text-xs leading-snug text-muted">
            Доля дохода, которую ты не проедаешь. Чем выше — тем ближе финансовая свобода.
          </p>
        </div>
      </div>

      {/* Структура расходов */}
      {expenseBreakdown.length > 0 && (
        <div className="card">
          <h3 className="mb-4 text-sm font-semibold">Структура расходов</h3>
          <div className="flex items-center gap-5">
            <ResponsiveContainer width={92} height={92}>
              <PieChart>
                <Pie
                  data={expenseBreakdown}
                  dataKey="amount"
                  nameKey="name"
                  innerRadius={28}
                  outerRadius={44}
                  paddingAngle={2}
                  stroke="none"
                >
                  {expenseBreakdown.map((s) => (
                    <Cell key={s.categoryId} fill={s.color || DONUT_FALLBACK_COLOR} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="min-w-0 flex-1 space-y-2">
              {expenseBreakdown.map((c) => (
                <div key={c.categoryId} className="flex items-center gap-2 text-sm">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: c.color || DONUT_FALLBACK_COLOR }}
                  />
                  <span className="flex-1 truncate text-muted">{c.name}</span>
                  <span className="font-semibold">{Math.round(c.percent)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Динамика · 6 мес */}
      <div className="card">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Динамика · 6 мес</h3>
          <div className="flex items-center gap-3 text-[10px] text-muted">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-income" /> доход
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-accent-bright" /> расход
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={trend} barGap={2}>
            <XAxis
              dataKey="label"
              tick={{ fill: '#8A8482', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Bar dataKey="income" fill="#1F8A4C" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" fill="#E5383B" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Капитал / Цели */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/capital')}
          className="card p-4 text-left active:scale-[0.98]"
        >
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-accent-bright">
            <IconBank width={14} height={14} /> Капитал
          </div>
          <div className="text-xl font-bold tracking-tight">
            {formatMoney(capital, 'RUB', { fraction: false })}
          </div>
          <div className="mt-0.5 text-xs text-muted">активы − долги</div>
        </button>
        <button
          onClick={() => navigate('/goals')}
          className="card p-4 text-left active:scale-[0.98]"
        >
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-accent-bright">
            <IconTarget width={14} height={14} /> Цели
          </div>
          <div className="text-xl font-bold tracking-tight">{goalPct}%</div>
          <div className="mt-0.5 text-xs text-muted">
            {formatMoney(goalDone, 'RUB', { fraction: false })} из{' '}
            {formatMoney(goalTarget, 'RUB', { fraction: false })}
          </div>
        </button>
      </div>

      {/* Быстрые действия */}
      <section className="grid grid-cols-3 gap-3">
        <QuickAction
          label="Доход"
          Icon={IconArrowDown}
          onClick={() => openTxnModal('income')}
        />
        <QuickAction
          label="Расход"
          Icon={IconArrowUp}
          onClick={() => openTxnModal('expense')}
        />
        <QuickAction
          label="Снятие"
          Icon={IconCash}
          onClick={() => openTxnModal('withdrawal')}
        />
      </section>
    </div>
  );
}

function QuickAction({
  label,
  Icon,
  onClick,
}: {
  label: string;
  Icon: typeof IconArrowUp;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-surface py-3 active:scale-95"
    >
      <span className="grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-accent-bright">
        <Icon width={20} height={20} />
      </span>
      <span className="text-xs text-muted">{label}</span>
    </button>
  );
}
