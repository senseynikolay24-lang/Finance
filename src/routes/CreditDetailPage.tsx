import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useParams } from 'react-router-dom';
import { db } from '@/db/db';
import { addCreditPayment } from '@/db/repo';
import {
  amortizationSchedule,
  annuityPayment,
  debtProgress,
  totalOverpayment,
} from '@/lib/finance';
import { formatDate, formatMoney, formatPercent } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Modal } from '@/components/ui/Modal';
import { IconTrash } from '@/components/ui/Icon';

export function CreditDetailPage() {
  const { id } = useParams();
  const creditId = Number(id);
  const credit = useLiveQuery(() => db.credits.get(creditId), [creditId]);
  const payments = useLiveQuery(
    () => db.creditPayments.where('creditId').equals(creditId).reverse().sortBy('date'),
    [creditId],
    [],
  );
  const [paying, setPaying] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  const schedule = useMemo(() => {
    if (!credit || credit.kind === 'credit_card') return [];
    return amortizationSchedule(
      credit.principal,
      credit.rate,
      credit.termMonths,
      credit.paymentType,
    );
  }, [credit]);

  if (!credit) return <div className="p-8 text-center text-muted">Загрузка…</div>;

  const progress = debtProgress(credit.principal, credit.currentDebt);
  const isCard = credit.kind === 'credit_card';
  const monthlyPayment = isCard
    ? credit.minPayment ?? 0
    : credit.paymentType === 'annuity'
      ? annuityPayment(credit.principal, credit.rate, credit.termMonths)
      : (schedule[0]?.payment ?? 0);
  const overpay = isCard
    ? 0
    : totalOverpayment(
        credit.principal,
        credit.rate,
        credit.termMonths,
        credit.paymentType,
      );

  async function remove() {
    if (confirm('Удалить кредит и историю платежей?')) {
      await db.creditPayments.where('creditId').equals(creditId).delete();
      await db.credits.delete(creditId);
      history.back();
    }
  }

  return (
    <div>
      <PageHeader
        title={credit.name}
        action={
          <button
            onClick={remove}
            className="grid h-10 w-10 place-items-center rounded-full bg-surface text-muted"
            aria-label="Удалить"
          >
            <IconTrash width={18} height={18} />
          </button>
        }
      />

      <div className="card mb-4">
        <p className="text-sm text-muted">Остаток долга</p>
        <p className="text-3xl font-bold text-accent-bright">
          {formatMoney(credit.currentDebt, 'RUB', { fraction: false })}
        </p>
        <div className="mt-3">
          <ProgressBar value={progress} color={credit.color} />
          <p className="mt-1.5 text-xs text-muted">
            Погашено {progress.toFixed(1)}% из{' '}
            {formatMoney(credit.principal, 'RUB', { fraction: false })}
          </p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Stat label="Ставка" value={formatPercent(credit.rate)} />
        <Stat
          label={isCard ? 'Мин. платёж' : 'Платёж/мес'}
          value={formatMoney(monthlyPayment, 'RUB', { fraction: false })}
        />
        {!isCard && (
          <>
            <Stat label="Срок" value={`${credit.termMonths} мес`} />
            <Stat
              label="Переплата"
              value={formatMoney(overpay, 'RUB', { fraction: false })}
            />
          </>
        )}
        {isCard && credit.creditLimit != null && (
          <Stat
            label="Лимит"
            value={formatMoney(credit.creditLimit, 'RUB', { fraction: false })}
          />
        )}
        {isCard && credit.gracePeriodDays != null && (
          <Stat label="Грейс-период" value={`${credit.gracePeriodDays} дн`} />
        )}
      </div>

      <div className="mb-4 flex gap-3">
        <button onClick={() => setPaying(true)} className="btn-accent flex-1">
          Внести платёж
        </button>
        {!isCard && (
          <button
            onClick={() => setShowSchedule(true)}
            className="btn-ghost flex-1"
          >
            График
          </button>
        )}
      </div>

      <h2 className="mb-2 font-semibold">История платежей</h2>
      {payments.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Платежей пока нет</p>
      ) : (
        <div className="divide-y divide-line">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">{formatDate(p.date)}</p>
                <p className="text-xs text-muted">
                  Тело {formatMoney(p.principalPart, 'RUB', { fraction: false })} ·
                  проценты {formatMoney(p.interestPart, 'RUB', { fraction: false })}
                </p>
              </div>
              <p className="font-semibold">
                {formatMoney(p.amount, 'RUB', { fraction: false })}
              </p>
            </div>
          ))}
        </div>
      )}

      {paying && (
        <PaymentForm
          creditId={creditId}
          suggestedInterest={(credit.currentDebt * credit.rate) / 100 / 12}
          suggestedAmount={monthlyPayment}
          onClose={() => setPaying(false)}
        />
      )}

      {showSchedule && (
        <Modal open title="График погашения" onClose={() => setShowSchedule(false)}>
          <div className="max-h-[70vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface text-muted">
                <tr className="text-left">
                  <th className="py-2">№</th>
                  <th className="py-2 text-right">Платёж</th>
                  <th className="py-2 text-right">Тело</th>
                  <th className="py-2 text-right">%</th>
                  <th className="py-2 text-right">Остаток</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((r) => (
                  <tr key={r.month} className="border-t border-line">
                    <td className="py-1.5">{r.month}</td>
                    <td className="py-1.5 text-right">
                      {formatMoney(r.payment, 'RUB', { fraction: false })}
                    </td>
                    <td className="py-1.5 text-right text-muted">
                      {formatMoney(r.principalPart, 'RUB', { fraction: false })}
                    </td>
                    <td className="py-1.5 text-right text-muted">
                      {formatMoney(r.interestPart, 'RUB', { fraction: false })}
                    </td>
                    <td className="py-1.5 text-right">
                      {formatMoney(r.balance, 'RUB', { fraction: false })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function PaymentForm({
  creditId,
  suggestedInterest,
  suggestedAmount,
  onClose,
}: {
  creditId: number;
  suggestedInterest: number;
  suggestedAmount: number;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState(String(Math.round(suggestedAmount)));
  const [interest, setInterest] = useState(String(Math.round(suggestedInterest)));
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  async function save() {
    if (Number(amount) <= 0) return;
    await addCreditPayment(
      creditId,
      Number(amount),
      Number(interest) || 0,
      new Date(date).getTime(),
    );
    onClose();
  }

  return (
    <Modal open title="Платёж по кредиту" onClose={onClose}>
      <label className="label">Сумма платежа</label>
      <input
        type="number"
        className="field mb-4 text-xl font-semibold"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        autoFocus
      />
      <label className="label">Из них проценты</label>
      <input
        type="number"
        className="field mb-1"
        value={interest}
        onChange={(e) => setInterest(e.target.value)}
      />
      <p className="mb-4 text-xs text-muted">
        Остаток платежа пойдёт на погашение тела долга
      </p>
      <label className="label">Дата</label>
      <input
        type="date"
        className="field mb-5"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      <button onClick={save} className="btn-accent w-full">
        Внести платёж
      </button>
    </Modal>
  );
}
