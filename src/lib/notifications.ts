import type { RecurringPayment } from '@/db/types';
import { formatMoney } from './format';

const NOTIFIED_KEY_PREFIX = 'notified-recurring-';

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied';
  return Notification.requestPermission();
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function alreadyNotified(rp: RecurringPayment): boolean {
  return localStorage.getItem(`${NOTIFIED_KEY_PREFIX}${rp.id}-${todayKey()}`) != null;
}

function markNotified(rp: RecurringPayment): void {
  localStorage.setItem(`${NOTIFIED_KEY_PREFIX}${rp.id}-${todayKey()}`, '1');
}

/** Показывает локальное уведомление по каждому due-платежу (не чаще раза в день на платёж). */
export function notifyDuePayments(due: RecurringPayment[]): void {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return;
  for (const rp of due) {
    if (alreadyNotified(rp)) continue;
    new Notification('Плановый платёж', {
      body: `${rp.name} — ${formatMoney(rp.amount, 'RUB', { fraction: false })}`,
      tag: `recurring-${rp.id}`,
    });
    markNotified(rp);
  }
}
