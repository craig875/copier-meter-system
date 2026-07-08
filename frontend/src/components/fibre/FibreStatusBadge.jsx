import clsx from 'clsx';
import { statusLabel, STATUS_BADGE_STYLES } from '../../constants/fibreOrders';

export default function FibreStatusBadge({ status, className }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
        STATUS_BADGE_STYLES[status] ?? 'bg-gray-100 text-gray-700',
        className
      )}
    >
      {statusLabel(status)}
    </span>
  );
}
