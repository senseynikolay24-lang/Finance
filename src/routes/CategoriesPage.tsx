import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { Category, CategoryKind } from '@/db/types';
import { PageHeader } from '@/components/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { IconPlus, IconTrash } from '@/components/ui/Icon';

const COLORS = ['#BA181B', '#E5383B', '#A4161A', '#660708', '#2E9E5B', '#B1A7A6'];
const ICONS = ['🛒', '🚗', '🏠', '💊', '🎬', '👕', '📱', '🏦', '💼', '💻', '📈', '🎁', '📦', '✈️', '🍽️', '⛽'];

export function CategoriesPage() {
  const [kind, setKind] = useState<CategoryKind>('expense');
  const categories = useLiveQuery(() => db.categories.toArray(), [], []);
  const [editing, setEditing] = useState<Partial<Category> | null>(null);

  const parents = categories.filter((c) => c.kind === kind && c.parentId === null);

  return (
    <div>
      <PageHeader
        title="Категории"
        action={
          <button
            onClick={() => setEditing({ kind, parentId: null })}
            className="grid h-10 w-10 place-items-center rounded-full bg-accent text-white"
            aria-label="Добавить категорию"
          >
            <IconPlus width={20} height={20} />
          </button>
        }
      />

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setKind('expense')}
          className={`chip flex-1 ${kind === 'expense' ? 'chip-active' : 'chip-idle'}`}
        >
          Расходы
        </button>
        <button
          onClick={() => setKind('income')}
          className={`chip flex-1 ${kind === 'income' ? 'chip-active' : 'chip-idle'}`}
        >
          Доходы
        </button>
      </div>

      <div className="space-y-3">
        {parents.map((p) => {
          const children = categories.filter((c) => c.parentId === p.id);
          return (
            <div key={p.id} className="card">
              <div className="flex items-center gap-3">
                <span
                  className="grid h-10 w-10 place-items-center rounded-full text-lg"
                  style={{ backgroundColor: p.color + '33' }}
                >
                  {p.icon}
                </span>
                <button
                  onClick={() => setEditing(p)}
                  className="flex-1 text-left font-medium"
                >
                  {p.name}
                </button>
                <button
                  onClick={() => setEditing({ kind, parentId: p.id })}
                  className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-muted"
                  aria-label="Добавить подкатегорию"
                >
                  <IconPlus width={16} height={16} />
                </button>
              </div>
              {children.length > 0 && (
                <div className="mt-3 space-y-2 border-l border-line pl-4">
                  {children.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setEditing(c)}
                      className="flex w-full items-center gap-2 text-left text-sm"
                    >
                      <span>{c.icon}</span>
                      <span className="text-muted">{c.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editing && <CategoryForm category={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function CategoryForm({
  category,
  onClose,
}: {
  category: Partial<Category>;
  onClose: () => void;
}) {
  const isNew = category.id == null;
  const isChild = category.parentId != null;
  const [name, setName] = useState(category.name ?? '');
  const [icon, setIcon] = useState(category.icon ?? ICONS[0]);
  const [color, setColor] = useState(category.color ?? COLORS[0]);

  async function save() {
    if (!name.trim()) return;
    const data = {
      name: name.trim(),
      kind: category.kind!,
      parentId: category.parentId ?? null,
      icon,
      color,
    };
    if (isNew) await db.categories.add(data);
    else await db.categories.update(category.id!, data);
    onClose();
  }

  async function remove() {
    if (category.id == null) return;
    if (confirm('Удалить категорию? Подкатегории тоже будут удалены.')) {
      await db.categories.where('parentId').equals(category.id).delete();
      await db.categories.delete(category.id);
      onClose();
    }
  }

  return (
    <Modal
      open
      title={isNew ? (isChild ? 'Новая подкатегория' : 'Новая категория') : 'Категория'}
      onClose={onClose}
    >
      <label className="label">Название</label>
      <input
        className="field mb-4"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
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
