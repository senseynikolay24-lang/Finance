import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { DebtDirection, SimpleDebt } from '@/db/types';
import { repaySimpleDebt } from '@/db/repo';
import { formatDate, formatMoney } from '@/lib/format';
import { PALETTE, withAlpha } from '@/lib/theme';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconChevronRight, IconPlus } from '@/components/ui/Icon';

const DIRECTION_LABEL: Record<DebtDirection, string> = {
  i_owe: 'Я занял',
  owed_to_me: 'Мне должны',
};
const COLORS = PALETTE;
const SECTION = '#4a3aa7'; // фиолетовый — отдельно от кредитов (оранжевый)

/** Секция «Взял / дал в долг» — простые долги без процентов и графика,
 *  переиспользуется внутри страницы «Капитал». */
export function SimpleDebtsSection() {
  const debts = useLiveQuery(() => db.simpleDebts.toArray(), [], []);
  const [editing, setEditing] = useState<Partial<SimpleDebt> | null>(null);
  const [repaying, setRepaying] = useState<SimpleDebt | null>(null);
  const [listOpen, setListOpen] = useState(true);

  const iOweTotal = debts
    .filter((d) => d.direction === 'i_owe')
    .reduce((s, d) => s + d.remaining, 0);
  const owedToMeTotal = debts
    .filter((d) => d.direction === 'owed_to_me')
    .reduce((s, d) => s + d.remaining, 0);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold">Взял / дал в долг</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setEditing({})}
            className="grid h-9 w-9 place-items-center rounded-full"
            style={{ backgroundColor: withAlpha(SECTION, '1f'), color: SECTION }}
            aria-label="Добавить долг"
          >
            <IconPlus width={18} height={18} />
          </button>
          {debts.length > 0 && (
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

      {(iOweTotal > 0 || owedToMeTotal > 0) && (
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="card py-3">
            <p className="text-xs text-muted">Мне должны</p>
            <p className="text-lg font-semibold text-income">
              {formatMoney(owedToMeTotal, 'RUB', { fraction: false })}
            </p>
          </div>
          <div className="card py-3">
            <p className="text-xs text-muted">Я должен</p>
            <p className="text-lg font-semibold text-accent-bright">
              {formatMoney(iOweTotal, 'RUB', { fraction: false })}
            </p>
          </div>
        </div>
      )}

      {debts.length === 0 ? (
        <EmptyState
          icon="🤝"
          title="Долгов нет"
          hint="Запишите, если вы заняли денег у кого-то или дали в долг"
          color={SECTION}
        />
      ) : listOpen ? (
        <div className="space-y-3">
          {debts.map((d) => {
            const progress =
              d.amount > 0 ? ((d.amount - d.remaining) / d.amount) * 100 : 100;
            const isOwedToMe = d.direction === 'owed_to_me';
            return (
              <button
                key={d.id}
                onClick={() => setEditing(d)}
                className="card block w-full text-left"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-medium">{d.person}</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-xs"
                    style={{
                      backgroundColor: withAlpha(isOwedToMe ? '#1F8A4C' : '#E5383B', '1f'),
                      color: isOwedToMe ? '#1F8A4C' : '#E5383B',
                    }}
                  >
                    {DIRECTION_LABEL[d.direction]}
                  </span>
                </div>
                <p className="mb-2 text-sm text-muted">
                  Остаток: {formatMoney(d.remaining, 'RUB', { fraction: false })} из{' '}
                  {formatMoney(d.amount, 'RUB', { fraction: false })} · {formatDate(d.date)}
                </p>
                <ProgressBar value={progress} color={d.color} />
                {d.remaining > 0 && (
                  <div className="mt-2 flex justify-end">
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setRepaying(d);
                      }}
                      className="text-xs font-medium text-accent-bright"
                    >
                      Внести возврат
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ) : null}

      {editing && <SimpleDebtForm debt={editing} onClose={() => setEditing(null)} />}
      {repaying && <RepayForm debt={repaying} onClose={() => setRepaying(null)} />}
    </section>
  );
}

function SimpleDebtForm({
  debt,
  onClose,
}: {
  debt: Partial<SimpleDebt>;
  onClose: () => void;
}) {
  const isNew = debt.id == null;
  const [direction, setDirection] = useState<DebtDirection>(debt.direction ?? 'i_owe');
  const [person, setPerson] = useState(debt.person ?? '');
  const [amount, setAmount] = useState(String(debt.amount ?? ''));
  const [date, setDate] = useState(
    debt.date ? new Date(debt.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
  );
  const [note, setNote] = useState(debt.note ?? '');
  const [color] = useState(debt.color ?? COLORS[4]);

  async function save() {
    if (!person.trim() || Number(amount) <= 0) return;
    const data = {
      direction,
      person: person.trim(),
      amount: Number(amount),
      remaining: isNew ? Number(amount) : (debt.remaining ?? Number(amount)),
      date: new Date(date).getTime(),
      note: note.trim() || undefined,
      color,
      createdAt: debt.createdAt ?? Date.now(),
    };
    if (isNew) await db.simpleDebts.add(data);
    else await db.simpleDebts.update(debt.id!, data);
    onClose();
  }

  async function remove() {
    if (debt.id != null && confirm('Удалить запись о долге?')) {
      await db.simpleDebts.delete(debt.id);
      onClose();
    }
  }

  return (
    <Modal open title={isNew ? 'Новый долг' : 'Долг'} onClose={onClose}>
      <label className="label">Направление</label>
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setDirection('i_owe')}
          className={`chip flex-1 ${direction === 'i_owe' ? 'chip-active' : 'chip-idle'}`}
        >
          Я занял
        </button>
        <button
          onClick={() => setDirection('owed_to_me')}
          className={`chip flex-1 ${direction === 'owed_to_me' ? 'chip-active' : 'chip-idle'}`}
        >
          Я дал в долг
        </button>
      </div>

      <label className="label">Кто</label>
      <input
        className="field mb-4"
        value={person}
        onChange={(e) => setPerson(e.target.value)}
        placeholder="Имя"
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
          <label className="label">Дата</label>
          <input
            type="date"
            className="field"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      <label className="label">Заметка</label>
      <input
        className="field mb-5"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Необязательно"
      />

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

function RepayForm({ debt, onClose }: { debt: SimpleDebt; onClose: () => void }) {
  const [amount, setAmount] = useState(String(debt.remaining));

  async function save() {
    if (Number(amount) <= 0) return;
    await repaySimpleDebt(debt.id!, Number(amount));
    onClose();
  }

  return (
    <Modal open title={`Возврат: ${debt.person}`} onClose={onClose}>
      <label className="label">Сумма возврата</label>
      <input
        type="number"
        className="field mb-5 text-xl font-semibold"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        autoFocus
      />
      <button onClick={save} className="btn-accent w-full">
        Внести
      </button>
    </Modal>
  );
}
