interface ProgressBarProps {
  value: number; // 0..100
  color?: string;
  className?: string;
}

export function ProgressBar({ value, color = '#E5383B', className }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={`h-2.5 w-full overflow-hidden rounded-full bg-surface-2 ${className ?? ''}`}>
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${clamped}%`, backgroundColor: color }}
      />
    </div>
  );
}
