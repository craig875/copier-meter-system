import clsx from 'clsx';
import {
  pipelineStatusLabel,
  overlayStatusLabel,
  PIPELINE_BADGE_STYLES,
  OVERLAY_BADGE_STYLES,
} from '../../constants/fibreOrders';

export default function FibreStatusBadge({
  pipelineStatus,
  overlayStatus,
  className,
}) {
  return (
    <span className={clsx('inline-flex flex-wrap items-center gap-1', className)}>
      {pipelineStatus && (
        <span
          className={clsx(
            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
            PIPELINE_BADGE_STYLES[pipelineStatus] ?? 'bg-gray-100 text-gray-700'
          )}
        >
          {pipelineStatusLabel(pipelineStatus)}
        </span>
      )}
      {overlayStatus && (
        <span
          className={clsx(
            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
            OVERLAY_BADGE_STYLES[overlayStatus] ?? 'bg-gray-100 text-gray-700'
          )}
        >
          {overlayStatusLabel(overlayStatus)}
        </span>
      )}
    </span>
  );
}
