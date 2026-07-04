import { IconPlus } from './ui/Icon';
import { useUI } from '@/store/ui';

/** Плавающая кнопка добавления операции — отдельно от нижней навигации. */
export function FloatingAddButton() {
  const openTxnModal = useUI((s) => s.openTxnModal);

  return (
    <button
      onClick={() => openTxnModal('expense')}
      className="fixed right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-accent text-white shadow-lg shadow-accent/30 active:scale-95"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)' }}
      aria-label="Добавить операцию"
    >
      <IconPlus width={26} height={26} />
    </button>
  );
}
