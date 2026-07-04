import type { CategorySlice } from '@/lib/analytics';
import { formatMoney } from '@/lib/format';

export function CategoryRow({
  slice,
  drillable,
  onDrill,
}: {
  slice: CategorySlice;
  drillable: boolean;
  onDrill: () => void;
}) {
  return (
    <button
      onClick={drillable ? onDrill : undefined}
      className="flex w-full items-center gap-3 py-2 text-left"
    >
      <span
        className="grid h-9 w-9 place-items-center rounded-full text-sm"
        style={{ backgroundColor: slice.color + '33' }}
      >
        {slice.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="truncate font-medium">{slice.name}</span>
          <span className="ml-2 shrink-0 font-semibold">
            {formatMoney(slice.amount, 'RUB', { fraction: false })}
          </span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full"
            style={{ width: `${slice.percent}%`, backgroundColor: slice.color }}
          />
        </div>
      </div>
    </button>
  );
}
