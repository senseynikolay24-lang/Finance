import {
  eachDayOfInterval,
  eachMonthOfInterval,
  format,
  getDate,
  getMonth,
  subMonths,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import type { Category, Transaction } from '@/db/types';
import { periodRange, shiftPeriod, type Period, type Range } from './period';

export interface Totals {
  income: number;
  expense: number;
}

export function sumTotals(txns: Transaction[]): Totals {
  let income = 0;
  let expense = 0;
  for (const t of txns) {
    if (t.type === 'income') income += t.amount;
    else if (t.type === 'expense') expense += t.amount;
  }
  return { income, expense };
}

export interface CategorySlice {
  categoryId: number;
  name: string;
  icon: string;
  color: string;
  amount: number;
  percent: number;
}

/** Разбивка расходов (или доходов) по категориям верхнего уровня.
 *  Суммы подкатегорий приплюсовываются к их родителю.
 */
export function categoryBreakdown(
  txns: Transaction[],
  categories: Category[],
  kind: 'income' | 'expense',
): CategorySlice[] {
  const byId = new Map(categories.map((c) => [c.id!, c]));
  const rootOf = (id: number): Category | undefined => {
    let cat = byId.get(id);
    while (cat && cat.parentId != null) cat = byId.get(cat.parentId);
    return cat;
  };

  const sums = new Map<number, number>();
  for (const t of txns) {
    if (t.type !== kind || t.categoryId == null) continue;
    const root = rootOf(t.categoryId);
    if (!root?.id) continue;
    sums.set(root.id, (sums.get(root.id) ?? 0) + t.amount);
  }

  const total = [...sums.values()].reduce((s, v) => s + v, 0);
  const slices: CategorySlice[] = [];
  for (const [catId, amount] of sums) {
    const cat = byId.get(catId);
    if (!cat) continue;
    slices.push({
      categoryId: catId,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      amount,
      percent: total > 0 ? (amount / total) * 100 : 0,
    });
  }
  return slices.sort((a, b) => b.amount - a.amount);
}

/** Разбивка по подкатегориям внутри одной родительской категории (drill-down). */
export function subcategoryBreakdown(
  txns: Transaction[],
  categories: Category[],
  parentId: number,
): CategorySlice[] {
  const byId = new Map(categories.map((c) => [c.id!, c]));
  const children = categories.filter((c) => c.parentId === parentId);
  const childIds = new Set(children.map((c) => c.id));

  const sums = new Map<number, number>();
  for (const t of txns) {
    if (t.categoryId == null) continue;
    // Прямо на родителе или на его подкатегории
    if (t.categoryId === parentId) {
      sums.set(parentId, (sums.get(parentId) ?? 0) + t.amount);
    } else if (childIds.has(t.categoryId)) {
      sums.set(t.categoryId, (sums.get(t.categoryId) ?? 0) + t.amount);
    }
  }

  const total = [...sums.values()].reduce((s, v) => s + v, 0);
  const result: CategorySlice[] = [];
  for (const [catId, amount] of sums) {
    const cat = byId.get(catId);
    if (!cat) continue;
    result.push({
      categoryId: catId,
      name: catId === parentId ? `${cat.name} (без подкатегории)` : cat.name,
      icon: cat.icon,
      color: cat.color,
      amount,
      percent: total > 0 ? (amount / total) * 100 : 0,
    });
  }
  return result.sort((a, b) => b.amount - a.amount);
}

export interface TrendPoint {
  label: string;
  income: number;
  expense: number;
}

/** Динамика доходов/расходов внутри периода (для столбчатого графика). */
export function trendSeries(
  txns: Transaction[],
  range: Range,
  period: Period,
): TrendPoint[] {
  if (period === 'year') {
    // 12 месяцев
    const months = eachMonthOfInterval({
      start: new Date(range.start),
      end: new Date(range.end),
    });
    const points: TrendPoint[] = months.map((m) => ({
      label: format(m, 'LLL', { locale: ru }),
      income: 0,
      expense: 0,
    }));
    for (const t of txns) {
      const idx = getMonth(new Date(t.date)) - getMonth(new Date(range.start));
      if (idx < 0 || idx >= points.length) continue;
      if (t.type === 'income') points[idx].income += t.amount;
      else if (t.type === 'expense') points[idx].expense += t.amount;
    }
    return points;
  }

  if (period === 'day') {
    const point: TrendPoint = { label: 'Сегодня', income: 0, expense: 0 };
    for (const t of txns) {
      if (t.type === 'income') point.income += t.amount;
      else if (t.type === 'expense') point.expense += t.amount;
    }
    return [point];
  }

  // week / month — по дням
  const days = eachDayOfInterval({
    start: new Date(range.start),
    end: new Date(range.end),
  });
  const points: TrendPoint[] = days.map((d) => ({
    label:
      period === 'week'
        ? format(d, 'EEEEEE', { locale: ru })
        : String(getDate(d)),
    income: 0,
    expense: 0,
  }));
  const startDay = getDate(new Date(range.start));
  for (const t of txns) {
    const idx =
      period === 'week'
        ? days.findIndex(
            (d) => format(d, 'yyyy-MM-dd') === format(new Date(t.date), 'yyyy-MM-dd'),
          )
        : getDate(new Date(t.date)) - startDay;
    if (idx < 0 || idx >= points.length) continue;
    if (t.type === 'income') points[idx].income += t.amount;
    else if (t.type === 'expense') points[idx].expense += t.amount;
  }
  return points;
}

export interface TransactionDayGroup {
  dateKey: string; // 'yyyy-MM-dd', используется как React key
  date: number; // timestamp начала дня — для форматирования заголовка
  transactions: Transaction[];
}

/** Группирует операции по дням (от новых к старым), для ленты на экране «Операции». */
export function groupTransactionsByDay(txns: Transaction[]): TransactionDayGroup[] {
  const sorted = [...txns].sort((a, b) => b.date - a.date);
  const groups = new Map<string, TransactionDayGroup>();
  for (const t of sorted) {
    const key = format(new Date(t.date), 'yyyy-MM-dd');
    let group = groups.get(key);
    if (!group) {
      group = { dateKey: key, date: t.date, transactions: [] };
      groups.set(key, group);
    }
    group.transactions.push(t);
  }
  return [...groups.values()];
}

/** Динамика доходов/расходов за N последних календарных месяцев (включая текущий),
 *  для карточки «Динамика» на экране «Обзор». */
export function trailingMonthsTrend(txns: Transaction[], monthsBack: number): TrendPoint[] {
  const points: TrendPoint[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const monthDate = subMonths(new Date(), i);
    const range = periodRange(+monthDate, 'month');
    const point: TrendPoint = {
      label: format(monthDate, 'LLL', { locale: ru }),
      income: 0,
      expense: 0,
    };
    for (const t of txns) {
      if (t.date < range.start || t.date > range.end) continue;
      if (t.type === 'income') point.income += t.amount;
      else if (t.type === 'expense') point.expense += t.amount;
    }
    points.push(point);
  }
  return points;
}

function deltaPct(current: number, previous: number): number {
  if (previous > 0) return ((current - previous) / previous) * 100;
  return current > 0 ? 100 : 0;
}

export interface MonthComparison {
  current: Totals;
  previous: Totals;
  incomeDeltaPct: number;
  expenseDeltaPct: number;
}

/** Сравнение текущего календарного месяца с предыдущим. */
export function monthComparison(txns: Transaction[], anchor = Date.now()): MonthComparison {
  const currentRange = periodRange(anchor, 'month');
  const previousRange = periodRange(shiftPeriod(anchor, 'month', -1), 'month');
  const inRange = (t: Transaction, r: Range) => t.date >= r.start && t.date <= r.end;
  const current = sumTotals(txns.filter((t) => inRange(t, currentRange)));
  const previous = sumTotals(txns.filter((t) => inRange(t, previousRange)));
  return {
    current,
    previous,
    incomeDeltaPct: deltaPct(current.income, previous.income),
    expenseDeltaPct: deltaPct(current.expense, previous.expense),
  };
}

export interface NoteSlice {
  note: string;
  amount: number;
  count: number;
}

/** Топ операций по заметке (замена «топ мест трат» при отсутствии поля merchant). */
export function topNotes(
  txns: Transaction[],
  kind: 'income' | 'expense',
  limit = 5,
): NoteSlice[] {
  const sums = new Map<string, NoteSlice>();
  for (const t of txns) {
    if (t.type !== kind) continue;
    const note = t.note?.trim();
    if (!note) continue;
    const key = note.toLowerCase();
    const existing = sums.get(key);
    if (existing) {
      existing.amount += t.amount;
      existing.count += 1;
    } else {
      sums.set(key, { note, amount: t.amount, count: 1 });
    }
  }
  return [...sums.values()].sort((a, b) => b.amount - a.amount).slice(0, limit);
}

/** Динамика доходов/расходов по календарным годам (включая текущий). */
export function yearlyTrend(txns: Transaction[], yearsBack: number): TrendPoint[] {
  const points: TrendPoint[] = [];
  for (let i = yearsBack - 1; i >= 0; i--) {
    const yearDate = new Date().getFullYear() - i;
    const range = periodRange(new Date(yearDate, 0, 1).getTime(), 'year');
    const point: TrendPoint = { label: String(yearDate), income: 0, expense: 0 };
    for (const t of txns) {
      if (t.date < range.start || t.date > range.end) continue;
      if (t.type === 'income') point.income += t.amount;
      else if (t.type === 'expense') point.expense += t.amount;
    }
    points.push(point);
  }
  return points;
}
