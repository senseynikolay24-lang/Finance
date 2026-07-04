import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { Holding, PortfolioKind } from '@/db/types';
import { holdingPnL, holdingPnLPct, holdingValue } from '@/lib/finance';
import { formatDateTime, formatMoney, formatPercent } from '@/lib/format';
import { PALETTE, SECTION_COLOR, withAlpha } from '@/lib/theme';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconChevronRight, IconPlus, IconTrash } from '@/components/ui/Icon';

const KIND_LABEL: Record<PortfolioKind, string> = {
  broker: 'Брокерский счёт',
  iis: 'ИИС',
};
const COLORS = PALETTE;
const SECTION = SECTION_COLOR.investments;

/** Секция «Инвестиции» — переиспользуется внутри страницы «Капитал», сворачиваемая. */
export function InvestmentsSection() {
  const portfolios = useLiveQuery(() => db.portfolios.toArray(), [], []);
  const holdings = useLiveQuery(() => db.holdings.toArray(), [], []);
  const [creatingPortfolio, setCreatingPortfolio] = useState(false);
  const [editingHolding, setEditingHolding] = useState<Partial<Holding> | null>(null);
  const [open, setOpen] = useState(true);

  const totalValue = holdings.reduce(
    (s, h) => s + holdingValue(h.quantity, h.lastPrice),
    0,
  );
  const totalPnL = holdings.reduce(
    (s, h) => s + holdingPnL(h.quantity, h.avgPrice, h.lastPrice),
    0,
  );

  return (
    <section>
      <button
        onClick={() => setOpen((o) => !o)}
        className="mb-2 flex w-full items-center justify-between"
      >
        <h2 className="font-semibold">Инвестиции</h2>
        <span className="flex items-center gap-2">
          {holdings.length > 0 && (
            <span className="text-sm font-medium">
              {formatMoney(totalValue, 'RUB', { fraction: false })}
            </span>
          )}
          <IconChevronRight
            width={18}
            height={18}
            className={`text-muted transition-transform ${open ? 'rotate-90' : ''}`}
          />
        </span>
      </button>

      {open && (
        <>
          {holdings.length > 0 && (
            <div className="card mb-4">
              <p className="text-sm text-muted">Стоимость портфеля</p>
              <p className="text-2xl font-bold">
                {formatMoney(totalValue, 'RUB', { fraction: false })}
              </p>
              <p
                className={`mt-1 text-sm font-medium ${
                  totalPnL >= 0 ? 'text-income' : 'text-accent-bright'
                }`}
              >
                {totalPnL >= 0 ? '+' : '−'}
                {formatMoney(Math.abs(totalPnL), 'RUB', { fraction: false })} прибыль/убыток
              </p>
            </div>
          )}

          <div className="mb-3 flex justify-end">
            <button
              onClick={() => setCreatingPortfolio(true)}
              className="grid h-9 w-9 place-items-center rounded-full"
              style={{ backgroundColor: withAlpha(SECTION, '1f'), color: SECTION }}
              aria-label="Добавить портфель"
            >
              <IconPlus width={18} height={18} />
            </button>
          </div>

          {portfolios.length === 0 ? (
            <EmptyState
              icon="📈"
              title="Портфелей нет"
              hint="Создайте брокерский счёт или ИИС и добавьте акции. Котировки обновляются вручную."
              color={SECTION}
            />
          ) : (
            <div className="space-y-4">
              {portfolios.map((p) => {
            const items = holdings.filter((h) => h.portfolioId === p.id);
            const pValue = items.reduce(
              (s, h) => s + holdingValue(h.quantity, h.lastPrice),
              0,
            );
            return (
              <div key={p.id}>
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold">{p.name}</h2>
                    <p className="text-xs text-muted">{KIND_LABEL[p.kind]}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {formatMoney(pValue, 'RUB', { fraction: false })}
                    </span>
                    <button
                      onClick={() => setEditingHolding({ portfolioId: p.id })}
                      className="grid h-8 w-8 place-items-center rounded-full"
                      style={{ backgroundColor: withAlpha(SECTION, '1f'), color: SECTION }}
                      aria-label="Добавить акцию"
                    >
                      <IconPlus width={16} height={16} />
                    </button>
                  </div>
                </div>
                {items.length === 0 ? (
                  <p className="card text-center text-sm text-muted">
                    Нет позиций
                  </p>
                ) : (
                  <div className="space-y-2">
                    {items.map((h) => {
                      const pnl = holdingPnL(h.quantity, h.avgPrice, h.lastPrice);
                      const pnlPct = holdingPnLPct(h.avgPrice, h.lastPrice);
                      return (
                        <button
                          key={h.id}
                          onClick={() => setEditingHolding(h)}
                          className="card flex w-full items-center gap-3 text-left"
                        >
                          <span className="grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-xs font-bold">
                            {h.ticker.slice(0, 4)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{h.name || h.ticker}</p>
                            <p className="text-xs text-muted">
                              {h.quantity} шт ·{' '}
                              {formatMoney(h.lastPrice, 'RUB', { fraction: false })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              {formatMoney(
                                holdingValue(h.quantity, h.lastPrice),
                                'RUB',
                                { fraction: false },
                              )}
                            </p>
                            <p
                              className={`text-xs ${
                                pnl >= 0 ? 'text-income' : 'text-accent-bright'
                              }`}
                            >
                              {pnl >= 0 ? '+' : '−'}
                              {formatPercent(Math.abs(pnlPct))}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
            </div>
          )}
        </>
      )}

      {creatingPortfolio && (
        <PortfolioForm onClose={() => setCreatingPortfolio(false)} />
      )}
      {editingHolding && (
        <HoldingForm holding={editingHolding} onClose={() => setEditingHolding(null)} />
      )}
    </section>
  );
}

function PortfolioForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<PortfolioKind>('broker');

  async function save() {
    if (!name.trim()) return;
    await db.portfolios.add({
      name: name.trim(),
      kind,
      color: COLORS[0],
      createdAt: Date.now(),
    });
    onClose();
  }

  return (
    <Modal open title="Новый портфель" onClose={onClose}>
      <label className="label">Название</label>
      <input
        className="field mb-4"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Тинькофф Инвестиции"
        autoFocus
      />
      <label className="label">Тип счёта</label>
      <div className="mb-5 flex gap-2">
        {(Object.keys(KIND_LABEL) as PortfolioKind[]).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`chip flex-1 ${kind === k ? 'chip-active' : 'chip-idle'}`}
          >
            {KIND_LABEL[k]}
          </button>
        ))}
      </div>
      <button onClick={save} className="btn-accent w-full">
        Создать
      </button>
    </Modal>
  );
}

function HoldingForm({
  holding,
  onClose,
}: {
  holding: Partial<Holding>;
  onClose: () => void;
}) {
  const isNew = holding.id == null;
  const [ticker, setTicker] = useState(holding.ticker ?? '');
  const [name, setName] = useState(holding.name ?? '');
  const [quantity, setQuantity] = useState(String(holding.quantity ?? ''));
  const [avgPrice, setAvgPrice] = useState(String(holding.avgPrice ?? ''));
  const [lastPrice, setLastPrice] = useState(String(holding.lastPrice ?? ''));

  async function save() {
    if (!ticker.trim() || Number(quantity) <= 0) return;
    const data = {
      portfolioId: holding.portfolioId!,
      ticker: ticker.trim().toUpperCase(),
      name: name.trim(),
      quantity: Number(quantity),
      avgPrice: Number(avgPrice) || 0,
      lastPrice: Number(lastPrice) || Number(avgPrice) || 0,
      lastPriceUpdatedAt: Date.now(),
    };
    if (isNew) await db.holdings.add(data);
    else await db.holdings.update(holding.id!, data);
    onClose();
  }

  async function remove() {
    if (holding.id != null && confirm('Удалить позицию?')) {
      await db.holdings.delete(holding.id);
      onClose();
    }
  }

  return (
    <Modal open title={isNew ? 'Новая позиция' : (holding.ticker ?? 'Позиция')} onClose={onClose}>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label className="label">Тикер</label>
          <input
            className="field uppercase"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="SBER"
            autoFocus
          />
        </div>
        <div>
          <label className="label">Название</label>
          <input
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Сбербанк"
          />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <div>
          <label className="label">Кол-во</label>
          <input
            type="number"
            className="field"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Ср. цена</label>
          <input
            type="number"
            className="field"
            value={avgPrice}
            onChange={(e) => setAvgPrice(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Тек. цена</label>
          <input
            type="number"
            className="field"
            value={lastPrice}
            onChange={(e) => setLastPrice(e.target.value)}
          />
        </div>
      </div>

      {!isNew && holding.lastPriceUpdatedAt && (
        <p className="mb-4 text-xs text-muted">
          Цена обновлена: {formatDateTime(holding.lastPriceUpdatedAt)}
        </p>
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
