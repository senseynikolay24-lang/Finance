import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { Account, AccountType, Currency } from '@/db/types';
import { deleteAccount } from '@/db/repo';
import { formatMoney } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { IconEdit, IconPlus, IconTrash } from '@/components/ui/Icon';

const TYPE_LABEL: Record<AccountType, string> = {
  card: 'Карта',
  cash: 'Наличные',
  account: 'Счёт',
};
const COLORS = ['#BA181B', '#E5383B', '#A4161A', '#660708', '#2E9E5B', '#B1A7A6'];

export function AccountsPage() {
  const accounts = useLiveQuery(() => db.accounts.toArray(), [], []);
  const [editing, setEditing] = useState<Partial<Account> | null>(null);

  const total = accounts
    .filter((a) => !a.isArchived)
    .reduce((s, a) => s + a.balance, 0);

  return (
    <div>
      <PageHeader
        title="Счета"
        action={
          <button
            onClick={() => setEditing({})}
            className="grid h-10 w-10 place-items-center rounded-full bg-accent text-white"
            aria-label="Добавить счёт"
          >
            <IconPlus width={20} height={20} />
          </button>
        }
      />

      <div className="card mb-4">
        <p className="text-sm text-muted">Суммарно</p>
        <p className="text-2xl font-bold">{formatMoney(total)}</p>
      </div>

      <div className="space-y-3">
        {accounts.map((a) => (
          <div key={a.id} className="card flex items-center gap-3">
            <span
              className="h-10 w-10 rounded-full"
              style={{ backgroundColor: a.color }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {a.name}
                {a.isArchived && (
                  <span className="ml-2 text-xs text-muted">(в архиве)</span>
                )}
              </p>
              <p className="text-sm text-muted">{TYPE_LABEL[a.type]}</p>
            </div>
            <p className="font-semibold">
              {formatMoney(a.balance, a.currency, { fraction: false })}
            </p>
            <button
              onClick={() => setEditing(a)}
              className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-muted"
            >
              <IconEdit width={17} height={17} />
            </button>
          </div>
        ))}
      </div>

      {editing && (
        <AccountForm account={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function AccountForm({
  account,
  onClose,
}: {
  account: Partial<Account>;
  onClose: () => void;
}) {
  const isNew = account.id == null;
  const [name, setName] = useState(account.name ?? '');
  const [type, setType] = useState<AccountType>(account.type ?? 'card');
  const [balance, setBalance] = useState(String(account.balance ?? ''));
  const [color, setColor] = useState(account.color ?? COLORS[0]);
  const [currency] = useState<Currency>(account.currency ?? 'RUB');

  async function save() {
    if (!name.trim()) return;
    const data = {
      name: name.trim(),
      type,
      balance: Number(balance) || 0,
      color,
      currency,
      isArchived: account.isArchived ?? false,
      createdAt: account.createdAt ?? Date.now(),
    };
    if (isNew) await db.accounts.add(data);
    else await db.accounts.update(account.id!, data);
    onClose();
  }

  async function remove() {
    if (account.id != null && confirm('Удалить счёт и все его операции?')) {
      await deleteAccount(account.id);
      onClose();
    }
  }

  return (
    <Modal open title={isNew ? 'Новый счёт' : 'Счёт'} onClose={onClose}>
      <label className="label">Название</label>
      <input
        className="field mb-4"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Например, Тинькофф Black"
        autoFocus
      />

      <label className="label">Тип</label>
      <div className="mb-4 flex gap-2">
        {(Object.keys(TYPE_LABEL) as AccountType[]).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`chip flex-1 ${type === t ? 'chip-active' : 'chip-idle'}`}
          >
            {TYPE_LABEL[t]}
          </button>
        ))}
      </div>

      <label className="label">{isNew ? 'Начальный баланс' : 'Баланс'}</label>
      <input
        type="number"
        inputMode="decimal"
        className="field mb-4"
        value={balance}
        onChange={(e) => setBalance(e.target.value)}
        placeholder="0"
      />

      <label className="label">Цвет</label>
      <div className="mb-5 flex gap-2">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`h-8 w-8 rounded-full ${
              color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-surface' : ''
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <div className="flex gap-3">
        {!isNew && (
          <button onClick={remove} className="btn bg-accent-deep text-white">
            <IconTrash width={18} height={18} />
          </button>
        )}
        <button onClick={save} className="btn-accent flex-1">
          Сохранить
        </button>
      </div>
    </Modal>
  );
}
