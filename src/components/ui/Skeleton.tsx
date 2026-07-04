/** Плейсхолдер-заглушка загрузки: пульсирующий прямоугольник.
 *  Размеры задаются снаружи через className (h-*, w-*). */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-surface-2 ${className}`} />;
}
