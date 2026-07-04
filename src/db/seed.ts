import { db } from './db';
import type { Category } from './types';
import { PALETTE } from '@/lib/theme';

// Категории по умолчанию: верхний уровень + подкатегории.
const DEFAULT_CATEGORIES: Array<{
  name: string;
  kind: Category['kind'];
  icon: string;
  children?: Array<{ name: string; icon: string }>;
}> = [
  {
    name: 'Продукты',
    kind: 'expense',
    icon: '🛒',
    children: [
      { name: 'Супермаркет', icon: '🏪' },
      { name: 'Кафе и рестораны', icon: '🍽️' },
    ],
  },
  {
    name: 'Транспорт',
    kind: 'expense',
    icon: '🚗',
    children: [
      { name: 'Такси', icon: '🚕' },
      { name: 'Общественный транспорт', icon: '🚌' },
      { name: 'Топливо', icon: '⛽' },
    ],
  },
  {
    name: 'Жильё',
    kind: 'expense',
    icon: '🏠',
    children: [
      { name: 'Аренда', icon: '🔑' },
      { name: 'Коммунальные', icon: '💡' },
    ],
  },
  { name: 'Здоровье', kind: 'expense', icon: '💊' },
  { name: 'Развлечения', kind: 'expense', icon: '🎬' },
  { name: 'Одежда', kind: 'expense', icon: '👕' },
  { name: 'Связь и интернет', kind: 'expense', icon: '📱' },
  { name: 'Кредиты и долги', kind: 'expense', icon: '🏦' },
  { name: 'Проценты и комиссии', kind: 'expense', icon: '💳' },
  { name: 'Прочее', kind: 'expense', icon: '📦' },
  {
    name: 'Зарплата',
    kind: 'income',
    icon: '💼',
  },
  { name: 'Подработка', kind: 'income', icon: '💻' },
  { name: 'Проценты и дивиденды', kind: 'income', icon: '📈' },
  { name: 'Подарки', kind: 'income', icon: '🎁' },
  { name: 'Прочие доходы', kind: 'income', icon: '➕' },
];

let seeding: Promise<void> | null = null;

/** Наполняет БД дефолтными данными при первом запуске. Идемпотентно. */
export async function seedIfEmpty(): Promise<void> {
  if (seeding) return seeding;
  seeding = (async () => {
    const catCount = await db.categories.count();
    if (catCount === 0) {
      let colorIdx = 0;
      for (const cat of DEFAULT_CATEGORIES) {
        const parentId = await db.categories.add({
          name: cat.name,
          kind: cat.kind,
          parentId: null,
          icon: cat.icon,
          color: PALETTE[colorIdx % PALETTE.length],
        });
        colorIdx++;
        for (const child of cat.children ?? []) {
          await db.categories.add({
            name: child.name,
            kind: cat.kind,
            parentId,
            icon: child.icon,
            color: PALETTE[colorIdx % PALETTE.length],
          });
        }
      }
    }

    const accCount = await db.accounts.count();
    if (accCount === 0) {
      await db.accounts.add({
        name: 'Основная карта',
        type: 'card',
        balance: 0,
        currency: 'RUB',
        color: '#BA181B',
        isArchived: false,
        createdAt: Date.now(),
      });
      await db.accounts.add({
        name: 'Наличные',
        type: 'cash',
        balance: 0,
        currency: 'RUB',
        color: '#2E9E5B',
        isArchived: false,
        createdAt: Date.now(),
      });
    }

    const settingsCount = await db.settings.count();
    if (settingsCount === 0) {
      await db.settings.add({ userName: 'Пользователь', mainCurrency: 'RUB' });
    }
  })();
  return seeding;
}
