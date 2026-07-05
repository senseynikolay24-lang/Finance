// Чистые функции финансовой математики. Покрыты юнит-тестами (finance.test.ts).

import type { Capitalization } from '@/db/types';

/** Аннуитетный платёж: одинаковый ежемесячный платёж на весь срок.
 *  principal — сумма кредита, annualRatePct — годовая ставка в %, months — срок.
 */
export function annuityPayment(
  principal: number,
  annualRatePct: number,
  months: number,
): number {
  if (months <= 0) return 0;
  const i = annualRatePct / 100 / 12;
  if (i === 0) return principal / months;
  const k = (i * Math.pow(1 + i, months)) / (Math.pow(1 + i, months) - 1);
  return principal * k;
}

export interface AmortizationRow {
  month: number; // 1..months
  payment: number;
  principalPart: number;
  interestPart: number;
  balance: number; // остаток долга после платежа
}

/** График погашения (амортизация) для аннуитетного или дифференцированного кредита. */
export function amortizationSchedule(
  principal: number,
  annualRatePct: number,
  months: number,
  type: 'annuity' | 'differentiated',
): AmortizationRow[] {
  const rows: AmortizationRow[] = [];
  if (months <= 0 || principal <= 0) return rows;
  const i = annualRatePct / 100 / 12;
  let balance = principal;

  if (type === 'annuity') {
    const payment = annuityPayment(principal, annualRatePct, months);
    for (let m = 1; m <= months; m++) {
      const interestPart = balance * i;
      let principalPart = payment - interestPart;
      if (m === months || principalPart > balance) principalPart = balance;
      balance = Math.max(0, balance - principalPart);
      rows.push({
        month: m,
        payment: principalPart + interestPart,
        principalPart,
        interestPart,
        balance,
      });
    }
  } else {
    const principalPart = principal / months;
    for (let m = 1; m <= months; m++) {
      const interestPart = balance * i;
      const realPrincipal = Math.min(principalPart, balance);
      balance = Math.max(0, balance - realPrincipal);
      rows.push({
        month: m,
        payment: realPrincipal + interestPart,
        principalPart: realPrincipal,
        interestPart,
        balance,
      });
    }
  }
  return rows;
}

/** Полная переплата по кредиту (сумма всех процентов за срок). */
export function totalOverpayment(
  principal: number,
  annualRatePct: number,
  months: number,
  type: 'annuity' | 'differentiated',
): number {
  return amortizationSchedule(principal, annualRatePct, months, type).reduce(
    (sum, r) => sum + r.interestPart,
    0,
  );
}

/** Остаток долга «как будто по графику», если с даты начала прошло elapsedMonths
 *  месяцев. Используется, чтобы подсказать текущий долг для кредита/ипотеки,
 *  открытых задним числом. Не применяется автоматически — только по запросу
 *  пользователя, т.к. реальные платежи могли отличаться от графика. */
export function scheduleBalanceAt(
  principal: number,
  annualRatePct: number,
  termMonths: number,
  paymentType: 'annuity' | 'differentiated',
  elapsedMonths: number,
): number {
  const rows = amortizationSchedule(principal, annualRatePct, termMonths, paymentType);
  if (rows.length === 0) return principal;
  const idx = clamp(elapsedMonths, 0, rows.length) - 1;
  return idx < 0 ? principal : rows[idx].balance;
}

/** Прогресс закрытия долга в % (0..100). */
export function debtProgress(principal: number, currentDebt: number): number {
  if (principal <= 0) return 100;
  const paid = principal - currentDebt;
  return clamp((paid / principal) * 100, 0, 100);
}

/** Прогресс достижения цели в % (0..100). */
export function goalProgress(current: number, target: number): number {
  if (target <= 0) return 100;
  return clamp((current / target) * 100, 0, 100);
}

const CAP_PER_YEAR: Record<Capitalization, number> = {
  none: 0,
  monthly: 12,
  quarterly: 4,
  yearly: 1,
  end: 0,
};

/** Итоговая сумма вклада к концу срока с учётом капитализации. */
export function depositMaturityValue(
  amount: number,
  annualRatePct: number,
  months: number,
  capitalization: Capitalization,
): number {
  const years = months / 12;
  const r = annualRatePct / 100;
  if (capitalization === 'none') {
    // Простой процент, выплата процентов не капитализируется.
    return amount * (1 + r * years);
  }
  if (capitalization === 'end') {
    // Проценты начисляются один раз в конце срока.
    return amount * (1 + r * years);
  }
  const n = CAP_PER_YEAR[capitalization];
  return amount * Math.pow(1 + r / n, n * years);
}

/** Доход по вкладу (итог минус тело). */
export function depositIncome(
  amount: number,
  annualRatePct: number,
  months: number,
  capitalization: Capitalization,
): number {
  return depositMaturityValue(amount, annualRatePct, months, capitalization) - amount;
}

/** Стоимость позиции по акции (кол-во × текущая цена). */
export function holdingValue(quantity: number, lastPrice: number): number {
  return quantity * lastPrice;
}

/** Прибыль/убыток по позиции: (текущая − средняя) × количество. */
export function holdingPnL(
  quantity: number,
  avgPrice: number,
  lastPrice: number,
): number {
  return (lastPrice - avgPrice) * quantity;
}

/** P/L в процентах относительно вложенного. */
export function holdingPnLPct(avgPrice: number, lastPrice: number): number {
  if (avgPrice <= 0) return 0;
  return ((lastPrice - avgPrice) / avgPrice) * 100;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** Чистый капитал = активы (счета+вклады+инвестиции) минус долги. */
export function netWorth(
  accountsTotal: number,
  depositsTotal: number,
  investmentsTotal: number,
  debtsTotal: number,
): number {
  return accountsTotal + depositsTotal + investmentsTotal - debtsTotal;
}

/** Ориентировочные проценты за месяц по непогашенному остатку кредитной карты
 *  (если долг не закрыт в течение льготного периода). */
export function creditCardMonthlyInterest(
  debtAmount: number,
  annualRatePct: number,
): number {
  return debtAmount * (annualRatePct / 100) / 12;
}

/** «Индекс свободы» — доля дохода за период, которая не была потрачена, % (0..100). */
export function savingsRatePct(income: number, expense: number): number {
  if (income <= 0) return 0;
  return clamp(((income - expense) / income) * 100, 0, 100);
}

/** Цвет «Индекса свободы» по значению: красный / жёлтый / зелёный. */
export function freedomColor(pct: number): string {
  if (pct < 30) return '#C81E1E'; // danger
  if (pct < 60) return '#eda100'; // жёлтый
  return '#1F8A4C'; // income
}
