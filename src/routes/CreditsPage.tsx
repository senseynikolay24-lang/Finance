import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { differenceInMonths } from 'date-fns';
import { db } from '@/db/db';
import type { Credit, CreditKind, PaymentType } from '@/db/types';
import { debtProgress, scheduleBalanceAt } from '@/lib/finance';
import { formatMoney, formatPercent } from '@/lib/format';
import { PALETTE, SECTION_COLOR, withAlpha } from '@/lib/theme';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconPlus } from '@/components/ui/Icon';

const KIND_LABEL: Record<CreditKind, string> = {
  loan: 'Кредит',
  mortgage: 'Ипотека',
  credit_card: 'Кредитная карта',
};
const COLORS = PALETTE;
const SECTION = SECTION_COLOR.credits;

/** Секция «Кредиты и долги» — переиспользуется внутри страницы «Капитал». */
export function CreditsSection() {
  const navigate = useNavigate();
  const credits = useLiveQuery(() => db.credits.toArray(), [], []);
  const [creating, setCreating] = useState(false);

  const totalDebt = credits.reduce((s, c) => s + c.currentDebt, 0);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold">Кредиты и долги</h2>
        <button
          onClick={() => setCreating(true)}
          className="grid h-9 w-9 place-items-center rounded-full"
          style={{ backgroundColor: withAlpha(SECTION, '1f'), color: SECTION }}
          aria-label="Добавить кредит"
        >
          <IconPlus width={18} height={18} />
        </button>
      </div>

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
          color={SECTION}
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
    </section>
  );
}

/** Форма создания/редактирования кредита. Передайте `credit`, чтобы открыть
 *  в режиме редактирования (поля предзаполнены, сохранение — через update). */
export function CreditForm({
  credit,
  onClose,
}: {
  credit?: Credit;
  onClose: () => void;
}) {
  const isEdit = credit != null;
  const [name, setName] = useState(credit?.name ?? '');
  const [kind, setKind] = useState<CreditKind>(credit?.kind ?? 'loan');
  const [principal, setPrincipal] = useState(String(credit?.principal ?? ''));
  const [currentDebt, setCurrentDebt] = useState(String(credit?.currentDebt ?? ''));
  const [rate, setRate] = useState(String(credit?.rate ?? ''));
  const [term, setTerm] = useState(String(credit?.termMonths ?? ''));
  const [paymentType, setPaymentType] = useState<PaymentType>(
    credit?.paymentType ?? 'annuity',
  );
  const [minPayment, setMinPayment] = useState(String(credit?.minPayment ?? ''));
  const [creditLimit, setCreditLimit] = useState(String(credit?.creditLimit ?? ''));
  const [grace, setGrace] = useState(String(credit?.gracePeriodDays ?? ''));
  const [color] = useState(credit?.color ?? COLORS[0]);
  const [startDate, setStartDate] = useState(
    credit ? new Date(credit.startDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
  );

  const isCard = kind === 'credit_card';

  function calcFromSchedule() {
    const p = Number(principal) || 0;
    const r = Number(rate) || 0;
    const t = Number(term) || 0;
    if (p <= 0 || t <= 0) return;
    const elapsed = differenceInMonths(new Date(), new Date(startDate));
    const balance = scheduleBalanceAt(p, r, t, paymentType, elapsed);
    setCurrentDebt(String(Math.round(balance)));
  }

  async function save() {
    if (!name.trim()) return;
    const p = Number(principal) || 0;
    const debt = isCard
      ? Number(currentDebt) || 0
      : currentDebt !== ''
        ? Number(currentDebt) || 0
        : p;
    const data = {
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
      currentDebt: isCard ? Number(currentDebt) || 0 : debt,
      color,
      createdAt: credit?.createdAt ?? Date.now(),
    };
    if (isEdit) await db.credits.update(credit.id!, data);
    else await db.credits.add(data);
    onClose();
  }

  return (
    <Modal open title={isEdit ? 'Кредит' : 'Новый кредит'} onClose={onClose}>
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
                value={currentDebt}
                onChange={(e) => setCurrentDebt(e.target.value)}
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
            className="field mb-4"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <div className="mb-1 flex items-center justify-between">
            <label className="label mb-0">Текущий остаток долга</label>
            <button
              onClick={calcFromSchedule}
              className="text-xs font-medium text-accent-bright"
              type="button"
            >
              Рассчитать по графику
            </button>
          </div>
          <input
            type="number"
            className="field mb-1"
            placeholder={principal || 'равен сумме кредита'}
            value={currentDebt}
            onChange={(e) => setCurrentDebt(e.target.value)}
          />
          <p className="mb-5 text-xs text-muted">
            Если дата открытия в прошлом и часть уже выплачена — нажмите «Рассчитать
            по графику» или введите остаток вручную.
          </p>
        </>
      )}

      <button onClick={save} className="btn-accent w-full">
        {isEdit ? 'Сохранить' : 'Добавить'}
      </button>
    </Modal>
  );
}
