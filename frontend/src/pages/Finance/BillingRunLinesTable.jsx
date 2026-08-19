import { formatZar } from './formatZar';
import clsx from 'clsx';

const COLUMNS = [
  { key: 'clientCode', label: 'Client code' },
  { key: 'customerName', label: 'Customer' },
  { key: 'category', label: 'Category' },
  { key: 'mobile', label: 'Mobile', money: true },
  { key: 'international', label: 'International', money: true },
  { key: 'national', label: 'National', money: true },
  { key: 'local', label: 'Local', money: true },
  { key: 'special', label: 'Special', money: true },
  { key: 'virtual', label: 'Virtual', money: true },
  { key: 'vce', label: 'VCE', money: true },
  { key: 'lineTotal', label: 'Line total', money: true },
];

export default function BillingRunLinesTable({ lines, emptyLabel, showConfirmed = false }) {
  if (!lines?.length) {
    return <div className="p-8 text-center text-gray-500">{emptyLabel}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {lines.map((line, index) => (
            <tr
              key={line.id || `${line.clientCode}-${index}`}
              className={clsx(showConfirmed && line.confirmed && 'bg-emerald-50')}
            >
              {COLUMNS.map((col) => (
                <td key={col.key} className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                  {col.key === 'customerName' ? (
                    <>
                      {line.customerName || '—'}
                      {showConfirmed && line.confirmed ? (
                        <span className="ml-2 text-xs text-emerald-800">✓ Checked</span>
                      ) : showConfirmed ? (
                        <span className="ml-2 text-xs text-sky-700">Unconfirmed</span>
                      ) : null}
                    </>
                  ) : col.money ? (
                    formatZar(
                      col.key === 'lineTotal' && (line.lineTotal == null || line.lineTotal === '')
                        ? Number(line.mobile || 0) +
                          Number(line.international || 0) +
                          Number(line.national || 0) +
                          Number(line.local || 0) +
                          Number(line.special || 0) +
                          Number(line.virtual || 0) +
                          Number(line.vce || 0)
                        : line[col.key]
                    )
                  ) : (
                    line[col.key] || '—'
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
