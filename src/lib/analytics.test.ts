import { describe, expect, it } from 'vitest';
import type { Transaction } from '@/db/types';
import { monthComparison, topNotes, yearlyTrend } from './analytics';

function txn(partial: Partial<Transaction>): Transaction {
  return {
    type: 'expense',
    amount: 0,
    date: Date.now(),
    accountId: 1,
    createdAt: Date.now(),
    ...partial,
  };
}

describe('monthComparison', () => {
  it('сравнивает текущий месяц с предыдущим', () => {
    const anchor = new Date(2026, 6, 15).getTime(); // 15 июля 2026
    const prevMonth = new Date(2026, 5, 10).getTime(); // июнь
    const txns = [
      txn({ type: 'income', amount: 1000, date: anchor }),
      txn({ type: 'expense', amount: 400, date: anchor }),
      txn({ type: 'income', amount: 500, date: prevMonth }),
      txn({ type: 'expense', amount: 800, date: prevMonth }),
    ];
    const cmp = monthComparison(txns, anchor);
    expect(cmp.current).toEqual({ income: 1000, expense: 400 });
    expect(cmp.previous).toEqual({ income: 500, expense: 800 });
    expect(cmp.incomeDeltaPct).toBeCloseTo(100, 5);
    expect(cmp.expenseDeltaPct).toBeCloseTo(-50, 5);
  });

  it('возвращает 100% рост при нулевом предыдущем месяце и ненулевом текущем', () => {
    const anchor = new Date(2026, 6, 15).getTime();
    const txns = [txn({ type: 'income', amount: 100, date: anchor })];
    const cmp = monthComparison(txns, anchor);
    expect(cmp.incomeDeltaPct).toBe(100);
  });

  it('возвращает 0% при обоих месяцах нулевых', () => {
    const anchor = new Date(2026, 6, 15).getTime();
    const cmp = monthComparison([], anchor);
    expect(cmp.incomeDeltaPct).toBe(0);
    expect(cmp.expenseDeltaPct).toBe(0);
  });
});

describe('topNotes', () => {
  it('группирует по заметке без учёта регистра и обрезая пробелы, сортирует по сумме', () => {
    const txns = [
      txn({ type: 'expense', amount: 300, note: 'Пятёрочка' }),
      txn({ type: 'expense', amount: 200, note: '  пятёрочка ' }),
      txn({ type: 'expense', amount: 900, note: 'Аптека' }),
      txn({ type: 'expense', amount: 100 }), // без заметки — пропускается
      txn({ type: 'income', amount: 5000, note: 'Зарплата' }), // другой kind — пропускается
    ];
    const top = topNotes(txns, 'expense', 5);
    expect(top).toEqual([
      { note: 'Аптека', amount: 900, count: 1 },
      { note: 'Пятёрочка', amount: 500, count: 2 },
    ]);
  });

  it('ограничивает результат limit', () => {
    const txns = Array.from({ length: 10 }, (_, i) =>
      txn({ type: 'expense', amount: i + 1, note: `note-${i}` }),
    );
    expect(topNotes(txns, 'expense', 3)).toHaveLength(3);
  });
});

describe('yearlyTrend', () => {
  it('строит точки по календарным годам, включая текущий', () => {
    const trend = yearlyTrend([], 3);
    expect(trend).toHaveLength(3);
    expect(trend[trend.length - 1].label).toBe(String(new Date().getFullYear()));
  });

  it('суммирует доходы/расходы в правильный год', () => {
    const thisYear = new Date().getFullYear();
    const txns = [
      txn({ type: 'income', amount: 1000, date: new Date(thisYear, 0, 1).getTime() }),
      txn({ type: 'expense', amount: 300, date: new Date(thisYear - 1, 5, 1).getTime() }),
    ];
    const trend = yearlyTrend(txns, 2);
    expect(trend[0]).toEqual({ label: String(thisYear - 1), income: 0, expense: 300 });
    expect(trend[1]).toEqual({ label: String(thisYear), income: 1000, expense: 0 });
  });
});
