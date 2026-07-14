import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { db } from '@/db/db';
import { periodRange, type Period } from '@/lib/period';
import { categoryBreakdown, groupTransactionsByDay, sumTotals, trendSeries } from '@/lib/analytics';
import { formatDate, formatMoney } from '@/lib/format';
import { PALETTE } from '@/lib/theme';
import { TransactionRow } from '@/features/transactions/TransactionList';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { BudgetSection } from '@/features/budget/BudgetSection';
import { AnalyticsSection } from '@/features/analytics/AnalyticsSection';
import { IconChevronRight, IconSearch } from '@/components/ui/Icon';

type Preset = 'day' | 'week' | 'month' | 'year' | 'all';

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'day', label: 'Сегодня' },
  { key: 'week', label: 'Эта неделя' },
  { key: 'month', label: 'Этот месяц' },
  { key: 'year', label: 'Этот год' },
  { key: 'all', label: 'Всё время' },
];

function granularityFor(start: number, end: number): Period {
  const days = (end - start) / 86_400_000;
  if (days <= 1.5) return 'day';
  if (days <= 31) return 'month';
  return 'year';
}

export function OperationsPage() {
  const [preset, setPreset] = useState<Preset>('month');
  const [feedOpen, setFeedOpen] = useState(true);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [query, setQuery] = useState('');

  const range = useMemo(() => {
    if (useCustom && customFrom && customTo) {
      return {
        start: new Date(customFrom).setHours(0, 0, 0, 0),
        end: new Date(customTo).setHours(23, 59, 59, 999),
      };
    }
    if (preset === 'all') {
      return { start: 0, end: Date.now() };
    }
    return periodRange(Date.now(), preset);
  }, [preset, customFrom, customTo, useCustom]);

  const txns = useLiveQuery(
    () =>
      db.transactions
        .where('date')
        .between(range.start, range.end, true, true)
        .toArray(),
    [range.start, range.end],
  );

  const loading = txns === undefined;
  const rows = txns ?? [];
  const totals = useMemo(() => sumTotals(rows), [rows]);
  const granularity = granularityFor(range.start, range.end);
  const trend = useMemo(
    () => trendSeries(rows, range, granularity),
    [rows, range, granularity],
  );

  const accounts = useLiveQuery(() => db.accounts.toArray(), [], []);

  // Индикатор лимита бюджета — всегда по текущему календарному месяцу,
  // независимо от фильтра дат выше (лимиты в БД месячные).
  const currentMonthRange = useMemo(() => periodRange(Date.now(), 'month'), []);
  const currentMonthKey = useMemo(() => {
    const d = new Date(currentMonthRange.start);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, [currentMonthRange]);
  const monthBudgets = useLiveQuery(
    () => db.budgets.where('period').equals(currentMonthKey).toArray(),
    [currentMonthKey],
    [],
  );
  const monthCategories = useLiveQuery(() => db.categories.toArray(), [], []);
  const monthTxns = useLiveQuery(
    () =>
      db.transactions
        .where('date')
        .between(currentMonthRange.start, currentMonthRange.end, true, true)
        .toArray(),
    [currentMonthRange.start, currentMonthRange.end],
    [],
  );
  const totalPlanned = monthBudgets.reduce((s, b) => s + b.plannedAmount, 0);
  const totalSpent = categoryBreakdown(monthTxns, monthCategories, 'expense').reduce(
    (s, c) => s + c.amount,
    0,
  );

  // Поиск сужает только ленту операций — итоги и график динамики остаются
  // по полному выбранному периоду, чтобы не искажать сводные цифры.
  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((t) => {
      const cat = monthCategories.find((c) => c.id === t.categoryId);
      const acc = accounts.find((a) => a.id === t.accountId);
      return (
        t.note?.toLowerCase().includes(q) ||
        cat?.name.toLowerCase().includes(q) ||
        acc?.name.toLowerCase().includes(q) ||
        String(t.amount).includes(q)
      );
    });
  }, [rows, query, monthCategories, accounts]);
  const groups = useMemo(() => groupTransactionsByDay(filteredRows), [filteredRows]);

  function scrollToBudget() {
    document.getElementById('budget-limits')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div className="space-y-5">
      <h1 className="pt-1 text-2xl font-bold">Операции</h1>

      {/* Поиск по ленте операций */}
      <div className="relative">
        <IconSearch
          width={18}
          height={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          type="text"
          className="field pl-10"
          placeholder="Поиск по заметке, категории, счёту…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Индикатор лимита бюджета за текущий месяц */}
      {totalPlanned > 0 && (
        <button onClick={scrollToBudget} className="card block w-full text-left">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-muted">Бюджет на этот месяц</span>
            <span className="font-semibold">
              {formatMoney(totalSpent, 'RUB', { fraction: false })} /{' '}
              {formatMoney(totalPlanned, 'RUB', { fraction: false })}
            </span>
          </div>
          <ProgressBar
            value={(totalSpent / totalPlanned) * 100}
            color={totalSpent > totalPlanned ? '#E5383B' : '#1F8A4C'}
          />
        </button>
      )}

      {/* Быстрые пресеты */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => {
              setPreset(p.key);
              setUseCustom(false);
            }}
            className={`chip whitespace-nowrap ${
              !useCustom && preset === p.key ? 'chip-active' : 'chip-idle'
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setUseCustom(true)}
          className={`chip whitespace-nowrap ${useCustom ? 'chip-active' : 'chip-idle'}`}
        >
          Свой период
        </button>
      </div>

      {/* Произвольный диапазон дат */}
      {useCustom && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">С</label>
            <input
              type="date"
              className="field"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="label">По</label>
            <input
              type="date"
              className="field"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Итоги */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card py-3">
          <p className="text-xs text-muted">Доходы</p>
          <p className="text-lg font-semibold text-income">
            {formatMoney(totals.income, 'RUB', { fraction: false })}
          </p>
        </div>
        <div className="card py-3">
          <p className="text-xs text-muted">Расходы</p>
          <p className="text-lg font-semibold text-accent-bright">
            {formatMoney(totals.expense, 'RUB', { fraction: false })}
          </p>
        </div>
      </div>

      {/* График динамики */}
      {trend.length > 1 && (
        <div className="card">
          <p className="mb-3 text-sm text-muted">Динамика</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={trend} barGap={2}>
              <XAxis
                dataKey="label"
                tick={{ fill: '#8A8482', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <Tooltip
                cursor={{ fill: '#00000008' }}
                contentStyle={{
                  background: '#FFFFFF',
                  border: '1px solid #E7E3E2',
                  borderRadius: 12,
                  color: '#1B1717',
                }}
                formatter={(v: number) => formatMoney(v, 'RUB', { fraction: false })}
                labelStyle={{ color: '#8A8482' }}
              />
              <Bar dataKey="income" fill="#1F8A4C" radius={[4, 4, 0, 0]} name="Доход" />
              <Bar dataKey="expense" fill="#E5383B" radius={[4, 4, 0, 0]} name="Расход" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <AnalyticsSection />

      {/* Лента операций по дням */}
      <div>
        <button
          onClick={() => setFeedOpen((o) => !o)}
          className="mb-2 flex w-full items-center justify-between"
        >
          <h2 className="font-semibold">Операции</h2>
          {groups.length > 0 && (
            <IconChevronRight
              width={18}
              height={18}
              className={`text-muted transition-transform ${feedOpen ? 'rotate-90' : ''}`}
            />
          )}
        </button>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : groups.length === 0 ? (
          <EmptyState
            icon="📒"
            title={query.trim() ? `Ничего не найдено по «${query.trim()}»` : 'Нет операций за период'}
            hint={
              query.trim()
                ? 'Попробуйте изменить запрос поиска'
                : 'Измените период или добавьте операцию через «+»'
            }
            color={PALETTE[0]}
          />
        ) : feedOpen ? (
          <div className="space-y-4">
            {groups.map((g) => (
              <div key={g.dateKey}>
                <p className="mb-1 text-xs font-medium text-muted">{formatDate(g.date)}</p>
                <div className="divide-y divide-line">
                  {g.transactions.map((t) => (
                    <TransactionRow key={t.id} txn={t} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <BudgetSection />
    </div>
  );
}
