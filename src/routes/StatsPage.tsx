import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  Tooltip,
} from 'recharts';
import { db } from '@/db/db';
import { useUI, type Period } from '@/store/ui';
import { periodRange, shiftPeriod } from '@/lib/period';
import {
  categoryBreakdown,
  subcategoryBreakdown,
  sumTotals,
  trendSeries,
  type CategorySlice,
} from '@/lib/analytics';
import { formatCompact, formatMoney, monthTitle } from '@/lib/format';
import { formatDate } from '@/lib/format';
import { IconChevronLeft, IconChevronRight } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/EmptyState';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'day', label: 'День' },
  { key: 'week', label: 'Неделя' },
  { key: 'month', label: 'Месяц' },
  { key: 'year', label: 'Год' },
];

export function StatsPage() {
  const { statsPeriod, setStatsPeriod, anchorDate, setAnchorDate } = useUI();
  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const [drillCategoryId, setDrillCategoryId] = useState<number | null>(null);

  const range = useMemo(
    () => periodRange(anchorDate, statsPeriod),
    [anchorDate, statsPeriod],
  );

  const txns = useLiveQuery(
    () =>
      db.transactions
        .where('date')
        .between(range.start, range.end, true, true)
        .toArray(),
    [range.start, range.end],
    [],
  );
  const categories = useLiveQuery(() => db.categories.toArray(), [], []);

  const totals = useMemo(() => sumTotals(txns), [txns]);
  const trend = useMemo(
    () => trendSeries(txns, range, statsPeriod),
    [txns, range, statsPeriod],
  );
  const breakdown = useMemo(
    () =>
      drillCategoryId != null
        ? subcategoryBreakdown(txns, categories, drillCategoryId)
        : categoryBreakdown(txns, categories, kind),
    [txns, categories, kind, drillCategoryId],
  );

  const periodTitle =
    statsPeriod === 'year'
      ? new Date(anchorDate).getFullYear().toString()
      : statsPeriod === 'month'
        ? monthTitle(anchorDate)
        : formatDate(range.start) +
          (statsPeriod === 'week' ? ' — ' + formatDate(range.end) : '');

  return (
    <div className="space-y-5">
      <h1 className="pt-1 text-2xl font-bold">Статистика</h1>

      {/* Переключатель периода */}
      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => {
              setStatsPeriod(p.key);
              setDrillCategoryId(null);
            }}
            className={`chip flex-1 ${
              statsPeriod === p.key ? 'chip-active' : 'chip-idle'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Навигация по периодам */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setAnchorDate(shiftPeriod(anchorDate, statsPeriod, -1))}
          className="grid h-9 w-9 place-items-center rounded-full bg-surface text-muted"
        >
          <IconChevronLeft width={18} height={18} />
        </button>
        <span className="text-sm font-medium capitalize">{periodTitle}</span>
        <button
          onClick={() => setAnchorDate(shiftPeriod(anchorDate, statsPeriod, 1))}
          className="grid h-9 w-9 place-items-center rounded-full bg-surface text-muted"
        >
          <IconChevronRight width={18} height={18} />
        </button>
      </div>

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
                tick={{ fill: '#B1A7A6', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <Tooltip
                cursor={{ fill: '#ffffff10' }}
                contentStyle={{
                  background: '#1F252A',
                  border: 'none',
                  borderRadius: 12,
                  color: '#F5F3F4',
                }}
                formatter={(v: number) => formatMoney(v, 'RUB', { fraction: false })}
                labelStyle={{ color: '#B1A7A6' }}
              />
              <Bar dataKey="income" fill="#2E9E5B" radius={[4, 4, 0, 0]} name="Доход" />
              <Bar dataKey="expense" fill="#E5383B" radius={[4, 4, 0, 0]} name="Расход" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Разбивка по категориям */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">
            {drillCategoryId != null ? 'Подкатегории' : 'По категориям'}
          </h2>
          {drillCategoryId != null ? (
            <button
              onClick={() => setDrillCategoryId(null)}
              className="text-sm text-accent-bright"
            >
              ← Назад
            </button>
          ) : (
            <div className="flex gap-1">
              <button
                onClick={() => setKind('expense')}
                className={`chip text-xs ${
                  kind === 'expense' ? 'chip-active' : 'chip-idle'
                }`}
              >
                Расход
              </button>
              <button
                onClick={() => setKind('income')}
                className={`chip text-xs ${
                  kind === 'income' ? 'chip-active' : 'chip-idle'
                }`}
              >
                Доход
              </button>
            </div>
          )}
        </div>

        {breakdown.length === 0 ? (
          <EmptyState
            icon="📊"
            title="Нет данных за период"
            hint="Добавьте операции, чтобы увидеть аналитику"
          />
        ) : (
          <>
            <div className="card mb-3 flex items-center gap-4">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie
                    data={breakdown}
                    dataKey="amount"
                    nameKey="name"
                    innerRadius={38}
                    outerRadius={58}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {breakdown.map((s) => (
                      <Cell key={s.categoryId} fill={s.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1">
                <p className="text-sm text-muted">Всего</p>
                <p className="text-xl font-bold">
                  {formatCompact(breakdown.reduce((s, b) => s + b.amount, 0))} ₽
                </p>
              </div>
            </div>

            <div className="space-y-1">
              {breakdown.map((s) => (
                <CategoryRow
                  key={s.categoryId}
                  slice={s}
                  drillable={drillCategoryId == null && kind === 'expense'}
                  onDrill={() => setDrillCategoryId(s.categoryId)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CategoryRow({
  slice,
  drillable,
  onDrill,
}: {
  slice: CategorySlice;
  drillable: boolean;
  onDrill: () => void;
}) {
  return (
    <button
      onClick={drillable ? onDrill : undefined}
      className="flex w-full items-center gap-3 py-2 text-left"
    >
      <span
        className="grid h-9 w-9 place-items-center rounded-full text-sm"
        style={{ backgroundColor: slice.color + '33' }}
      >
        {slice.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="truncate font-medium">{slice.name}</span>
          <span className="ml-2 shrink-0 font-semibold">
            {formatMoney(slice.amount, 'RUB', { fraction: false })}
          </span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full"
            style={{ width: `${slice.percent}%`, backgroundColor: slice.color }}
          />
        </div>
      </div>
    </button>
  );
}
