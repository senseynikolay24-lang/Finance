import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '@/db/db';
import { exportData, importData } from '@/lib/backup';
import { formatDate } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { IconChevronRight, IconMenu } from '@/components/ui/Icon';

export function SettingsPage() {
  const navigate = useNavigate();
  const settings = useLiveQuery(() => db.settings.toArray(), [], []);
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const s = settings[0];

  async function saveName(name: string) {
    if (s?.id != null) await db.settings.update(s.id, { userName: name });
  }

  async function handleExport() {
    const json = await exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-backup-${formatDate(Date.now(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg('Резервная копия сохранена');
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('Импорт заменит все текущие данные. Продолжить?')) return;
    const text = await file.text();
    try {
      await importData(text);
      setMsg('Данные импортированы. Перезагрузите страницу.');
    } catch {
      setMsg('Ошибка: неверный формат файла');
    }
  }

  return (
    <div>
      <PageHeader title="Настройки" />

      <button
        onClick={() => navigate('/categories')}
        className="card mb-4 flex w-full items-center gap-3 text-left"
      >
        <span className="grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-accent-bright">
          <IconMenu width={18} height={18} />
        </span>
        <span className="flex-1 font-medium">Категории</span>
        <IconChevronRight width={18} height={18} className="text-muted" />
      </button>

      <div className="card mb-4">
        <label className="label">Ваше имя</label>
        <input
          className="field"
          defaultValue={s?.userName ?? ''}
          onBlur={(e) => saveName(e.target.value)}
          placeholder="Как к вам обращаться"
        />
      </div>

      <div className="card mb-4">
        <h2 className="mb-1 font-semibold">Резервное копирование</h2>
        <p className="mb-4 text-sm text-muted">
          Все данные хранятся локально на этом устройстве. Регулярно делайте резервную
          копию, чтобы не потерять историю.
        </p>
        <div className="flex gap-3">
          <button onClick={handleExport} className="btn-accent flex-1">
            Экспорт
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="btn-ghost flex-1"
          >
            Импорт
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleImport}
        />
        {msg && <p className="mt-3 text-sm text-income">{msg}</p>}
      </div>

      <div className="card">
        <h2 className="mb-1 font-semibold">О приложении</h2>
        <p className="text-sm text-muted">
          Финансы — приложение для контроля финансового здоровья: учёт доходов и
          расходов, долгов, кредитов, ипотеки, целей, вкладов и инвестиций. Работает
          офлайн, данные не покидают устройство.
        </p>
      </div>
    </div>
  );
}
