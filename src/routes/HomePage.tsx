import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, XAxis } from 'recharts';
import { db } from '@/db/db';
import { formatMoney, monthTitle } from '@/lib/format';
import { freedomColor, holdingValue, netWorth, savingsRatePct } from '@/lib/finance';
import { periodRange, shiftPeriod } from '@/lib/period';
import { categoryBreakdown, sumTotals, trailingMonthsTrend } from '@/lib/analytics';
import { PALETTE, withAlpha } from '@/lib/theme';
import { useCountUp } from '@/lib/useCountUp';
import { CircularProgress } from '@/components/ui/CircularProgress';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  IconArrowDown,
  IconArrowUp,
  IconBank,
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconSettings,
  IconTarget,
} from '@/components/ui/Icon';

const DONUT_FALLBACK_COLOR = '#8A8482';

/** Хиро-карточка: цветная полоса-акцент сверху + лёгкая тонировка фона. */
function HeroCard({
  color,
  onClick,
  children,
}: {
  color: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`card-hero block w-full text-left ${onClick ? 'active:scale-[0.99]' : ''}`}
      style={{
        backgroundImage: `linear-gradient(180deg, ${withAlpha(color, '0d')}, transparent 42%)`,
      }}
    >
      <div className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: color }} />
      {children}
    </Tag>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  // Без третьего аргумента useLiveQuery вернёт undefined до готовности —
  // так отличаем «ещё грузится» от «реально пусто».
  const settings = useLiveQuery(() => db.settings.toArray());
  const accounts = useLiveQuery(() =>
    db.accounts.filter((a) => !a.isArchived).toArray(),
  );
  const deposits = useLiveQuery(() => db.deposits.toArray());
  const holdings = useLiveQuery(() => db.holdings.toArray());
  const credits = useLiveQuery(() => db.credits.toArray());
  const simpleDebts = useLiveQuery(() => db.simpleDebts.toArray());
  const goals = useLiveQuery(() => db.goals.toArray());
  const categories = useLiveQuery(() => db.categories.toArray());
  const allTxns = useLiveQuery(() => db.transactions.toArray());

  const [monthAnchor, setMonthAnchor] = useState(Date.now());
  const monthRange = useMemo(() => periodRange(monthAnchor, 'month'), [monthAnchor]);
  const periodTxns = useLiveQuery(
    () =>
      db.transactions
        .where('date')
        .between(monthRange.start, monthRange.end, true, true)
        .toArray(),
    [monthRange.start, monthRange.end],
  );

  const ready =
    accounts !== undefined &&
    deposits !== undefined &&
    holdings !== undefined &&
    credits !== undefined &&
    simpleDebts !== undefined &&
    goals !== undefined &&
    categories !== undefined &&
    allTxns !== undefined &&
    periodTxns !== undefined &&
    settings !== undefined;

  const userName = settings?.[0]?.userName ?? '';

  const accountsTotal = (accounts ?? []).reduce((s, a) => s + a.balance, 0);
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
  const totalDebts = debtsTotal + iOweTotal;
  const grandTotal = accountsTotal + depositsTotal + investmentsTotal + owedToMeTotal;
  const capital =
    netWorth(accountsTotal, depositsTotal, investmentsTotal, debtsTotal) +
    owedToMeTotal -
    iOweTotal;

  const { income, expense } = sumTotals(periodTxns ?? []);
  const periodBalance = income - expense;
  const freedom = savingsRatePct(income, expense);

  const expenseBreakdown = useMemo(
    () => categoryBreakdown(periodTxns ?? [], categories ?? [], 'expense').slice(0, 6),
    [periodTxns, categories],
  );
  const trend = useMemo(() => trailingMonthsTrend(allTxns ?? [], 6), [allTxns]);

  const goalDone = (goals ?? []).reduce((s, g) => s + g.currentAmount, 0);
  const goalTarget = (goals ?? []).reduce((s, g) => s + g.targetAmount, 0);
  const goalPct = goalTarget > 0 ? Math.round((goalDone / goalTarget) * 100) : 0;

  // Плавный «докрут» хиро-сумм (хуки вызываются всегда, до раннего return).
  const grandTotalAnim = useCountUp(grandTotal);
  const periodBalanceAnim = useCountUp(periodBalance);
  const capitalAnim = useCountUp(capital);

  // Онбординг: показываем, пока данных фактически нет.
  const noMoney =
    (accounts ?? []).every((a) => a.balance === 0) &&
    (deposits ?? []).length === 0 &&
    (holdings ?? []).length === 0;
  const showOnboarding =
    ready && !onboardingDismissed && noMoney && (allTxns ?? []).length === 0;

  if (!ready) return <HomeSkeleton />;

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

      {/* Онбординг */}
      {showOnboarding && (
        <HeroCard color={PALETTE[0]}>
          <div className="flex items-start justify-between">
            <p className="text-sm font-bold">Начните здесь 👋</p>
            <button
              onClick={() => setOnboardingDismissed(true)}
              className="text-muted"
              aria-label="Скрыть"
            >
              <IconClose width={16} height={16} />
            </button>
          </div>
          <p className="mt-1 text-xs leading-snug text-muted">
            Три шага, чтобы приложение начало работать на вас:
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => navigate('/capital')}
              className="flex-1 rounded-xl bg-surface-2 px-3 py-2 text-xs font-medium"
            >
              1. Добавить счёт
            </button>
            <button
              onClick={() => navigate('/ops')}
              className="flex-1 rounded-xl bg-surface-2 px-3 py-2 text-xs font-medium"
            >
              2. Записать трату
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-snug text-muted">
            А «Индекс свободы» покажет, какую долю дохода вы откладываете.
          </p>
        </HeroCard>
      )}

      {/* Все деньги */}
      <HeroCard color="#BA181B" onClick={() => navigate('/capital')}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted">
              Все деньги
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight">
              {formatMoney(grandTotalAnim, 'RUB', { fraction: false })}
            </p>
            {totalDebts > 0 && (
              <p className="mt-0.5 text-xs text-muted">
                {formatMoney(grandTotal - totalDebts, 'RUB', { fraction: false })} чистыми
              </p>
            )}
          </div>
          <IconChevronRight width={20} height={20} className="text-muted" />
        </div>
      </HeroCard>

      {/* Баланс периода */}
      <HeroCard color={periodBalance < 0 ? '#E5383B' : '#1F8A4C'}>
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted">
            Баланс периода
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMonthAnchor((a) => shiftPeriod(a, 'month', -1))}
              className="grid h-6 w-6 place-items-center rounded-full text-muted"
              aria-label="Прошлый месяц"
            >
              <IconChevronLeft width={14} height={14} />
            </button>
            <span className="text-[11px] font-medium capitalize text-muted">
              {monthTitle(monthAnchor)}
            </span>
            <button
              onClick={() => setMonthAnchor((a) => shiftPeriod(a, 'month', 1))}
              className="grid h-6 w-6 place-items-center rounded-full text-muted"
              aria-label="Следующий месяц"
            >
              <IconChevronRight width={14} height={14} />
            </button>
          </div>
        </div>
        <p
          className={`mt-1 text-4xl font-bold leading-none tracking-tight ${
            periodBalance < 0 ? 'text-accent-bright' : ''
          }`}
        >
          {formatMoney(periodBalanceAnim, 'RUB', { fraction: false })}
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
      </HeroCard>

      {/* Индекс свободы */}
      <div className="card flex items-center gap-4">
        <CircularProgress value={freedom} color={freedomColor(freedom)} />
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
          <div
            className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider"
            style={{ color: PALETTE[0] }}
          >
            <IconBank width={14} height={14} /> Капитал
          </div>
          <div className="text-xl font-bold tracking-tight">
            {formatMoney(capitalAnim, 'RUB', { fraction: false })}
          </div>
          <div className="mt-0.5 text-xs text-muted">активы − долги</div>
        </button>
        <button
          onClick={() => navigate('/goals')}
          className="card p-4 text-left active:scale-[0.98]"
        >
          <div
            className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider"
            style={{ color: PALETTE[2] }}
          >
            <IconTarget width={14} height={14} /> Цели
          </div>
          <div className="text-xl font-bold tracking-tight">{goalPct}%</div>
          <div className="mt-0.5 text-xs text-muted">
            {formatMoney(goalDone, 'RUB', { fraction: false })} из{' '}
            {formatMoney(goalTarget, 'RUB', { fraction: false })}
          </div>
        </button>
      </div>

    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pt-1">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-40 w-full" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}
