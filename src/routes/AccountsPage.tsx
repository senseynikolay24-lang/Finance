import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { Account, AccountType, Currency } from '@/db/types';
import { addTransaction, deleteAccount } from '@/db/repo';
import { creditCardMonthlyInterest } from '@/lib/finance';
import { formatMoney, formatPercent } from '@/lib/format';
import { PALETTE, SECTION_COLOR } from '@/lib/theme';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconChevronRight, IconCreditCard, IconEdit, IconPlus } from '@/components/ui/Icon';

const TYPE_LABEL: Record<AccountType, string> = {
  card: 'Карта',
  cash: 'Наличные',
  account: 'Счёт',
  credit_card: 'Кредитная карта',
};
const COLORS = PALETTE;
const INTEREST_CATEGORY_NAME = 'Проценты и комиссии';

/** Секция «Карты и счета» — переиспользуется внутри страницы «Капитал». */
export function AccountsSection() {
  const accounts = useLiveQuery(() => db.accounts.toArray(), [], []);
  const categories = useLiveQuery(() => db.categories.toArray(), [], []);
  const [editing, setEditing] = useState<Partial<Account> | null>(null);
  const [listOpen, setListOpen] = useState(true);

  const interestCategoryId = categories.find(
    (c) => c.name === INTEREST_CATEGORY_NAME && c.kind === 'expense',
  )?.id;

  async function chargeInterest(account: Account) {
    const debtAmount = Math.max(0, -account.balance);
    const interest = creditCardMonthlyInterest(debtAmount, account.rate ?? 0);
    if (interest <= 0) return;
    await addTransaction({
      type: 'expense',
      amount: Math.round(interest * 100) / 100,
      date: Date.now(),
      accountId: account.id!,
      categoryId: interestCategoryId,
      note: 'Начисление процентов',
    });
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold">Карты и счета</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setEditing({})}
            className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-accent-bright"
            aria-label="Добавить счёт"
          >
            <IconPlus width={18} height={18} />
          </button>
          {accounts.length > 0 && (
            <button
              onClick={() => setListOpen((o) => !o)}
              className="grid h-9 w-9 place-items-center rounded-full text-muted"
              aria-label={listOpen ? 'Свернуть' : 'Развернуть'}
            >
              <IconChevronRight
                width={18}
                height={18}
                className={`transition-transform ${listOpen ? 'rotate-90' : ''}`}
              />
            </button>
          )}
        </div>
      </div>

      {accounts.length === 0 ? (
        <EmptyState icon="💳" title="Счетов пока нет" color={SECTION_COLOR.accounts} />
      ) : listOpen ? (
        <div className="space-y-3">
          {accounts.map((a) => (
            <div key={a.id} className="card">
              <div className="flex items-center gap-3">
                <span
                  className="grid h-10 w-10 place-items-center rounded-full text-white"
                  style={{ backgroundColor: a.color }}
                >
                  {a.type === 'credit_card' && <IconCreditCard width={18} height={18} />}
                </span>
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

              {a.type === 'credit_card' && a.creditLimit ? (
                <CreditCardDetails account={a} onChargeInterest={() => chargeInterest(a)} />
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {editing && <AccountForm account={editing} onClose={() => setEditing(null)} />}
    </section>
  );
}

function CreditCardDetails({
  account,
  onChargeInterest,
}: {
  account: Account;
  onChargeInterest: () => void;
}) {
  const limit = account.creditLimit ?? 0;
  const debtAmount = Math.max(0, -account.balance);
  const available = limit - debtAmount;
  const utilizationPct = limit > 0 ? (debtAmount / limit) * 100 : 0;
  const estInterest =
    debtAmount > 0 ? creditCardMonthlyInterest(debtAmount, account.rate ?? 0) : 0;

  return (
    <div className="mt-3 border-t border-line pt-3">
      <ProgressBar value={utilizationPct} color={utilizationPct > 80 ? '#C81E1E' : account.color} />
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted">
        <span>Лимит: {formatMoney(limit, account.currency, { fraction: false })}</span>
        <span>Доступно: {formatMoney(available, account.currency, { fraction: false })}</span>
        {account.rate != null && <span>Ставка: {formatPercent(account.rate)}</span>}
        {account.gracePeriodDays != null && (
          <span>Льготный период: {account.gracePeriodDays} дн</span>
        )}
      </div>
      {estInterest > 0 && (
        <div className="mt-2 flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2">
          <span className="text-xs text-muted">
            ≈ {formatMoney(estInterest, account.currency, { fraction: false })} процентов/мес
          </span>
          <button onClick={onChargeInterest} className="text-xs font-medium text-accent-bright">
            Начислить
          </button>
        </div>
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
  const [creditLimit, setCreditLimit] = useState(String(account.creditLimit ?? ''));
  const [rate, setRate] = useState(String(account.rate ?? ''));
  const [gracePeriodDays, setGracePeriodDays] = useState(
    String(account.gracePeriodDays ?? ''),
  );
  const [minPaymentPct, setMinPaymentPct] = useState(String(account.minPaymentPct ?? ''));
  const [minPaymentFixed, setMinPaymentFixed] = useState(
    String(account.minPaymentFixed ?? ''),
  );

  const isCreditCard = type === 'credit_card';

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
      creditLimit: isCreditCard ? Number(creditLimit) || 0 : undefined,
      rate: isCreditCard ? Number(rate) || 0 : undefined,
      gracePeriodDays: isCreditCard ? Number(gracePeriodDays) || 0 : undefined,
      minPaymentPct: isCreditCard && minPaymentPct ? Number(minPaymentPct) : undefined,
      minPaymentFixed: isCreditCard && minPaymentFixed ? Number(minPaymentFixed) : undefined,
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
      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(TYPE_LABEL) as AccountType[]).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`chip ${type === t ? 'chip-active' : 'chip-idle'}`}
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

      {isCreditCard && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="label">Кредитный лимит</label>
              <input
                type="number"
                className="field"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Ставка, %</label>
              <input
                type="number"
                className="field"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
            </div>
          </div>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="label">Льготный период, дней</label>
              <input
                type="number"
                className="field"
                value={gracePeriodDays}
                onChange={(e) => setGracePeriodDays(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Мин. платёж, %</label>
              <input
                type="number"
                className="field"
                value={minPaymentPct}
                onChange={(e) => setMinPaymentPct(e.target.value)}
              />
            </div>
          </div>
          <label className="label">Мин. платёж фиксированный (необязательно)</label>
          <input
            type="number"
            className="field mb-4"
            value={minPaymentFixed}
            onChange={(e) => setMinPaymentFixed(e.target.value)}
          />
        </>
      )}

      <label className="label">Цвет</label>
      <div className="mb-5 flex gap-2">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`h-8 w-8 rounded-full ${
              color === c ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : ''
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <div className="flex gap-3">
        {!isNew && (
          <button onClick={remove} className="btn bg-accent-deep text-white">
            Удалить
          </button>
        )}
        <button onClick={save} className="btn-accent flex-1">
          Сохранить
        </button>
      </div>
    </Modal>
  );
}
