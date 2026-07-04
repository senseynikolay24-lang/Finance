import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { IconChevronLeft } from './ui/Icon';

interface PageHeaderProps {
  title: string;
  back?: boolean;
  action?: ReactNode;
}

export function PageHeader({ title, back = true, action }: PageHeaderProps) {
  const navigate = useNavigate();
  return (
    <div className="mb-4 flex items-center gap-3">
      {back && (
        <button
          onClick={() => navigate(-1)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface text-soft"
          aria-label="Назад"
        >
          <IconChevronLeft width={20} height={20} />
        </button>
      )}
      <h1 className="flex-1 text-xl font-semibold">{title}</h1>
      {action}
    </div>
  );
}
