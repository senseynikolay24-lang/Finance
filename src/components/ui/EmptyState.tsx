import type { ReactNode } from 'react';
import { withAlpha } from '@/lib/theme';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
  color?: string; // тематический цвет раздела для подложки иконки
}

export function EmptyState({ icon, title, hint, action, color }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      {icon && (
        <div
          className="grid h-16 w-16 place-items-center rounded-full text-3xl"
          style={{ backgroundColor: color ? withAlpha(color, '1f') : '#F3F1F1' }}
        >
          {icon}
        </div>
      )}
      <p className="font-medium text-soft">{title}</p>
      {hint && <p className="max-w-xs text-sm text-muted">{hint}</p>}
      {action}
    </div>
  );
}
