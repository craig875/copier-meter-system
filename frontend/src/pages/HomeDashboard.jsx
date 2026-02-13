import { Link } from 'react-router-dom';
import { Printer, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const copierModules = [
  {
    id: 'copiers',
    name: 'Copiers',
    description: 'Meter readings, customers and consumable orders',
    href: '/copier-service',
    icon: Printer,
    color: 'bg-red-50',
    iconColor: 'text-red-600',
  },
];

const capturerModules = [
  {
    id: 'meter-readings',
    name: 'Meter Readings',
    description: 'Capture monthly meter readings',
    href: '/capture',
    icon: LayoutDashboard,
    color: 'bg-red-50',
    iconColor: 'text-red-600',
  },
];

const HomeDashboard = () => {
  const { user, isCapturer } = useAuth();
  const modules = isCapturer ? capturerModules : copierModules;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {user?.name || 'User'}!
        </h1>
        <p className="text-gray-500 mt-1">
          Systems – Unified platform for managing internal business processes
        </p>
        <p className="text-gray-500 mt-1">Select a module to get started</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <Link
              key={module.id}
              to={module.href}
              data-tour="module-card"
              className="liquid-glass rounded-xl p-6 hover:shadow-lg hover:border-red-200 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className={`p-4 rounded-xl ${module.color} group-hover:scale-105 transition-transform`}>
                  <Icon className={`h-8 w-8 ${module.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-gray-900 group-hover:text-red-600 transition-colors">
                    {module.name}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">{module.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default HomeDashboard;
