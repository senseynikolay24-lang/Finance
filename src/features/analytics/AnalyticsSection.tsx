import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { db } from '@/db/db';
import { monthComparison, topNotes, yearlyTrend } from '@/lib/analytics';
import { formatMoney } from '@/lib/format';
import { IconArrowDown, IconArrowUp, IconChevronRight } from '@/components/ui/Icon';

const YEARS_BACK = 3;

/** Секция «Аналитика» — месяц-к-месяцу, топ трат по заметкам, тренд по годам.
 *  Встроена внутрь страницы «Операции». */
export function AnalyticsSection() {
  const [open, setOpen] = useState(true);
  const allTxns = useLiveQuery(() => db.transactions.toArray(), [], []);

  const comparison = useMemo(() => monthComparison(allTxns), [allTxns]);
  const topExpenseNotes = useMemo(() => topNotes(allTxns, 'expense', 5), [allTxns]);
  const trend = useMemo(() => yearlyTrend(allTxns, YEARS_BACK), [allTxns]);
  const spansMultipleYears = trend.some((p) => p.income > 0 || p.expense > 0)
    && new Set(allTxns.map((t) => new Date(t.date).getFullYear())).size > 1;

  return (
    <section>
      <button
        onClick={() => setOpen((o) => !o)}
        className="mb-2 flex w-full items-center justify-between"
      >
        <h2 className="font-semibold">Аналитика</h2>
        <IconChevronRight
          width={18}
          height={18}
          className={`text-muted transition-transform ${open ? 'rotate-90' : ''}`}
        />
      </button>

      {open && (
        <div className="space-y-4">
          {/* Месяц к месяцу */}
          <div className="card">
            <p className="mb-3 text-sm text-muted">Месяц к месяцу</p>
            <div className="grid grid-cols-2 gap-3">
              <DeltaTile
                label="Доход"
                current={comparison.current.income}
                deltaPct={comparison.incomeDeltaPct}
                positiveIsGood
              />
              <DeltaTile
                label="Расход"
                current={comparison.current.expense}
                deltaPct={comparison.expenseDeltaPct}
                positiveIsGood={false}
              />
            </div>
          </div>

          {/* Топ трат */}
          <div className="card">
            <p className="mb-3 text-sm text-muted">Топ трат по заметкам</p>
            {topExpenseNotes.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">
                Добавляйте заметки к операциям, чтобы видеть здесь топ трат
              </p>
            ) : (
              <div className="space-y-2">
                {topExpenseNotes.map((n) => (
                  <div key={n.note} className="flex items-center justify-between text-sm">
                    <span className="truncate text-soft">
                      {n.note}
                      {n.count > 1 && <span className="text-muted"> ×{n.count}</span>}
                    </span>
                    <span className="font-semibold">
                      {formatMoney(n.amount, 'RUB', { fraction: false })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* По годам */}
          {spansMultipleYears && (
            <div className="card">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-sm text-muted">По годам</p>
                <div className="flex items-center gap-3 text-[10px] text-muted">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-income" /> доход
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-accent-bright" /> расход
                  </span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={trend} barGap={2}>
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#8A8482', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
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
        </div>
      )}
    </section>
  );
}

function DeltaTile({
  label,
  current,
  deltaPct,
  positiveIsGood,
}: {
  label: string;
  current: number;
  deltaPct: number;
  positiveIsGood: boolean;
}) {
  const isUp = deltaPct >= 0;
  const isGood = isUp === positiveIsGood || deltaPct === 0;
  const Icon = isUp ? IconArrowUp : IconArrowDown;
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2.5">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-base font-semibold">
        {formatMoney(current, 'RUB', { fraction: false })}
      </p>
      <div
        className={`mt-1 flex items-center gap-1 text-xs font-medium ${
          isGood ? 'text-income' : 'text-accent-bright'
        }`}
      >
        <Icon width={12} height={12} />
        {Math.abs(deltaPct).toFixed(0)}% к прошлому месяцу
      </div>
    </div>
  );
}
