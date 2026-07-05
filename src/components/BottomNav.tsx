import { NavLink } from 'react-router-dom';
import { useUI } from '@/store/ui';
import { IconBank, IconHome, IconList, IconPlus, IconTarget } from './ui/Icon';

const TABS = [
  { to: '/', label: 'Обзор', Icon: IconHome, end: true },
  { to: '/ops', label: 'Операции', Icon: IconList, end: false },
];
const TABS_RIGHT = [
  { to: '/capital', label: 'Капитал', Icon: IconBank, end: false },
  { to: '/goals', label: 'Цели', Icon: IconTarget, end: false },
];

export function BottomNav() {
  const openTxnModal = useUI((s) => s.openTxnModal);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 backdrop-blur-lg">
      <div
        className="mx-auto flex max-w-md items-center justify-around px-2"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {TABS.map((it) => (
          <NavItem key={it.to} {...it} />
        ))}
        <button
          onClick={() => openTxnModal('expense')}
          className="mx-1 grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent text-white active:scale-95"
          aria-label="Добавить операцию"
        >
          <IconPlus width={24} height={24} />
        </button>
        {TABS_RIGHT.map((it) => (
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
