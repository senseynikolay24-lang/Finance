import { NavLink } from 'react-router-dom';
import { IconBank, IconChart, IconHome, IconList, IconTarget } from './ui/Icon';

const TABS = [
  { to: '/', label: 'Обзор', Icon: IconHome, end: true },
  { to: '/ops', label: 'Операции', Icon: IconList, end: false },
  { to: '/budget', label: 'Бюджет', Icon: IconChart, end: false },
  { to: '/capital', label: 'Капитал', Icon: IconBank, end: false },
  { to: '/goals', label: 'Цели', Icon: IconTarget, end: false },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 backdrop-blur-lg">
      <div
        className="mx-auto flex max-w-md items-center justify-around px-2"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {TABS.map((it) => (
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
