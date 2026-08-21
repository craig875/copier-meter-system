import clsx from 'clsx';
import { formatZar } from './formatZar';

const TILES = [
  {
    id: 'billed',
    label: 'Total billed',
    hint: 'Lines going to Smart Edge',
    amount: (t) => t.billed,
  },
  {
    id: 'excluded',
    label: 'Total excluded',
    hint: 'Data / Top Up / exclusions',
    amount: (t) => t.excluded,
  },
  {
    id: 'unmatched',
    label: 'Total unmatched',
    hint: 'Not on contract',
    amount: (t) => t.unmatched,
  },
  {
    id: 'noActivity',
    label: 'No activity',
    hint: 'On contract, no calls this period',
    amount: (t) => t.noActivity,
    count: (t) => t.noActivityCount,
  },
  {
    id: 'all',
    label: 'Grand total',
    hint: 'Full supplier cost',
    amount: (t) => t.grand,
  },
];

export default function BillingRunTotals({
  billed,
  excluded,
  unmatched,
  grand,
  noActivity = 0,
  noActivityCount = 0,
  excludedChargedCount = 0,
  excludedChargedTotal = 0,
  activeFilter,
  onFilterChange,
}) {
  const totals = {
    billed,
    excluded,
    unmatched,
    noActivity,
    noActivityCount,
    grand: grand ?? billed + excluded + unmatched,
  };
  const clickable = typeof onFilterChange === 'function';
  const tiles = TILES.filter(
    (tile) => clickable || tile.id !== 'noActivity' || noActivityCount > 0
  );

  return (
    <div
      className={clsx(
        'grid grid-cols-1 sm:grid-cols-2 gap-4',
        tiles.length >= 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'
      )}
    >
      {tiles.map((tile) => {
        const active = clickable && activeFilter === tile.id;
        const className = clsx(
          'tile-card p-4 text-left w-full transition-colors',
          clickable && 'border-2',
          clickable && active && 'border-red-600 bg-red-50',
          clickable && !active && 'border-transparent hover:border-gray-300',
          clickable && 'cursor-pointer'
        );
        const count = tile.count ? tile.count(totals) : null;
        const showChargedExcluded = tile.id === 'excluded' && excludedChargedCount > 0;
        const body = (
          <>
            <p className={clsx('text-sm', active ? 'text-red-700' : 'text-gray-500')}>{tile.label}</p>
            {count != null ? (
              <p className={clsx('text-lg font-semibold mt-1', active ? 'text-red-700' : 'text-gray-900')}>
                {count} · {formatZar(tile.amount(totals))}
              </p>
            ) : (
              <p className={clsx('text-lg font-semibold mt-1', active ? 'text-red-700' : 'text-gray-900')}>
                {formatZar(tile.amount(totals))}
              </p>
            )}
            {showChargedExcluded ? (
              <p className="text-xs font-medium text-amber-700 mt-1">
                {excludedChargedCount} with charges · {formatZar(excludedChargedTotal)}
              </p>
            ) : null}
            <p className="text-xs text-gray-400 mt-1">{tile.hint}</p>
          </>
        );
        if (!clickable) {
          return (
            <div key={tile.id} className={className}>
              {body}
            </div>
          );
        }
        return (
          <button
            key={tile.id}
            type="button"
            onClick={() => onFilterChange(tile.id)}
            aria-pressed={active}
            className={className}
          >
            {body}
          </button>
        );
      })}
    </div>
  );
}
