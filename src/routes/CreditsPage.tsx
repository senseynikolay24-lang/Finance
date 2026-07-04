import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '@/db/db';
import type { CreditKind, PaymentType } from '@/db/types';
import { debtProgress } from '@/lib/finance';
import { formatMoney, formatPercent } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconPlus } from '@/components/ui/Icon';

const KIND_LABEL: Record<CreditKind, string> = {
  loan: 'Кредит',
  mortgage: 'Ипотека',
  credit_card: 'Кредитная карта',
};
const COLORS = ['#BA181B', '#E5383B', '#A4161A', '#660708', '#B1A7A6'];

export function CreditsPage() {
  const navigate = useNavigate();
  const credits = useLiveQuery(() => db.credits.toArray(), [], []);
  const [creating, setCreating] = useState(false);

  const totalDebt = credits.reduce((s, c) => s + c.currentDebt, 0);

  return (
    <div>
      <PageHeader
        title="Кредиты и ипотека"
        action={
          <button
            onClick={() => setCreating(true)}
            className="grid h-10 w-10 place-items-center rounded-full bg-accent text-white"
            aria-label="Добавить кредит"
          >
            <IconPlus width={20} height={20} />
          </button>
        }
      />

      {credits.length > 0 && (
        <div className="card mb-4">
          <p className="text-sm text-muted">Общий долг</p>
          <p className="text-2xl font-bold text-accent-bright">
            {formatMoney(totalDebt, 'RUB', { fraction: false })}
          </p>
        </div>
      )}

      {credits.length === 0 ? (
        <EmptyState
          icon="🏦"
          title="Кредитов нет"
          hint="Добавьте кредит, ипотеку или кредитную карту, чтобы отслеживать закрытие долга"
        />
      ) : (
        <div className="space-y-3">
          {credits.map((c) => {
            const progress = debtProgress(c.principal, c.currentDebt);
            return (
              <button
                key={c.id}
                onClick={() => navigate(`/credits/${c.id}`)}
                className="card block w-full text-left"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-medium">{c.name}</span>
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
                    {KIND_LABEL[c.kind]}
                  </span>
                </div>
                <p className="mb-2 text-sm text-muted">
                  Остаток: {formatMoney(c.currentDebt, 'RUB', { fraction: false })} ·{' '}
                  {formatPercent(c.rate)} годовых
                </p>
                <ProgressBar value={progress} color={c.color} />
                <p className="mt-1.5 text-xs text-muted">
                  Погашено {progress.toFixed(0)}% из{' '}
                  {formatMoney(c.principal, 'RUB', { fraction: false })}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {creating && <CreditForm onClose={() => setCreating(false)} />}
    </div>
  );
}

function CreditForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<CreditKind>('loan');
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [term, setTerm] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('annuity');
  const [minPayment, setMinPayment] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [grace, setGrace] = useState('');
  const [color] = useState(COLORS[0]);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));

  const isCard = kind === 'credit_card';

  async function save() {
    if (!name.trim()) return;
    const p = Number(principal) || 0;
    await db.credits.add({
      name: name.trim(),
      kind,
      principal: isCard ? Number(creditLimit) || 0 : p,
      rate: Number(rate) || 0,
      termMonths: Number(term) || 0,
      paymentType,
      minPayment: minPayment ? Number(minPayment) : undefined,
      startDate: new Date(startDate).getTime(),
      creditLimit: isCard ? Number(creditLimit) || 0 : undefined,
      gracePeriodDays: isCard && grace ? Number(grace) : undefined,
      currentDebt: p,
      color,
      createdAt: Date.now(),
    });
    onClose();
  }

  return (
    <Modal open title="Новый кредит" onClose={onClose}>
      <label className="label">Тип</label>
      <div className="mb-4 flex gap-2">
        {(Object.keys(KIND_LABEL) as CreditKind[]).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`chip flex-1 text-xs ${kind === k ? 'chip-active' : 'chip-idle'}`}
          >
            {KIND_LABEL[k]}
          </button>
        ))}
      </div>

      <label className="label">Название</label>
      <input
        className="field mb-4"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={isCard ? 'Кредитка Альфа' : 'Ипотека Сбер'}
        autoFocus
      />

      {isCard ? (
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
              <label className="label">Текущий долг</label>
              <input
                type="number"
                className="field"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
              />
            </div>
          </div>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="label">Ставка, %</label>
              <input
                type="number"
                className="field"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Грейс, дней</label>
              <input
                type="number"
                className="field"
                value={grace}
                onChange={(e) => setGrace(e.target.value)}
              />
            </div>
          </div>
          <label className="label">Минимальный платёж</label>
          <input
            type="number"
            className="field mb-5"
            value={minPayment}
            onChange={(e) => setMinPayment(e.target.value)}
          />
        </>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="label">Сумма кредита</label>
              <input
                type="number"
                className="field"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
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
          <label className="label">Срок, месяцев</label>
          <input
            type="number"
            className="field mb-4"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
          <label className="label">Тип платежа</label>
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setPaymentType('annuity')}
              className={`chip flex-1 ${
                paymentType === 'annuity' ? 'chip-active' : 'chip-idle'
              }`}
            >
              Аннуитетный
            </button>
            <button
              onClick={() => setPaymentType('differentiated')}
              className={`chip flex-1 ${
                paymentType === 'differentiated' ? 'chip-active' : 'chip-idle'
              }`}
            >
              Дифференц.
            </button>
          </div>
          <label className="label">Дата открытия</label>
          <input
            type="date"
            className="field mb-5"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </>
      )}

      <button onClick={save} className="btn-accent w-full">
        Добавить
      </button>
    </Modal>
  );
}
