import { Link } from 'react-router-dom';
import { Building2, LayoutDashboard, Package, Printer } from 'lucide-react';

const CopierServiceDashboard = () => {
  const tiles = [
    {
      name: 'Customers',
      description: 'Manage customers and link machines',
      href: '/customers',
      icon: Building2,
      color: 'bg-red-50',
      iconColor: 'text-red-600',
    },
    {
      name: 'Meter Readings',
      description: 'Capture readings, history and export',
      href: '/meter-readings',
      icon: LayoutDashboard,
      color: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      name: 'Machines',
      description: 'Add, edit and manage copier machines',
      href: '/machines',
      icon: Printer,
      color: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      name: 'Consumable Orders',
      description: 'Record part orders by customer',
      href: '/consumables/orders',
      icon: Package,
      color: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Copier Service</h1>
        <p className="text-gray-500">Select an area to get started</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link
              key={tile.name}
              to={tile.href}
              className="liquid-glass rounded-xl p-8 hover:shadow-lg hover:border-red-200 transition-all group min-h-[140px]"
            >
              <div className="flex items-start gap-6">
                <div className={`p-5 rounded-xl ${tile.color} group-hover:scale-105 transition-transform flex-shrink-0`}>
                  <Icon className={`h-12 w-12 ${tile.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-semibold text-gray-900 group-hover:text-red-600 transition-colors">
                    {tile.name}
                  </h2>
                  <p className="text-base text-gray-500 mt-2">{tile.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default CopierServiceDashboard;
