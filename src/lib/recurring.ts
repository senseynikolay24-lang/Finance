import type { RecurringPayment, Transaction, TransactionType } from '@/db/types';

/** Эвристика «оплачено в этом месяце»: ищет операцию с тем же типом/счётом/
 *  категорией/суммой среди транзакций месяца (без явной связи в схеме). */
export function isPaidThisMonth(rp: RecurringPayment, monthTxns: Transaction[]): boolean {
  return monthTxns.some(
    (t) =>
      t.type === (rp.kind as TransactionType) &&
      t.accountId === rp.accountId &&
      t.categoryId === rp.categoryId &&
      t.amount === rp.amount,
  );
}

/** Сколько дней осталось до дня платежа в текущем месяце (может быть отрицательным). */
export function daysUntilDue(dayOfMonth: number, today = new Date()): number {
  return dayOfMonth - today.getDate();
}

/** Активные неоплаченные плановые платежи, срок которых наступает сегодня или завтра. */
export function getDuePayments(
  recurring: RecurringPayment[],
  monthTxns: Transaction[],
  today = new Date(),
): RecurringPayment[] {
  return recurring.filter((rp) => {
    if (!rp.isActive || isPaidThisMonth(rp, monthTxns)) return false;
    const days = daysUntilDue(rp.dayOfMonth, today);
    return days >= 0 && days <= 1;
  });
}
