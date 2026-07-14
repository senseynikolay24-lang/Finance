import { describe, expect, it } from 'vitest';
import type { RecurringPayment, Transaction } from '@/db/types';
import { daysUntilDue, getDuePayments, isPaidThisMonth } from './recurring';

function rp(partial: Partial<RecurringPayment>): RecurringPayment {
  return {
    name: 'Аренда',
    amount: 30000,
    accountId: 1,
    categoryId: 2,
    dayOfMonth: 5,
    kind: 'expense',
    isActive: true,
    createdAt: Date.now(),
    ...partial,
  };
}

function txn(partial: Partial<Transaction>): Transaction {
  return {
    type: 'expense',
    amount: 30000,
    date: Date.now(),
    accountId: 1,
    categoryId: 2,
    createdAt: Date.now(),
    ...partial,
  };
}

describe('daysUntilDue', () => {
  it('положительное число, если день платежа впереди', () => {
    const today = new Date(2026, 6, 3); // 3 июля
    expect(daysUntilDue(5, today)).toBe(2);
  });

  it('ноль, если день платежа сегодня', () => {
    const today = new Date(2026, 6, 5);
    expect(daysUntilDue(5, today)).toBe(0);
  });

  it('отрицательное число, если день платежа уже прошёл', () => {
    const today = new Date(2026, 6, 10);
    expect(daysUntilDue(5, today)).toBe(-5);
  });
});

describe('isPaidThisMonth', () => {
  it('находит совпадение по типу/счёту/категории/сумме', () => {
    const payment = rp({});
    expect(isPaidThisMonth(payment, [txn({})])).toBe(true);
  });

  it('не находит совпадение при другой сумме', () => {
    const payment = rp({});
    expect(isPaidThisMonth(payment, [txn({ amount: 100 })])).toBe(false);
  });

  it('пусто, если нет транзакций', () => {
    expect(isPaidThisMonth(rp({}), [])).toBe(false);
  });
});

describe('getDuePayments', () => {
  it('включает активный неоплаченный платёж, срок которого сегодня', () => {
    const today = new Date(2026, 6, 5);
    const payments = [rp({ id: 1, dayOfMonth: 5 })];
    expect(getDuePayments(payments, [], today)).toEqual(payments);
  });

  it('включает платёж, срок которого завтра', () => {
    const today = new Date(2026, 6, 4);
    const payments = [rp({ id: 1, dayOfMonth: 5 })];
    expect(getDuePayments(payments, [], today)).toEqual(payments);
  });

  it('исключает платёж, срок которого через 2+ дня', () => {
    const today = new Date(2026, 6, 1);
    const payments = [rp({ id: 1, dayOfMonth: 5 })];
    expect(getDuePayments(payments, [], today)).toEqual([]);
  });

  it('исключает уже оплаченный платёж', () => {
    const today = new Date(2026, 6, 5);
    const payments = [rp({ id: 1, dayOfMonth: 5 })];
    expect(getDuePayments(payments, [txn({})], today)).toEqual([]);
  });

  it('исключает неактивный платёж', () => {
    const today = new Date(2026, 6, 5);
    const payments = [rp({ id: 1, dayOfMonth: 5, isActive: false })];
    expect(getDuePayments(payments, [], today)).toEqual([]);
  });
});
