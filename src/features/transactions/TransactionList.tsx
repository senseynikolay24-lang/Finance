import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { Transaction } from '@/db/types';
import { formatDateTime, formatMoney } from '@/lib/format';
import { useUI } from '@/store/ui';
import {
  IconArrowDown,
  IconArrowUp,
  IconCash,
  IconTransfer,
  IconWallet,
} from '@/components/ui/Icon';

const TYPE_META: Record<
  Transaction['type'],
  { label: string; Icon: typeof IconArrowUp; positive: boolean | null }
> = {
  income: { label: 'Доход', Icon: IconArrowDown, positive: true },
  expense: { label: 'Расход', Icon: IconArrowUp, positive: false },
  transfer: { label: 'Перевод', Icon: IconTransfer, positive: null },
  withdrawal: { label: 'Снятие наличных', Icon: IconCash, positive: null },
  topup: { label: 'Пополнение карты', Icon: IconWallet, positive: null },
};

export function TransactionRow({ txn }: { txn: Transaction }) {
  const openTxnModal = useUI((s) => s.openTxnModal);
  const category = useLiveQuery(
    () => (txn.categoryId ? db.categories.get(txn.categoryId) : undefined),
    [txn.categoryId],
  );
  const account = useLiveQuery(() => db.accounts.get(txn.accountId), [txn.accountId]);
  const toAccount = useLiveQuery(
    () => (txn.toAccountId ? db.accounts.get(txn.toAccountId) : undefined),
    [txn.toAccountId],
  );

  const meta = TYPE_META[txn.type];
  const title = category
    ? `${category.icon} ${category.name}`
    : meta.label;
  const subtitle =
    txn.type === 'income' || txn.type === 'expense'
      ? account?.name ?? ''
      : `${account?.name ?? ''} → ${toAccount?.name ?? ''}`;

  const amountColor =
    meta.positive === true
      ? 'text-income'
      : meta.positive === false
        ? 'text-accent-bright'
        : 'text-soft';
  const amountText = formatMoney(txn.amount, 'RUB', {
    sign: meta.positive === true,
  });

  return (
    <button
      onClick={() => openTxnModal(txn.type, txn.id)}
      className="flex w-full items-center gap-3 py-3 text-left"
    >
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
        style={{ backgroundColor: (category?.color ?? '#BA181B') + '22' }}
      >
        <meta.Icon width={20} height={20} className="text-soft" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title}</span>
        <span className="block truncate text-xs text-muted">
          {subtitle}
          {txn.note ? ` · ${txn.note}` : ''}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className={`block font-semibold ${amountColor}`}>
          {meta.positive === false ? '−' : ''}
          {amountText.replace('−', '')}
        </span>
        <span className="block text-xs text-muted">{formatDateTime(txn.date)}</span>
      </span>
    </button>
  );
}

export function TransactionList({ transactions }: { transactions: Transaction[] }) {
  return (
    <div className="divide-y divide-white/5">
      {transactions.map((t) => (
        <TransactionRow key={t.id} txn={t} />
      ))}
    </div>
  );
}
