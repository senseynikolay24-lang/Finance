import { useEffect, useRef, useState } from 'react';

/** Плавно «докручивает» число от предыдущего значения к целевому
 *  (ease-out cubic) через requestAnimationFrame, без сторонних зависимостей.
 *  Возвращает округлённое до целого текущее значение — подходит для сумм
 *  в формате без копеек. */
export function useCountUp(target: number, duration = 500): number {
  const [value, setValue] = useState(target);
  const prevRef = useRef(target);

  useEffect(() => {
    const from = prevRef.current;
    const to = target;
    if (from === to) return;

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        prevRef.current = to;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}
