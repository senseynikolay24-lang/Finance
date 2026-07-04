import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import {
  IconBank,
  IconCash,
  IconChart,
  IconChevronRight,
  IconCoins,
  IconMenu,
  IconTarget,
  IconWallet,
} from '@/components/ui/Icon';

const SECTIONS = [
  { to: '/accounts', label: 'Счета и карты', Icon: IconWallet, hint: 'Балансы, карты, наличные' },
  { to: '/categories', label: 'Категории', Icon: IconMenu, hint: 'Доходы и расходы, подкатегории' },
  { to: '/credits', label: 'Кредиты и ипотека', Icon: IconBank, hint: 'Долги, кредитные карты' },
  { to: '/deposits', label: 'Вклады', Icon: IconCoins, hint: 'Депозиты со ставкой и сроком' },
  { to: '/investments', label: 'Инвестиции', Icon: IconChart, hint: 'Брокерский счёт, ИИС, акции' },
  { to: '/budgets', label: 'Бюджеты (план/факт)', Icon: IconTarget, hint: 'Планирование по категориям' },
  { to: '/settings', label: 'Настройки', Icon: IconCash, hint: 'Имя, экспорт и импорт данных' },
];

export function MenuPage() {
  const navigate = useNavigate();
  const settings = useLiveQuery(() => db.settings.toArray(), [], []);
  const userName = settings[0]?.userName ?? 'Пользователь';

  return (
    <div>
      <div className="mb-6 flex items-center gap-4 pt-2">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-accent text-2xl font-bold text-white">
          {userName.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <p className="text-lg font-semibold">{userName}</p>
          <p className="text-sm text-muted">Управление финансами</p>
        </div>
      </div>

      <div className="space-y-2">
        {SECTIONS.map(({ to, label, Icon, hint }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className="card flex w-full items-center gap-3 text-left"
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-accent-bright">
              <Icon width={20} height={20} />
            </span>
            <span className="flex-1">
              <span className="block font-medium">{label}</span>
              <span className="block text-xs text-muted">{hint}</span>
            </span>
            <IconChevronRight width={18} height={18} className="text-muted" />
          </button>
        ))}
      </div>
    </div>
  );
}
