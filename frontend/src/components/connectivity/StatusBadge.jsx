import clsx from 'clsx';

const statusConfig = {
  up: { label: 'Up', color: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
  down: { label: 'Down', color: 'bg-red-100 text-red-800', dot: 'bg-red-500' },
  partial: { label: 'Partial', color: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' },
  dns_failure: { label: 'DNS Failure', color: 'bg-red-100 text-red-800', dot: 'bg-red-500' },
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || { label: status || 'Unknown', color: 'bg-gray-100 text-gray-800', dot: 'bg-gray-400' };
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium', config.color)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  );
}
