import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { Capitalization, Deposit } from '@/db/types';
import { depositIncome, depositMaturityValue } from '@/lib/finance';
import { formatDate, formatMoney, formatPercent } from '@/lib/format';
import { addMonths } from 'date-fns';
import { PALETTE, SECTION_COLOR, withAlpha } from '@/lib/theme';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconPlus, IconTrash } from '@/components/ui/Icon';

const CAP_LABEL: Record<Capitalization, string> = {
  none: 'Без капитализации',
  monthly: 'Ежемесячно',
  quarterly: 'Ежеквартально',
  yearly: 'Ежегодно',
  end: 'В конце срока',
};
const COLORS = PALETTE;
const SECTION = SECTION_COLOR.deposits;

/** Секция «Вклады и накопления» — переиспользуется внутри страницы «Капитал». */
export function DepositsSection() {
  const deposits = useLiveQuery(() => db.deposits.toArray(), [], []);
  const [editing, setEditing] = useState<Partial<Deposit> | null>(null);

  const totalNow = deposits.reduce((s, d) => s + d.amount, 0);
  const totalMaturity = deposits.reduce(
    (s, d) => s + depositMaturityValue(d.amount, d.rate, d.termMonths, d.capitalization),
    0,
  );

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold">Вклады и накопления</h2>
        <button
          onClick={() => setEditing({})}
          className="grid h-9 w-9 place-items-center rounded-full"
          style={{ backgroundColor: withAlpha(SECTION, '1f'), color: SECTION }}
          aria-label="Добавить вклад"
        >
          <IconPlus width={18} height={18} />
        </button>
      </div>

      {deposits.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="card py-3">
            <p className="text-xs text-muted">Вложено</p>
            <p className="text-lg font-semibold">
              {formatMoney(totalNow, 'RUB', { fraction: false })}
            </p>
          </div>
          <div className="card py-3">
            <p className="text-xs text-muted">К концу срока</p>
            <p className="text-lg font-semibold text-income">
              {formatMoney(totalMaturity, 'RUB', { fraction: false })}
            </p>
          </div>
        </div>
      )}

      {deposits.length === 0 ? (
        <EmptyState
          icon="🪙"
          title="Вкладов нет"
          hint="Добавьте депозит со ставкой и сроком, чтобы видеть будущий доход"
          color={SECTION}
        />
      ) : (
        <div className="space-y-3">
          {deposits.map((d) => {
            const income = depositIncome(d.amount, d.rate, d.termMonths, d.capitalization);
            const end = addMonths(new Date(d.startDate), d.termMonths);
            return (
              <button
                key={d.id}
                onClick={() => setEditing(d)}
                className="card block w-full text-left"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-medium">{d.name}</span>
                  <span className="text-sm font-semibold text-income">
                    +{formatMoney(income, 'RUB', { fraction: false })}
                  </span>
                </div>
                <p className="text-sm text-muted">
                  {formatMoney(d.amount, 'RUB', { fraction: false })} ·{' '}
                  {formatPercent(d.rate)} · {CAP_LABEL[d.capitalization]}
                </p>
                <p className="mt-1 text-xs text-muted">до {formatDate(+end)}</p>
              </button>
            );
          })}
        </div>
      )}

      {editing && <DepositForm deposit={editing} onClose={() => setEditing(null)} />}
    </section>
  );
}

function DepositForm({
  deposit,
  onClose,
}: {
  deposit: Partial<Deposit>;
  onClose: () => void;
}) {
  const isNew = deposit.id == null;
  const [name, setName] = useState(deposit.name ?? '');
  const [amount, setAmount] = useState(String(deposit.amount ?? ''));
  const [rate, setRate] = useState(String(deposit.rate ?? ''));
  const [term, setTerm] = useState(String(deposit.termMonths ?? ''));
  const [cap, setCap] = useState<Capitalization>(deposit.capitalization ?? 'monthly');
  const [startDate, setStartDate] = useState(
    deposit.startDate
      ? new Date(deposit.startDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  );

  const preview =
    Number(amount) > 0 && Number(term) > 0
      ? depositIncome(Number(amount), Number(rate), Number(term), cap)
      : 0;

  async function save() {
    if (!name.trim() || Number(amount) <= 0) return;
    const data = {
      name: name.trim(),
      amount: Number(amount),
      rate: Number(rate) || 0,
      termMonths: Number(term) || 0,
      capitalization: cap,
      startDate: new Date(startDate).getTime(),
      color: deposit.color ?? COLORS[0],
      createdAt: deposit.createdAt ?? Date.now(),
    };
    if (isNew) await db.deposits.add(data);
    else await db.deposits.update(deposit.id!, data);
    onClose();
  }

  async function remove() {
    if (deposit.id != null && confirm('Удалить вклад?')) {
      await db.deposits.delete(deposit.id);
      onClose();
    }
  }

  return (
    <Modal open title={isNew ? 'Новый вклад' : 'Вклад'} onClose={onClose}>
      <label className="label">Название</label>
      <input
        className="field mb-4"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Вклад «Надёжный»"
        autoFocus
      />

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label className="label">Сумма</label>
          <input
            type="number"
            className="field"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
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
          <label className="label">Срок, месяцев</label>
          <input
            type="number"
            className="field"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Дата открытия</label>
          <input
            type="date"
            className="field"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
      </div>

      <label className="label">Капитализация</label>
      <select
        className="field mb-4"
        value={cap}
        onChange={(e) => setCap(e.target.value as Capitalization)}
      >
        {(Object.keys(CAP_LABEL) as Capitalization[]).map((c) => (
          <option key={c} value={c}>
            {CAP_LABEL[c]}
          </option>
        ))}
      </select>

      {preview > 0 && (
        <div className="mb-5 rounded-2xl bg-surface-2 p-3 text-sm">
          Прогнозируемый доход:{' '}
          <span className="font-semibold text-income">
            {formatMoney(preview, 'RUB', { fraction: false })}
          </span>
        </div>
      )}

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
