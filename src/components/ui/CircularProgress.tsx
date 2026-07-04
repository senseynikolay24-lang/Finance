import { useEffect, useState } from 'react';

interface CircularProgressProps {
  value: number; // 0..100
  size?: number;
  strokeWidth?: number;
  color?: string;
}

/** Кольцевой индикатор прогресса (используется для «Индекса свободы» на Обзоре).
 *  Плавно «заполняется» при появлении и при смене значения. */
export function CircularProgress({
  value,
  size = 64,
  strokeWidth = 6,
  color = '#BA181B',
}: CircularProgressProps) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, value));
  const targetOffset = circumference - (clamped / 100) * circumference;
  const center = size / 2;

  // Старт с пустого кольца → в эффекте выставляем реальное значение,
  // браузер проигрывает transition.
  const [offset, setOffset] = useState(circumference);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOffset(targetOffset));
    return () => cancelAnimationFrame(id);
  }, [targetOffset]);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="#E7E3E2"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset,stroke] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold">
        {Math.round(clamped)}
        <span className="text-[10px]">%</span>
      </div>
    </div>
  );
}
