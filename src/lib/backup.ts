import { db } from '@/db/db';

const TABLES = [
  'accounts',
  'categories',
  'transactions',
  'credits',
  'creditPayments',
  'goals',
  'deposits',
  'portfolios',
  'holdings',
  'budgets',
  'settings',
] as const;

/** Экспортирует всю БД в JSON-строку. */
export async function exportData(): Promise<string> {
  const dump: Record<string, unknown[]> = {};
  for (const t of TABLES) {
    dump[t] = await db.table(t).toArray();
  }
  return JSON.stringify({ version: 1, exportedAt: Date.now(), data: dump }, null, 2);
}

/** Импортирует данные из JSON, полностью заменяя текущие. */
export async function importData(json: string): Promise<void> {
  const parsed = JSON.parse(json);
  const data = parsed.data ?? parsed;
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      if (!Array.isArray(data[t])) continue;
      await db.table(t).clear();
      await db.table(t).bulkAdd(data[t]);
    }
  });
}
