// Операции над БД, инкапсулирующие бизнес-правила (пересчёт балансов и т.п.).

import { db } from './db';
import type { Transaction } from './types';

/** Эффект операции на баланс конкретного счёта. */
function balanceDelta(txn: Transaction, accountId: number): number {
  const { type, amount } = txn;
  switch (type) {
    case 'income':
      return txn.accountId === accountId ? amount : 0;
    case 'expense':
      return txn.accountId === accountId ? -amount : 0;
    case 'transfer':
    case 'withdrawal':
    case 'topup':
      // Источник теряет, получатель получает.
      if (txn.accountId === accountId) return -amount;
      if (txn.toAccountId === accountId) return amount;
      return 0;
    default:
      return 0;
  }
}

async function applyBalance(txn: Transaction, direction: 1 | -1): Promise<void> {
  const accountIds = new Set<number>();
  accountIds.add(txn.accountId);
  if (txn.toAccountId != null) accountIds.add(txn.toAccountId);
  for (const accId of accountIds) {
    const delta = balanceDelta(txn, accId) * direction;
    if (delta === 0) continue;
    const acc = await db.accounts.get(accId);
    if (!acc) continue;
    await db.accounts.update(accId, { balance: acc.balance + delta });
  }
}

/** Добавляет операцию и пересчитывает баланс затронутых счетов. */
export async function addTransaction(
  txn: Omit<Transaction, 'id' | 'createdAt'>,
): Promise<number> {
  return db.transaction('rw', db.transactions, db.accounts, async () => {
    const full: Transaction = { ...txn, createdAt: Date.now() };
    const id = await db.transactions.add(full);
    await applyBalance({ ...full, id }, 1);
    return id;
  });
}

/** Обновляет операцию: откатывает старый эффект на баланс и применяет новый. */
export async function updateTransaction(
  id: number,
  patch: Omit<Transaction, 'id' | 'createdAt'>,
): Promise<void> {
  return db.transaction('rw', db.transactions, db.accounts, async () => {
    const old = await db.transactions.get(id);
    if (!old) return;
    await applyBalance(old, -1);
    const updated: Transaction = { ...patch, id, createdAt: old.createdAt };
    await db.transactions.put(updated);
    await applyBalance(updated, 1);
  });
}

/** Удаляет операцию и откатывает её влияние на баланс. */
export async function deleteTransaction(id: number): Promise<void> {
  return db.transaction('rw', db.transactions, db.accounts, async () => {
    const old = await db.transactions.get(id);
    if (!old) return;
    await applyBalance(old, -1);
    await db.transactions.delete(id);
  });
}

/** Удаляет счёт и все связанные операции (с откатом балансов других счетов). */
export async function deleteAccount(accountId: number): Promise<void> {
  return db.transaction('rw', db.transactions, db.accounts, async () => {
    const txns = await db.transactions
      .where('accountId')
      .equals(accountId)
      .or('toAccountId')
      .equals(accountId)
      .toArray();
    for (const t of txns) {
      await applyBalance(t, -1);
      if (t.id != null) await db.transactions.delete(t.id);
    }
    await db.accounts.delete(accountId);
  });
}

/** Вносит платёж по кредиту: уменьшает остаток долга и пишет запись в историю. */
export async function addCreditPayment(
  creditId: number,
  amount: number,
  interestPart: number,
  date: number,
  note?: string,
): Promise<void> {
  return db.transaction('rw', db.credits, db.creditPayments, async () => {
    const credit = await db.credits.get(creditId);
    if (!credit) return;
    const principalPart = Math.max(0, amount - interestPart);
    await db.creditPayments.add({
      creditId,
      date,
      amount,
      principalPart,
      interestPart,
      note,
    });
    await db.credits.update(creditId, {
      currentDebt: Math.max(0, credit.currentDebt - principalPart),
    });
  });
}

/** Пополняет цель на указанную сумму. */
export async function contributeToGoal(goalId: number, amount: number): Promise<void> {
  const goal = await db.goals.get(goalId);
  if (!goal) return;
  await db.goals.update(goalId, {
    currentAmount: Math.max(0, goal.currentAmount + amount),
  });
}
