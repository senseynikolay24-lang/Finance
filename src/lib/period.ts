import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  addDays,
  subMonths,
  addMonths,
  subYears,
  addYears,
  subWeeks,
  addWeeks,
} from 'date-fns';
import type { Period } from '@/store/ui';

export interface Range {
  start: number;
  end: number;
}

const WEEK_OPTS = { weekStartsOn: 1 as const }; // неделя с понедельника

export function periodRange(anchor: number, period: Period): Range {
  const d = new Date(anchor);
  switch (period) {
    case 'day':
      return { start: +startOfDay(d), end: +endOfDay(d) };
    case 'week':
      return { start: +startOfWeek(d, WEEK_OPTS), end: +endOfWeek(d, WEEK_OPTS) };
    case 'month':
      return { start: +startOfMonth(d), end: +endOfMonth(d) };
    case 'year':
      return { start: +startOfYear(d), end: +endOfYear(d) };
  }
}

export function shiftPeriod(anchor: number, period: Period, dir: -1 | 1): number {
  const d = new Date(anchor);
  switch (period) {
    case 'day':
      return +(dir === 1 ? addDays(d, 1) : subDays(d, 1));
    case 'week':
      return +(dir === 1 ? addWeeks(d, 1) : subWeeks(d, 1));
    case 'month':
      return +(dir === 1 ? addMonths(d, 1) : subMonths(d, 1));
    case 'year':
      return +(dir === 1 ? addYears(d, 1) : subYears(d, 1));
  }
}
