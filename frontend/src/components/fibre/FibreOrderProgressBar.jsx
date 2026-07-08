import clsx from 'clsx';
import {
  PIPELINE_STATUSES,
  STATUS_BAR_SEGMENT_COLORS,
  statusLabel,
} from '../../constants/fibreOrders';

/**
 * Full-width segmented bar showing position in the install pipeline.
 */
export default function FibreOrderProgressBar({ status, className }) {
  if (status === 'complete') {
    return (
      <div className={clsx('w-full', className)}>
        <div
          className="h-2.5 w-full rounded-full bg-green-500 ring-1 ring-green-600/30"
          title="Complete"
        />
      </div>
    );
  }

  if (status === 'cancelled') {
    return (
      <div className={clsx('w-full', className)}>
        <div className="h-2.5 w-full rounded-full bg-gray-300" title="Cancelled" />
      </div>
    );
  }

  if (status === 'on_hold') {
    return (
      <div className={clsx('w-full', className)}>
        <div
          className="h-2.5 w-full rounded-full bg-orange-300 ring-1 ring-orange-400/50"
          title="On hold"
        />
      </div>
    );
  }

  const currentIndex = PIPELINE_STATUSES.indexOf(status);

  return (
    <div className={clsx('w-full', className)}>
      <div
        className="flex h-2.5 w-full overflow-hidden rounded-full bg-gray-200 ring-1 ring-gray-200"
        role="progressbar"
        aria-valuenow={currentIndex >= 0 ? currentIndex + 1 : 0}
        aria-valuemin={1}
        aria-valuemax={PIPELINE_STATUSES.length}
        aria-label={`Install progress: ${statusLabel(status)}`}
      >
        {PIPELINE_STATUSES.map((step, index) => {
          const reached = currentIndex >= 0 && index <= currentIndex;
          const isCurrent = step === status;
          return (
            <div
              key={step}
              className={clsx(
                'flex-1 min-w-0 transition-colors',
                reached
                  ? STATUS_BAR_SEGMENT_COLORS[step] ?? 'bg-gray-400'
                  : 'bg-gray-200',
                isCurrent && 'relative z-[1] ring-2 ring-inset ring-white shadow-sm',
                index > 0 && 'border-l border-white/40'
              )}
              title={statusLabel(step)}
            />
          );
        })}
      </div>
    </div>
  );
}
