import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { db } from '@/db/db';
import { periodRange, type Period } from '@/lib/period';
import { groupTransactionsByDay, sumTotals, trendSeries } from '@/lib/analytics';
import { formatDate, formatMoney } from '@/lib/format';
import { PALETTE } from '@/lib/theme';
import { TransactionRow } from '@/features/transactions/TransactionList';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';

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
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [useCustom, setUseCustom] = useState(false);

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
  const groups = useMemo(() => groupTransactionsByDay(rows), [rows]);

  return (
    <div className="space-y-5">
      <h1 className="pt-1 text-2xl font-bold">Операции</h1>

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

      {/* Лента операций по дням */}
      <div>
        <h2 className="mb-2 font-semibold">Операции</h2>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : groups.length === 0 ? (
          <EmptyState
            icon="📒"
            title="Нет операций за период"
            hint="Измените период или добавьте операцию через «+»"
            color={PALETTE[0]}
          />
        ) : (
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
        )}
      </div>
    </div>
  );
}
