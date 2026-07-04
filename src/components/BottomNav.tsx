import { NavLink } from 'react-router-dom';
import { IconHome, IconMenu, IconPlus, IconStats, IconTarget } from './ui/Icon';
import { useUI } from '@/store/ui';

const items = [
  { to: '/', label: 'Главная', Icon: IconHome, end: true },
  { to: '/stats', label: 'Статистика', Icon: IconStats, end: false },
  { to: '/goals', label: 'Цели', Icon: IconTarget, end: false },
  { to: '/menu', label: 'Меню', Icon: IconMenu, end: false },
];

export function BottomNav() {
  const openTxnModal = useUI((s) => s.openTxnModal);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/5 bg-bg/90 backdrop-blur-lg">
      <div
        className="mx-auto flex max-w-md items-center justify-around px-2"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {items.slice(0, 2).map((it) => (
          <NavItem key={it.to} {...it} />
        ))}

        <button
          onClick={() => openTxnModal('expense')}
          className="relative -mt-6 grid h-14 w-14 place-items-center rounded-full bg-accent text-white shadow-lg shadow-accent/40 active:scale-95"
          aria-label="Добавить операцию"
        >
          <IconPlus width={28} height={28} />
        </button>

        {items.slice(2).map((it) => (
          <NavItem key={it.to} {...it} />
        ))}
      </div>
    </nav>
  );
}

function NavItem({
  to,
  label,
  Icon,
  end,
}: {
  to: string;
  label: string;
  Icon: typeof IconHome;
  end: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex flex-1 flex-col items-center gap-1 py-3 text-[11px] ${
          isActive ? 'text-accent-bright' : 'text-muted'
        }`
      }
    >
      <Icon width={22} height={22} />
      <span>{label}</span>
    </NavLink>
  );
}
