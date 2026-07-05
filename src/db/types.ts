// Доменные типы приложения. Все суммы хранятся в основной валюте (по умолчанию ₽).

export type Currency = 'RUB' | 'USD' | 'EUR';

export type AccountType = 'card' | 'cash' | 'account' | 'credit_card';

export interface Account {
  id?: number;
  name: string;
  type: AccountType;
  balance: number;
  currency: Currency;
  color: string;
  isArchived: boolean;
  createdAt: number;
  // Поля ниже заполняются только для type === 'credit_card'.
  creditLimit?: number; // кредитный лимит
  rate?: number; // годовая процентная ставка, %
  gracePeriodDays?: number; // льготный период (дни без процентов)
  minPaymentPct?: number; // минимальный платёж как % от долга
  minPaymentFixed?: number; // минимальный платёж фиксированной суммой
  statementDay?: number; // день месяца формирования выписки
}

export type CategoryKind = 'income' | 'expense';

export interface Category {
  id?: number;
  name: string;
  kind: CategoryKind;
  parentId: number | null; // null — категория верхнего уровня, иначе — подкатегория
  icon: string; // эмодзи
  color: string;
  isArchived?: boolean;
}

// Типы операций:
// income   — доход (пополнение счёта извне)
// expense  — расход
// transfer — перевод между своими счетами
// withdrawal — снятие наличных (перевод карта → наличные)
// topup    — пополнение карты (перевод наличные → карта)
export type TransactionType =
  | 'income'
  | 'expense'
  | 'transfer'
  | 'withdrawal'
  | 'topup';

export interface Transaction {
  id?: number;
  type: TransactionType;
  amount: number; // всегда положительное число
  date: number; // timestamp
  accountId: number; // счёт-источник (для income — счёт назначения)
  toAccountId?: number; // счёт-получатель для transfer/withdrawal/topup
  categoryId?: number; // для income/expense
  note?: string;
  tags?: string[];
  createdAt: number;
}

export type CreditKind = 'loan' | 'mortgage' | 'credit_card';
export type PaymentType = 'annuity' | 'differentiated';

export interface Credit {
  id?: number;
  name: string;
  kind: CreditKind;
  principal: number; // тело кредита / первоначальная сумма
  rate: number; // годовая ставка, %
  termMonths: number; // срок в месяцах
  paymentType: PaymentType;
  minPayment?: number; // минимальный платёж (особенно для кредиток)
  startDate: number;
  // Только для кредитных карт:
  creditLimit?: number;
  gracePeriodDays?: number;
  currentDebt: number; // текущий остаток задолженности
  color: string;
  createdAt: number;
}

export interface CreditPayment {
  id?: number;
  creditId: number;
  date: number;
  amount: number;
  principalPart: number; // часть, пошедшая на тело
  interestPart: number; // часть, пошедшая на проценты
  note?: string;
}

export interface Goal {
  id?: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: number;
  accountId?: number;
  color: string;
  icon: string;
  createdAt: number;
}

export type Capitalization = 'none' | 'monthly' | 'quarterly' | 'yearly' | 'end';

export interface Deposit {
  id?: number;
  name: string;
  bank?: string;
  amount: number; // первоначальная сумма
  rate: number; // годовая ставка, %
  startDate: number;
  termMonths: number;
  capitalization: Capitalization;
  color: string;
  createdAt: number;
}

export type PortfolioKind = 'broker' | 'iis';

export interface Portfolio {
  id?: number;
  name: string;
  kind: PortfolioKind;
  color: string;
  createdAt: number;
}

export interface Holding {
  id?: number;
  portfolioId: number;
  ticker: string;
  name: string;
  quantity: number;
  avgPrice: number; // средняя цена покупки за единицу
  lastPrice: number; // текущая цена (ручной ввод)
  lastPriceUpdatedAt: number;
}

export interface Budget {
  id?: number;
  categoryId: number;
  period: string; // 'YYYY-MM'
  plannedAmount: number;
}

export interface Settings {
  id?: number;
  userName: string;
  mainCurrency: Currency;
}

// Простой долг без процентов и графика: «я занял у кого-то» / «я дал в долг».
export type DebtDirection = 'i_owe' | 'owed_to_me';

export interface SimpleDebt {
  id?: number;
  direction: DebtDirection;
  person: string; // имя человека
  amount: number; // исходная сумма
  remaining: number; // остаток долга
  date: number;
  note?: string;
  color: string;
  createdAt: number;
}

// Плановый повторяющийся платёж (аренда, подписки и т.п.) для бюджетирования.
export interface RecurringPayment {
  id?: number;
  name: string;
  amount: number;
  categoryId?: number;
  accountId: number;
  dayOfMonth: number; // 1..28
  kind: 'income' | 'expense';
  isActive: boolean;
  createdAt: number;
}
