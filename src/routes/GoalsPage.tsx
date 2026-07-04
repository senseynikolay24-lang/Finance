import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { Goal } from '@/db/types';
import { contributeToGoal } from '@/db/repo';
import { goalProgress } from '@/lib/finance';
import { formatDate, formatMoney } from '@/lib/format';
import { PALETTE, SECTION_COLOR } from '@/lib/theme';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { IconPlus, IconTarget, IconTrash } from '@/components/ui/Icon';

const COLORS = PALETTE;
const ICONS = ['🎯', '🏖️', '🚗', '🏠', '💍', '🎓', '💻', '✈️', '🎁'];

export function GoalsPage() {
  const goals = useLiveQuery(() => db.goals.toArray(), [], []);
  const [editing, setEditing] = useState<Partial<Goal> | null>(null);
  const [contributing, setContributing] = useState<Goal | null>(null);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between pt-1">
        <h1 className="text-2xl font-bold">Цели</h1>
        <button
          onClick={() => setEditing({})}
          className="grid h-10 w-10 place-items-center rounded-full bg-accent text-white"
          aria-label="Добавить цель"
        >
          <IconPlus width={20} height={20} />
        </button>
      </div>

      {goals.length === 0 ? (
        <EmptyState
          icon="🎯"
          title="Целей пока нет"
          hint="Поставьте финансовую цель — например, накопить на отпуск или подушку безопасности"
          color={SECTION_COLOR.goals}
        />
      ) : (
        <div className="space-y-3">
          {goals.map((g) => {
            const progress = goalProgress(g.currentAmount, g.targetAmount);
            return (
              <div key={g.id} className="card">
                <div className="mb-3 flex items-center gap-3">
                  <span
                    className="grid h-11 w-11 place-items-center rounded-full text-xl"
                    style={{ backgroundColor: g.color + '33' }}
                  >
                    {g.icon}
                  </span>
                  <div className="flex-1">
                    <button
                      onClick={() => setEditing(g)}
                      className="block text-left font-medium"
                    >
                      {g.name}
                    </button>
                    {g.deadline && (
                      <p className="text-xs text-muted">
                        до {formatDate(g.deadline)}
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-semibold">{progress.toFixed(0)}%</span>
                </div>
                <ProgressBar value={progress} color={g.color} />
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-sm text-muted">
                    {formatMoney(g.currentAmount, 'RUB', { fraction: false })} из{' '}
                    {formatMoney(g.targetAmount, 'RUB', { fraction: false })}
                  </p>
                  <button
                    onClick={() => setContributing(g)}
                    className="text-sm font-medium text-accent-bright"
                  >
                    + Пополнить
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && <GoalForm goal={editing} onClose={() => setEditing(null)} />}
      {contributing && (
        <ContributeForm goal={contributing} onClose={() => setContributing(null)} />
      )}
    </div>
  );
}

function GoalForm({ goal, onClose }: { goal: Partial<Goal>; onClose: () => void }) {
  const isNew = goal.id == null;
  const [name, setName] = useState(goal.name ?? '');
  const [target, setTarget] = useState(String(goal.targetAmount ?? ''));
  const [current, setCurrent] = useState(String(goal.currentAmount ?? ''));
  const [deadline, setDeadline] = useState(
    goal.deadline ? new Date(goal.deadline).toISOString().slice(0, 10) : '',
  );
  const [icon, setIcon] = useState(goal.icon ?? ICONS[0]);
  const [color, setColor] = useState(goal.color ?? COLORS[0]);

  async function save() {
    if (!name.trim() || Number(target) <= 0) return;
    const data = {
      name: name.trim(),
      targetAmount: Number(target),
      currentAmount: Number(current) || 0,
      deadline: deadline ? new Date(deadline).getTime() : undefined,
      icon,
      color,
      createdAt: goal.createdAt ?? Date.now(),
    };
    if (isNew) await db.goals.add(data);
    else await db.goals.update(goal.id!, data);
    onClose();
  }

  async function remove() {
    if (goal.id != null && confirm('Удалить цель?')) {
      await db.goals.delete(goal.id);
      onClose();
    }
  }

  return (
    <Modal open title={isNew ? 'Новая цель' : 'Цель'} onClose={onClose}>
      <label className="label">Название</label>
      <input
        className="field mb-4"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Например, Подушка безопасности"
        autoFocus
      />

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label className="label">Цель, ₽</label>
          <input
            type="number"
            className="field"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Уже накоплено</label>
          <input
            type="number"
            className="field"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </div>
      </div>

      <label className="label">Срок (необязательно)</label>
      <input
        type="date"
        className="field mb-4"
        value={deadline}
        onChange={(e) => setDeadline(e.target.value)}
      />

      <label className="label">Иконка</label>
      <div className="mb-4 flex flex-wrap gap-2">
        {ICONS.map((i) => (
          <button
            key={i}
            onClick={() => setIcon(i)}
            className={`grid h-10 w-10 place-items-center rounded-xl text-lg ${
              icon === i ? 'bg-accent' : 'bg-surface-2'
            }`}
          >
            {i}
          </button>
        ))}
      </div>

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

function ContributeForm({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const [amount, setAmount] = useState('');
  async function save() {
    if (Number(amount) === 0) return;
    await contributeToGoal(goal.id!, Number(amount));
    onClose();
  }
  return (
    <Modal open title={`Пополнить: ${goal.name}`} onClose={onClose}>
      <p className="mb-4 flex items-center gap-2 text-sm text-muted">
        <IconTarget width={18} height={18} />
        Внесите сумму (можно отрицательную, чтобы уменьшить)
      </p>
      <input
        type="number"
        inputMode="decimal"
        className="field mb-5 text-2xl font-semibold"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0"
        autoFocus
      />
      <button onClick={save} className="btn-accent w-full">
        Пополнить
      </button>
    </Modal>
  );
}
