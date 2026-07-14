import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { db } from '@/db/db';
import { addTransaction } from '@/db/repo';
import type { RecurringPayment } from '@/db/types';
import { periodRange, shiftPeriod } from '@/lib/period';
import { categoryBreakdown, subcategoryBreakdown } from '@/lib/analytics';
import { isPaidThisMonth as isRecurringPaidThisMonth } from '@/lib/recurring';
import { formatCompact, formatMoney, monthKey, monthTitle } from '@/lib/format';
import { SECTION_COLOR, withAlpha } from '@/lib/theme';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { CategoryRow } from '@/features/analytics/CategoryRow';
import { IconChevronLeft, IconChevronRight, IconPlus } from '@/components/ui/Icon';

const RECURRING_SECTION = '#0F6E5B';

/** Секция «Бюджет» (лимиты, разбивка расходов, плановые платежи) —
 *  встроена внутрь страницы «Операции», см. id="budget-limits" — якорь для скролла. */
export function BudgetSection() {
  const [anchor, setAnchor] = useState(Date.now());
  const [drillCategoryId, setDrillCategoryId] = useState<number | null>(null);
  const period = monthKey(anchor);
  const range = useMemo(() => periodRange(anchor, 'month'), [anchor]);

  const categories = useLiveQuery(() => db.categories.toArray(), [], []);
  const accounts = useLiveQuery(() => db.accounts.toArray(), [], []);
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
  const recurring = useLiveQuery(() => db.recurringPayments.toArray(), [], []);

  const [editingRecurring, setEditingRecurring] = useState<Partial<RecurringPayment> | null>(
    null,
  );
  const [limitsOpen, setLimitsOpen] = useState(true);

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

  function isPaidThisMonth(rp: RecurringPayment): boolean {
    return isRecurringPaidThisMonth(rp, txns);
  }

  async function markPaid(rp: RecurringPayment) {
    await addTransaction({
      type: rp.kind,
      amount: rp.amount,
      date: Date.now(),
      accountId: rp.accountId,
      categoryId: rp.categoryId,
    });
  }

  return (
    <section className="space-y-5">
      <h2 id="budget-limits" className="pt-1 text-xl font-bold">
        Бюджет
      </h2>

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
          <h3 className="font-semibold">
            {drillCategoryId != null ? 'Подкатегории' : 'По категориям'}
          </h3>
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
        <button
          onClick={() => setLimitsOpen((o) => !o)}
          className="mb-3 flex w-full items-center justify-between"
        >
          <h3 className="font-semibold">Лимиты по категориям</h3>
          <IconChevronRight
            width={18}
            height={18}
            className={`text-muted transition-transform ${limitsOpen ? 'rotate-90' : ''}`}
          />
        </button>
        {limitsOpen && (
          <>
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
          </>
        )}
      </div>

      {/* Плановые платежи */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Плановые платежи</h3>
          <button
            onClick={() => setEditingRecurring({})}
            className="grid h-9 w-9 place-items-center rounded-full"
            style={{ backgroundColor: withAlpha(RECURRING_SECTION, '1f'), color: RECURRING_SECTION }}
            aria-label="Добавить плановый платёж"
          >
            <IconPlus width={18} height={18} />
          </button>
        </div>

        {recurring.length === 0 ? (
          <EmptyState
            icon="🔁"
            title="Плановых платежей нет"
            hint="Добавьте повторяющийся платёж, например аренду"
            color={RECURRING_SECTION}
          />
        ) : (
          <div className="space-y-3">
            {recurring.map((rp) => {
              const cat = categories.find((c) => c.id === rp.categoryId);
              const paid = isPaidThisMonth(rp);
              return (
                <button
                  key={rp.id}
                  onClick={() => setEditingRecurring(rp)}
                  className="card block w-full text-left"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-medium">{rp.name}</span>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs"
                      style={{
                        backgroundColor: withAlpha(paid ? '#1F8A4C' : '#8A8482', '1f'),
                        color: paid ? '#1F8A4C' : '#8A8482',
                      }}
                    >
                      {paid ? 'Оплачено в этом месяце' : 'Не оплачено'}
                    </span>
                  </div>
                  <p className="mb-2 text-sm text-muted">
                    {formatMoney(rp.amount, 'RUB', { fraction: false })} · каждое {rp.dayOfMonth}
                    -е число{cat ? ` · ${cat.name}` : ''}
                  </p>
                  {!paid && (
                    <div className="flex justify-end">
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          markPaid(rp);
                        }}
                        className="text-xs font-medium text-accent-bright"
                      >
                        Отметить оплаченным
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {editingRecurring && (
        <RecurringPaymentForm
          payment={editingRecurring}
          accounts={accounts}
          categories={categories}
          onClose={() => setEditingRecurring(null)}
        />
      )}
    </section>
  );
}

function RecurringPaymentForm({
  payment,
  accounts,
  categories,
  onClose,
}: {
  payment: Partial<RecurringPayment>;
  accounts: { id?: number; name: string }[];
  categories: { id?: number; name: string; kind: 'income' | 'expense'; parentId: number | null }[];
  onClose: () => void;
}) {
  const isNew = payment.id == null;
  const [kind, setKind] = useState<'income' | 'expense'>(payment.kind ?? 'expense');
  const [name, setName] = useState(payment.name ?? '');
  const [amount, setAmount] = useState(String(payment.amount ?? ''));
  const [dayOfMonth, setDayOfMonth] = useState(String(payment.dayOfMonth ?? '1'));
  const [accountId, setAccountId] = useState(String(payment.accountId ?? accounts[0]?.id ?? ''));
  const [categoryId, setCategoryId] = useState(String(payment.categoryId ?? ''));

  const availableCategories = categories.filter(
    (c) => c.kind === kind && c.parentId === null,
  );

  async function save() {
    if (!name.trim() || Number(amount) <= 0 || !accountId) return;
    const data = {
      name: name.trim(),
      amount: Number(amount),
      accountId: Number(accountId),
      categoryId: categoryId ? Number(categoryId) : undefined,
      dayOfMonth: Math.min(28, Math.max(1, Number(dayOfMonth) || 1)),
      kind,
      isActive: true,
      createdAt: payment.createdAt ?? Date.now(),
    };
    if (isNew) await db.recurringPayments.add(data);
    else await db.recurringPayments.update(payment.id!, data);
    onClose();
  }

  async function remove() {
    if (payment.id != null && confirm('Удалить плановый платёж?')) {
      await db.recurringPayments.delete(payment.id);
      onClose();
    }
  }

  return (
    <Modal open title={isNew ? 'Новый плановый платёж' : 'Плановый платёж'} onClose={onClose}>
      <label className="label">Тип</label>
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setKind('expense')}
          className={`chip flex-1 ${kind === 'expense' ? 'chip-active' : 'chip-idle'}`}
        >
          Расход
        </button>
        <button
          onClick={() => setKind('income')}
          className={`chip flex-1 ${kind === 'income' ? 'chip-active' : 'chip-idle'}`}
        >
          Доход
        </button>
      </div>

      <label className="label">Название</label>
      <input
        className="field mb-4"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Аренда"
        autoFocus
      />

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label className="label">Сумма</label>
          <input
            type="number"
            className="field"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div>
          <label className="label">День месяца</label>
          <input
            type="number"
            min={1}
            max={28}
            className="field"
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(e.target.value)}
          />
        </div>
      </div>

      <label className="label">Счёт</label>
      <select
        className="field mb-4"
        value={accountId}
        onChange={(e) => setAccountId(e.target.value)}
      >
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>

      <label className="label">Категория</label>
      <select
        className="field mb-5"
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
      >
        <option value="">Без категории</option>
        {availableCategories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <div className="flex gap-3">
        {!isNew && (
          <button onClick={remove} className="btn bg-accent-deep text-white">
            Удалить
          </button>
        )}
        <button onClick={save} className="btn-accent flex-1">
          Сохранить
        </button>
      </div>
    </Modal>
  );
}
