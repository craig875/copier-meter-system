import { Link } from 'react-router-dom';
import { Wifi, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function ConnectivitySummaryCards({ summary }) {
  const cards = [
    { label: 'Total Links', value: summary?.total ?? 0, icon: Wifi, color: 'bg-slate-100 text-slate-700', to: '/connectivity' },
    { label: 'Up', value: summary?.up ?? 0, icon: CheckCircle, color: 'bg-green-100 text-green-700', to: '/connectivity?status=up' },
    { label: 'Down', value: summary?.down ?? 0, icon: XCircle, color: 'bg-red-100 text-red-700', to: '/connectivity?status=down' },
    { label: 'Partial', value: (summary?.partial ?? 0) + (summary?.dnsFailure ?? 0), icon: AlertTriangle, color: 'bg-amber-100 text-amber-700', to: '/connectivity?status=partial' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map(({ label, value, icon: Icon, color, to }) => (
        <Link key={label} to={to} className="tile-card p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className={`p-3 rounded-lg ${color}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
