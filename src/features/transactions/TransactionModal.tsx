import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { TransactionType } from '@/db/types';
import { useUI } from '@/store/ui';
import { Modal } from '@/components/ui/Modal';
import { addTransaction, deleteTransaction, updateTransaction } from '@/db/repo';

const TYPE_TABS: { type: TransactionType; label: string }[] = [
  { type: 'expense', label: 'Расход' },
  { type: 'income', label: 'Доход' },
  { type: 'transfer', label: 'Перевод' },
  { type: 'withdrawal', label: 'Снятие' },
  { type: 'topup', label: 'Пополнение' },
];

const needsCategory = (t: TransactionType) => t === 'income' || t === 'expense';
const needsToAccount = (t: TransactionType) =>
  t === 'transfer' || t === 'withdrawal' || t === 'topup';

export function TransactionModal() {
  const { txnModalOpen, txnModalType, editingTxnId, closeTxnModal } = useUI();
  const [type, setType] = useState<TransactionType>(txnModalType);
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState<number | ''>('');
  const [toAccountId, setToAccountId] = useState<number | ''>('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const accounts = useLiveQuery(
    () => db.accounts.filter((a) => !a.isArchived).toArray(),
    [],
    [],
  );
  const categories = useLiveQuery(() => db.categories.toArray(), [], []);
  const editing = useLiveQuery(
    () => (editingTxnId ? db.transactions.get(editingTxnId) : undefined),
    [editingTxnId],
  );

  // Категории нужного вида, сгруппированные родитель → подкатегории.
  const catKind = type === 'income' ? 'income' : 'expense';
  const groupedCategories = useMemo(() => {
    const parents = categories.filter((c) => c.kind === catKind && c.parentId === null);
    return parents.map((p) => ({
      parent: p,
      children: categories.filter((c) => c.parentId === p.id),
    }));
  }, [categories, catKind]);

  // Инициализация формы при открытии.
  useEffect(() => {
    if (!txnModalOpen) return;
    if (editing) {
      setType(editing.type);
      setAmount(String(editing.amount));
      setAccountId(editing.accountId);
      setToAccountId(editing.toAccountId ?? '');
      setCategoryId(editing.categoryId ?? '');
      setNote(editing.note ?? '');
      setDate(new Date(editing.date).toISOString().slice(0, 10));
    } else {
      setType(txnModalType);
      setAmount('');
      setNote('');
      setCategoryId('');
      setDate(new Date().toISOString().slice(0, 10));
    }
  }, [txnModalOpen, editing, txnModalType]);

  // Значения счетов по умолчанию.
  useEffect(() => {
    if (accounts.length && accountId === '') setAccountId(accounts[0].id!);
    if (needsToAccount(type) && accounts.length > 1 && toAccountId === '') {
      const other = accounts.find((a) => a.id !== accountId);
      if (other) setToAccountId(other.id!);
    }
  }, [accounts, type, accountId, toAccountId]);

  const canSave =
    Number(amount) > 0 &&
    accountId !== '' &&
    (!needsToAccount(type) || (toAccountId !== '' && toAccountId !== accountId)) &&
    (!needsCategory(type) || categoryId !== '');

  async function handleSave() {
    if (!canSave) return;
    const payload = {
      type,
      amount: Number(amount),
      date: new Date(date).getTime(),
      accountId: Number(accountId),
      toAccountId: needsToAccount(type) ? Number(toAccountId) : undefined,
      categoryId: needsCategory(type) ? Number(categoryId) : undefined,
      note: note.trim() || undefined,
    };
    if (editingTxnId) await updateTransaction(editingTxnId, payload);
    else await addTransaction(payload);
    closeTxnModal();
  }

  async function handleDelete() {
    if (editingTxnId) {
      await deleteTransaction(editingTxnId);
      closeTxnModal();
    }
  }

  return (
    <Modal
      open={txnModalOpen}
      title={editingTxnId ? 'Изменить операцию' : 'Новая операция'}
      onClose={closeTxnModal}
    >
      <div className="mb-4 flex gap-2 overflow-x-auto no-scrollbar">
        {TYPE_TABS.map((t) => (
          <button
            key={t.type}
            onClick={() => setType(t.type)}
            className={`chip whitespace-nowrap ${
              type === t.type ? 'chip-active' : 'chip-idle'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <label className="label">Сумма</label>
      <input
        type="number"
        inputMode="decimal"
        className="field mb-4 text-2xl font-semibold"
        placeholder="0"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        autoFocus
      />

      <label className="label">{needsToAccount(type) ? 'Со счёта' : 'Счёт'}</label>
      <select
        className="field mb-4"
        value={accountId}
        onChange={(e) => setAccountId(Number(e.target.value))}
      >
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>

      {needsToAccount(type) && (
        <>
          <label className="label">На счёт</label>
          <select
            className="field mb-4"
            value={toAccountId}
            onChange={(e) => setToAccountId(Number(e.target.value))}
          >
            <option value="">— выберите —</option>
            {accounts
              .filter((a) => a.id !== accountId)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
          </select>
        </>
      )}

      {needsCategory(type) && (
        <>
          <label className="label">Категория</label>
          <select
            className="field mb-4"
            value={categoryId}
            onChange={(e) => setCategoryId(Number(e.target.value))}
          >
            <option value="">— выберите —</option>
            {groupedCategories.map(({ parent, children }) => (
              <optgroup key={parent.id} label={`${parent.icon} ${parent.name}`}>
                <option value={parent.id}>
                  {parent.icon} {parent.name}
                </option>
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    　└ {c.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </>
      )}

      <label className="label">Дата</label>
      <input
        type="date"
        className="field mb-4"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      <label className="label">Заметка</label>
      <input
        className="field mb-5"
        placeholder="Комментарий (необязательно)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <div className="flex gap-3">
        {editingTxnId && (
          <button onClick={handleDelete} className="btn bg-accent-deep text-white">
            Удалить
          </button>
        )}
        <button onClick={handleSave} disabled={!canSave} className="btn-accent flex-1">
          {editingTxnId ? 'Сохранить' : 'Добавить'}
        </button>
      </div>
    </Modal>
  );
}
