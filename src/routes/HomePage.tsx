import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '@/db/db';
import { formatMoney } from '@/lib/format';
import { debtProgress } from '@/lib/finance';
import { useUI } from '@/store/ui';
import { TransactionList } from '@/features/transactions/TransactionList';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import {
  IconArrowDown,
  IconArrowUp,
  IconBank,
  IconCash,
  IconWallet,
} from '@/components/ui/Icon';

export function HomePage() {
  const navigate = useNavigate();
  const openTxnModal = useUI((s) => s.openTxnModal);

  const settings = useLiveQuery(() => db.settings.toArray(), [], []);
  const accounts = useLiveQuery(
    () => db.accounts.filter((a) => !a.isArchived).toArray(),
    [],
    [],
  );
  const recent = useLiveQuery(
    () => db.transactions.orderBy('date').reverse().limit(8).toArray(),
    [],
    [],
  );
  const credits = useLiveQuery(() => db.credits.toArray(), [], []);

  const userName = settings[0]?.userName ?? '';
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const totalDebt = credits.reduce((s, c) => s + c.currentDebt, 0);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between pt-1">
        <div>
          <p className="text-sm text-muted">С возвращением</p>
          <h1 className="text-2xl font-bold">{userName}</h1>
        </div>
      </header>

      {/* Общий баланс */}
      <div
        className="rounded-card p-5"
        style={{
          background: 'linear-gradient(135deg, #BA181B 0%, #660708 100%)',
        }}
      >
        <p className="text-sm text-white/70">Общий баланс</p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-white">
          {formatMoney(totalBalance)}
        </p>
        {totalDebt > 0 && (
          <p className="mt-2 text-sm text-white/80">
            Долги и кредиты: {formatMoney(totalDebt, 'RUB', { fraction: false })}
          </p>
        )}
      </div>

      {/* Карточки счетов */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Мои счета</h2>
          <button
            onClick={() => navigate('/accounts')}
            className="text-sm text-accent-bright"
          >
            Все
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {accounts.map((a) => (
            <button
              key={a.id}
              onClick={() => navigate('/accounts')}
              className="min-w-[9.5rem] shrink-0 rounded-2xl p-4 text-left"
              style={{ backgroundColor: a.color + '22', border: `1px solid ${a.color}44` }}
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-black/20">
                {a.type === 'cash' ? (
                  <IconCash width={18} height={18} />
                ) : a.type === 'account' ? (
                  <IconBank width={18} height={18} />
                ) : (
                  <IconWallet width={18} height={18} />
                )}
              </span>
              <p className="mt-3 truncate text-sm text-muted">{a.name}</p>
              <p className="text-lg font-semibold">
                {formatMoney(a.balance, a.currency, { fraction: false })}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Быстрые действия */}
      <section className="grid grid-cols-4 gap-3">
        <QuickAction
          label="Доход"
          Icon={IconArrowDown}
          onClick={() => openTxnModal('income')}
        />
        <QuickAction
          label="Расход"
          Icon={IconArrowUp}
          onClick={() => openTxnModal('expense')}
        />
        <QuickAction
          label="Снятие"
          Icon={IconCash}
          onClick={() => openTxnModal('withdrawal')}
        />
        <QuickAction
          label="Кредиты"
          Icon={IconBank}
          onClick={() => navigate('/credits')}
        />
      </section>

      {/* Сводка по долгам */}
      {credits.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Закрытие долгов</h2>
            <button
              onClick={() => navigate('/credits')}
              className="text-sm text-accent-bright"
            >
              Все
            </button>
          </div>
          <div className="space-y-3">
            {credits.slice(0, 3).map((c) => {
              const progress = debtProgress(c.principal, c.currentDebt);
              return (
                <button
                  key={c.id}
                  onClick={() => navigate(`/credits/${c.id}`)}
                  className="card block w-full text-left"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-sm text-muted">
                      {formatMoney(c.currentDebt, 'RUB', { fraction: false })}
                    </span>
                  </div>
                  <ProgressBar value={progress} color={c.color} />
                  <p className="mt-1.5 text-xs text-muted">
                    Погашено {progress.toFixed(0)}%
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Последние операции */}
      <section>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-semibold">Операции</h2>
          <button
            onClick={() => navigate('/stats')}
            className="text-sm text-accent-bright"
          >
            Статистика
          </button>
        </div>
        {recent.length ? (
          <TransactionList transactions={recent} />
        ) : (
          <EmptyState
            icon="💸"
            title="Пока нет операций"
            hint="Нажмите «+», чтобы добавить первый доход или расход"
          />
        )}
      </section>
    </div>
  );
}

function QuickAction({
  label,
  Icon,
  onClick,
}: {
  label: string;
  Icon: typeof IconArrowUp;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-2xl bg-surface py-3 active:scale-95"
    >
      <span className="grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-accent-bright">
        <Icon width={20} height={20} />
      </span>
      <span className="text-xs text-muted">{label}</span>
    </button>
  );
}
