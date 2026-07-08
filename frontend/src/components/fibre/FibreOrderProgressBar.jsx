import clsx from 'clsx';
import {
  PIPELINE_STATUS_VALUES,
  STATUS_BAR_SEGMENT_COLORS,
  OVERLAY_BAR_RING_STYLES,
  pipelineStatusLabel,
} from '../../constants/fibreOrders';

/**
 * Full-width segmented bar showing position in the 20-stage install pipeline.
 * Overlay status adds a ring tint but does not replace pipeline position.
 */
export default function FibreOrderProgressBar({ pipelineStatus, overlayStatus, className }) {
  if (pipelineStatus === 'complete') {
    return (
      <div className={clsx('w-full', className)}>
        <div
          className="h-2.5 w-full rounded-full bg-green-500 ring-1 ring-green-600/30"
          title="Complete"
        />
      </div>
    );
  }

  const currentIndex = PIPELINE_STATUS_VALUES.indexOf(pipelineStatus);
  const overlayRing = overlayStatus ? OVERLAY_BAR_RING_STYLES[overlayStatus] : null;

  return (
    <div className={clsx('w-full', className)}>
      <div
        className={clsx(
          'flex h-2.5 w-full overflow-hidden rounded-full bg-gray-200 ring-1 ring-gray-200',
          overlayRing
        )}
        role="progressbar"
        aria-valuenow={currentIndex >= 0 ? currentIndex + 1 : 0}
        aria-valuemin={1}
        aria-valuemax={PIPELINE_STATUS_VALUES.length}
        aria-label={`Install progress: ${pipelineStatusLabel(pipelineStatus)}`}
        title={
          overlayStatus
            ? `${pipelineStatusLabel(pipelineStatus)} (${overlayStatus.replace(/_/g, ' ')})`
            : pipelineStatusLabel(pipelineStatus)
        }
      >
        {PIPELINE_STATUS_VALUES.map((step, index) => {
          const reached = currentIndex >= 0 && index <= currentIndex;
          const isCurrent = step === pipelineStatus;
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
              title={pipelineStatusLabel(step)}
            />
          );
        })}
      </div>
    </div>
  );
}
