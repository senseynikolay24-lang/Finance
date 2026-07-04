import {
  eachDayOfInterval,
  eachMonthOfInterval,
  format,
  getDate,
  getMonth,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import type { Category, Transaction } from '@/db/types';
import type { Period } from '@/store/ui';
import type { Range } from './period';

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
