import Dexie, { type Table } from 'dexie';
import type {
  Account,
  Budget,
  Category,
  Credit,
  CreditPayment,
  Deposit,
  Goal,
  Holding,
  Portfolio,
  Settings,
  Transaction,
} from './types';

export class FinanceDB extends Dexie {
  accounts!: Table<Account, number>;
  categories!: Table<Category, number>;
  transactions!: Table<Transaction, number>;
  credits!: Table<Credit, number>;
  creditPayments!: Table<CreditPayment, number>;
  goals!: Table<Goal, number>;
  deposits!: Table<Deposit, number>;
  portfolios!: Table<Portfolio, number>;
  holdings!: Table<Holding, number>;
  budgets!: Table<Budget, number>;
  settings!: Table<Settings, number>;

  constructor() {
    super('finance-db');
    this.version(1).stores({
      accounts: '++id, name, type, isArchived',
      categories: '++id, kind, parentId',
      transactions: '++id, type, date, accountId, toAccountId, categoryId',
      credits: '++id, kind, startDate',
      creditPayments: '++id, creditId, date',
      goals: '++id, deadline',
      deposits: '++id, startDate',
      portfolios: '++id, kind',
      holdings: '++id, portfolioId, ticker',
      budgets: '++id, categoryId, period',
      settings: '++id',
    });
  }
}

export const db = new FinanceDB();
