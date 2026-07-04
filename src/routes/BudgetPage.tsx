import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { db } from '@/db/db';
import { periodRange, shiftPeriod } from '@/lib/period';
import { categoryBreakdown, subcategoryBreakdown } from '@/lib/analytics';
import { formatCompact, formatMoney, monthKey, monthTitle } from '@/lib/format';
import { SECTION_COLOR } from '@/lib/theme';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { CategoryRow } from '@/features/analytics/CategoryRow';
import { IconChevronLeft, IconChevronRight } from '@/components/ui/Icon';

export function BudgetPage() {
  const [anchor, setAnchor] = useState(Date.now());
  const [drillCategoryId, setDrillCategoryId] = useState<number | null>(null);
  const period = monthKey(anchor);
  const range = useMemo(() => periodRange(anchor, 'month'), [anchor]);

  const categories = useLiveQuery(() => db.categories.toArray(), [], []);
  const budgets = useLiveQuery(
    () => db.budgets.where('period').equals(period).toArray(),
    [period],
    [],
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

  const spentByCat = useMemo(() => {
    const map = new Map<number, number>();
    for (const s of categoryBreakdown(txns, categories, 'expense')) {
      map.set(s.categoryId, s.amount);
    }
    return map;
  }, [txns, categories]);

  const breakdown = useMemo(
    () =>
      drillCategoryId != null
        ? subcategoryBreakdown(txns, categories, drillCategoryId)
        : categoryBreakdown(txns, categories, 'expense'),
    [txns, categories, drillCategoryId],
  );

  const expenseParents = categories.filter(
    (c) => c.kind === 'expense' && c.parentId === null,
  );
  const budgetByCat = new Map(budgets.map((b) => [b.categoryId, b]));

  const totalPlanned = budgets.reduce((s, b) => s + b.plannedAmount, 0);
  const totalSpent = [...spentByCat.values()].reduce((s, v) => s + v, 0);

  async function setBudget(categoryId: number, amount: number) {
    const existing = budgetByCat.get(categoryId);
    if (existing) {
      if (amount <= 0) await db.budgets.delete(existing.id!);
      else await db.budgets.update(existing.id!, { plannedAmount: amount });
    } else if (amount > 0) {
      await db.budgets.add({ categoryId, period, plannedAmount: amount });
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="pt-1 text-2xl font-bold">Бюджет</h1>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setAnchor(shiftPeriod(anchor, 'month', -1))}
          className="grid h-9 w-9 place-items-center rounded-full bg-surface text-muted"
        >
          <IconChevronLeft width={18} height={18} />
        </button>
        <span className="text-sm font-medium capitalize">{monthTitle(anchor)}</span>
        <button
          onClick={() => setAnchor(shiftPeriod(anchor, 'month', 1))}
          className="grid h-9 w-9 place-items-center rounded-full bg-surface text-muted"
        >
          <IconChevronRight width={18} height={18} />
        </button>
      </div>

      {totalPlanned > 0 && (
        <div className="card">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-muted">Потрачено из плана</span>
            <span className="font-semibold">
              {formatMoney(totalSpent, 'RUB', { fraction: false })} /{' '}
              {formatMoney(totalPlanned, 'RUB', { fraction: false })}
            </span>
          </div>
          <ProgressBar
            value={(totalSpent / totalPlanned) * 100}
            color={totalSpent > totalPlanned ? '#E5383B' : '#1F8A4C'}
          />
        </div>
      )}

      {/* Разбивка расходов по категориям */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">
            {drillCategoryId != null ? 'Подкатегории' : 'По категориям'}
          </h2>
          {drillCategoryId != null && (
            <button
              onClick={() => setDrillCategoryId(null)}
              className="text-sm text-accent-bright"
            >
              ← Назад
            </button>
          )}
        </div>

        {breakdown.length === 0 ? (
          <EmptyState icon="📊" title="Нет расходов за месяц" color={SECTION_COLOR.budget} />
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
                <p className="text-sm text-muted">Всего потрачено</p>
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
                  drillable={drillCategoryId == null}
                  onDrill={() => setDrillCategoryId(s.categoryId)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Лимиты по категориям */}
      <div>
        <p className="mb-3 text-sm text-muted">
          Задайте лимит на месяц для каждой категории расходов
        </p>
        <div className="space-y-3">
          {expenseParents.map((cat) => {
            const planned = budgetByCat.get(cat.id!)?.plannedAmount ?? 0;
            const spent = spentByCat.get(cat.id!) ?? 0;
            const pct = planned > 0 ? (spent / planned) * 100 : 0;
            const over = spent > planned && planned > 0;
            return (
              <div key={cat.id} className="card">
                <div className="flex items-center gap-3">
                  <span
                    className="grid h-9 w-9 place-items-center rounded-full text-sm"
                    style={{ backgroundColor: cat.color + '33' }}
                  >
                    {cat.icon}
                  </span>
                  <span className="flex-1 font-medium">{cat.name}</span>
                  <input
                    type="number"
                    className="w-28 rounded-xl bg-surface-2 px-3 py-2 text-right text-sm outline-none focus:ring-2 focus:ring-accent/60"
                    placeholder="Лимит"
                    defaultValue={planned || ''}
                    onBlur={(e) => setBudget(cat.id!, Number(e.target.value) || 0)}
                  />
                </div>
                {planned > 0 && (
                  <div className="mt-3">
                    <ProgressBar value={pct} color={over ? '#E5383B' : cat.color} />
                    <p
                      className={`mt-1.5 text-xs ${over ? 'text-accent-bright' : 'text-muted'}`}
                    >
                      Потрачено {formatMoney(spent, 'RUB', { fraction: false })} из{' '}
                      {formatMoney(planned, 'RUB', { fraction: false })}
                      {over
                        ? ` · превышение на ${formatMoney(spent - planned, 'RUB', { fraction: false })}`
                        : ` · остаток ${formatMoney(planned - spent, 'RUB', { fraction: false })}`}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
