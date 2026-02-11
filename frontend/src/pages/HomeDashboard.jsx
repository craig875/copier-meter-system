import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  FileSpreadsheet, 
  ArrowRight,
  Loader2
} from 'lucide-react';

const HomeDashboard = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.get().then(res => res.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading dashboard: {error.message}</p>
      </div>
    );
  }

  const modules = data?.modules || [];
  const platform = data?.platform || { name: 'Systems' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{platform.name}</h1>
        <p className="text-gray-500 mt-1">{platform.description || 'Unified platform for managing internal business processes'}</p>
        {data?.message && (
          <p className="text-gray-600 mt-2">{data.message}</p>
        )}
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module) => (
            <ModuleCard key={module.id} module={module} />
          ))}
      </div>

      {/* Modules by Category */}
      {data?.modulesByCategory && Object.keys(data.modulesByCategory).length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Modules by Category</h2>
          {Object.entries(data.modulesByCategory).map(([category, categoryModules]) => (
            <div key={category} className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{category}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categoryModules.map((module) => (
                    <ModuleCard key={module.id} module={module} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ModuleCard = ({ module }) => {
  const getIcon = (moduleId) => {
    switch (moduleId) {
      case 'meter-readings':
        return FileSpreadsheet;
      default:
        return LayoutDashboard;
    }
  };

  const getRoute = (moduleId) => {
    switch (moduleId) {
      case 'meter-readings':
        return '/meter-readings';
      default:
        return module.route || '/';
    }
  };

  const Icon = getIcon(module.id);
  const route = getRoute(module.id);

  return (
    <Link
      to={route}
      className="group bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-red-300"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-red-50 rounded-lg group-hover:bg-red-100 transition-colors">
          <Icon className="h-6 w-6 text-red-600" />
        </div>
        <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-red-600 group-hover:translate-x-1 transition-all" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{module.name}</h3>
      <p className="text-sm text-gray-500 mb-4">{module.description}</p>
      {module.category && (
        <span className="inline-block px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded">
          {module.category}
        </span>
      )}
    </Link>
  );
};

export default HomeDashboard;
