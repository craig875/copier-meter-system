import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  FileSpreadsheet, 
  Printer, 
  Users, 
  History,
  LogOut,
  Menu,
  X,
  Building2,
  Home,
  Upload
} from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';
import logo from '../assets/logo.png';

const Layout = ({ children }) => {
  const { user, logout, isAdmin, isMeterUser, selectedBranch, updateSelectedBranch, effectiveBranch } = useAuth();
  // Show branch selector for admins or meter users with no branch assigned (can switch branches)
  const canSwitchBranches = isAdmin || (isMeterUser && !user?.branch);
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { 
      name: 'Meter Readings', 
      href: '/meter-readings', 
      icon: LayoutDashboard,
      children: [
        { name: 'Monthly Capture', href: '/capture', icon: FileSpreadsheet },
        { name: 'History', href: '/history', icon: History },
        { name: 'Machines', href: '/machines', icon: Printer },
        ...(isAdmin ? [
          { name: 'Import Readings', href: '/import-readings', icon: Upload },
        ] : []),
      ]
    },
    ...(isAdmin ? [
      { name: 'Users', href: '/users', icon: Users },
    ] : []),
  ];

  const isActive = (href) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        'fixed inset-y-0 left-0 z-30 w-64 bg-gray-900 shadow-lg transform transition-transform duration-300 lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-700">
          <Link to="/" className="flex items-center">
            <img src={logo} alt="Pancom" className="h-8 w-auto" />
          </Link>
          <button 
            className="lg:hidden text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="mt-6 px-3">
          {navigation.map((item) => (
            <div key={item.name}>
              <Link
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={clsx(
                  'flex items-center px-4 py-3 mb-1 rounded-lg transition-colors',
                  isActive(item.href)
                    ? 'bg-red-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                )}
              >
                <item.icon className="h-5 w-5 mr-3" />
                {item.name}
              </Link>
              {item.children && isActive(item.href) && (
                <div className="ml-4 mt-1 space-y-1">
                  {item.children.map((child) => (
                    <Link
                      key={child.name}
                      to={child.href}
                      onClick={() => setSidebarOpen(false)}
                      className={clsx(
                        'flex items-center px-4 py-2 mb-1 rounded-lg transition-colors text-sm',
                        isActive(child.href)
                          ? 'bg-red-700 text-white'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                      )}
                    >
                      <child.icon className="h-4 w-4 mr-3" />
                      {child.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700 space-y-3">
          {/* Branch Selector for Admins and Meter Users with All Branches Access */}
          {canSwitchBranches && (
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Branch
              </label>
              <select
                value={selectedBranch ?? 'JHB'}
                onChange={(e) => updateSelectedBranch(e.target.value)}
                className="w-full px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded text-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="JHB">Johannesburg (JHB)</option>
                <option value="CT">Cape Town (CT)</option>
              </select>
            </div>
          )}
          
          {/* User Info */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">{user?.name}</p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-400">{user?.role}</p>
                {effectiveBranch && (
                  <>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {effectiveBranch}
                    </span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-red-400 transition-colors"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="bg-white shadow-sm h-16 flex items-center px-6">
          <button 
            className="lg:hidden mr-4"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <h2 className="text-lg font-semibold text-gray-800">
            {navigation.find(n => isActive(n.href))?.name || 'Dashboard'}
          </h2>
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
