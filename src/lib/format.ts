import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { Currency } from '@/db/types';

const CURRENCY_SYMBOL: Record<Currency, string> = {
  RUB: '₽',
  USD: '$',
  EUR: '€',
};

/** Форматирует сумму с разрядами и символом валюты: 1234567.5 → "1 234 567,50 ₽". */
export function formatMoney(
  amount: number,
  currency: Currency = 'RUB',
  opts: { sign?: boolean; fraction?: boolean } = {},
): string {
  const { sign = false, fraction = true } = opts;
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: fraction ? 2 : 0,
    maximumFractionDigits: fraction ? 2 : 0,
  }).format(abs);
  const symbol = CURRENCY_SYMBOL[currency];
  const prefix = amount < 0 ? '−' : sign ? '+' : '';
  return `${prefix}${formatted} ${symbol}`;
}

/** Короткий формат для осей графиков: 67545 → "67,5к", 1200000 → "1,2М". */
export function formatCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '−' : '';
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}М`;
  if (abs >= 1_000) return `${sign}${Math.round(abs / 1_000)}к`;
  return `${sign}${Math.round(abs)}`;
}

export function formatDate(ts: number, pattern = 'd MMM yyyy'): string {
  return format(ts, pattern, { locale: ru });
}

export function formatDateTime(ts: number): string {
  return format(ts, 'd MMM, HH:mm', { locale: ru });
}

export function formatPercent(value: number, fraction = 1): string {
  return `${value.toFixed(fraction)}%`;
}

/** Возвращает 'YYYY-MM' для периода бюджета. */
export function monthKey(ts: number): string {
  return format(ts, 'yyyy-MM');
}

/** Русское название месяца в родительном/именительном виде для заголовков. */
export function monthTitle(ts: number): string {
  return format(ts, 'LLLL yyyy', { locale: ru });
}
