import { describe, expect, it } from 'vitest';
import {
  amortizationSchedule,
  annuityPayment,
  creditCardMonthlyInterest,
  debtProgress,
  depositIncome,
  depositMaturityValue,
  freedomColor,
  goalProgress,
  holdingPnL,
  holdingPnLPct,
  holdingValue,
  netWorth,
  savingsRatePct,
  totalOverpayment,
} from './finance';

describe('annuityPayment', () => {
  it('вычисляет аннуитетный платёж по классической формуле', () => {
    // 1 000 000 под 12% на 12 мес ≈ 88 848.79
    expect(annuityPayment(1_000_000, 12, 12)).toBeCloseTo(88848.79, 1);
  });

  it('при нулевой ставке платёж равен телу / срок', () => {
    expect(annuityPayment(120_000, 0, 12)).toBeCloseTo(10_000, 5);
  });

  it('возвращает 0 при нулевом сроке', () => {
    expect(annuityPayment(100_000, 10, 0)).toBe(0);
  });
});

describe('amortizationSchedule', () => {
  it('аннуитет: остаток обнуляется в конце срока', () => {
    const rows = amortizationSchedule(1_000_000, 12, 12, 'annuity');
    expect(rows).toHaveLength(12);
    expect(rows[11].balance).toBeCloseTo(0, 4);
  });

  it('аннуитет: сумма платежей = тело + проценты', () => {
    const rows = amortizationSchedule(500_000, 15, 24, 'annuity');
    const paid = rows.reduce((s, r) => s + r.payment, 0);
    const principal = rows.reduce((s, r) => s + r.principalPart, 0);
    expect(principal).toBeCloseTo(500_000, 2);
    expect(paid).toBeGreaterThan(500_000);
  });

  it('дифференцированный: тело гасится равными долями', () => {
    const rows = amortizationSchedule(1_200_000, 10, 12, 'differentiated');
    for (const r of rows) {
      expect(r.principalPart).toBeCloseTo(100_000, 4);
    }
    expect(rows[11].balance).toBeCloseTo(0, 4);
  });

  it('дифференцированный платёж убывает', () => {
    const rows = amortizationSchedule(1_200_000, 10, 12, 'differentiated');
    expect(rows[0].payment).toBeGreaterThan(rows[11].payment);
  });
});

describe('totalOverpayment', () => {
  it('дифференцированный выгоднее аннуитета по переплате', () => {
    const ann = totalOverpayment(1_000_000, 12, 60, 'annuity');
    const diff = totalOverpayment(1_000_000, 12, 60, 'differentiated');
    expect(ann).toBeGreaterThan(diff);
  });
});

describe('debtProgress / goalProgress', () => {
  it('прогресс долга: половина погашена → 50%', () => {
    expect(debtProgress(1_000_000, 500_000)).toBeCloseTo(50, 5);
  });
  it('прогресс цели ограничен 100%', () => {
    expect(goalProgress(150, 100)).toBe(100);
  });
});

describe('depositMaturityValue / depositIncome', () => {
  it('простой процент: 100k под 10% на год = 110k', () => {
    expect(depositMaturityValue(100_000, 10, 12, 'none')).toBeCloseTo(110_000, 2);
  });

  it('ежемесячная капитализация даёт больше простого процента', () => {
    const simple = depositMaturityValue(100_000, 10, 12, 'none');
    const monthly = depositMaturityValue(100_000, 10, 12, 'monthly');
    expect(monthly).toBeGreaterThan(simple);
  });

  it('доход = итог − тело', () => {
    expect(depositIncome(100_000, 10, 12, 'none')).toBeCloseTo(10_000, 2);
  });
});

describe('holdings', () => {
  it('стоимость позиции', () => {
    expect(holdingValue(10, 250)).toBe(2500);
  });
  it('P/L прибыль', () => {
    expect(holdingPnL(10, 200, 250)).toBe(500);
    expect(holdingPnLPct(200, 250)).toBeCloseTo(25, 5);
  });
  it('P/L убыток', () => {
    expect(holdingPnL(10, 250, 200)).toBe(-500);
  });
});

describe('netWorth', () => {
  it('активы минус долги', () => {
    expect(netWorth(100_000, 50_000, 20_000, 30_000)).toBe(140_000);
  });
  it('может быть отрицательным при долгах больше активов', () => {
    expect(netWorth(10_000, 0, 0, 50_000)).toBe(-40_000);
  });
});

describe('creditCardMonthlyInterest', () => {
  it('считает проценты за месяц по непогашенному остатку', () => {
    // 50 000 долга под 24% годовых → 1000 в месяц
    expect(creditCardMonthlyInterest(50_000, 24)).toBeCloseTo(1000, 5);
  });
  it('ноль при отсутствии долга', () => {
    expect(creditCardMonthlyInterest(0, 24)).toBe(0);
  });
});

describe('savingsRatePct', () => {
  it('половина дохода отложена → 50%', () => {
    expect(savingsRatePct(100_000, 50_000)).toBeCloseTo(50, 5);
  });
  it('расходы больше дохода → 0% (не уходит в минус)', () => {
    expect(savingsRatePct(50_000, 80_000)).toBe(0);
  });
  it('нулевой доход → 0%', () => {
    expect(savingsRatePct(0, 0)).toBe(0);
  });
});

describe('freedomColor', () => {
  it('ниже 30% — danger (красный)', () => {
    expect(freedomColor(0)).toBe('#C81E1E');
    expect(freedomColor(29)).toBe('#C81E1E');
  });
  it('30–59% — жёлтый', () => {
    expect(freedomColor(30)).toBe('#eda100');
    expect(freedomColor(59)).toBe('#eda100');
  });
  it('60% и выше — income (зелёный)', () => {
    expect(freedomColor(60)).toBe('#1F8A4C');
    expect(freedomColor(100)).toBe('#1F8A4C');
  });
});
