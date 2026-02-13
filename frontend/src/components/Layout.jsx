import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Printer, 
  Users, 
  LogOut,
  Menu,
  X,
  Building2,
  Home,
  ScrollText,
  HelpCircle,
  Package,
  Wrench,
  Cog,
  ChevronDown,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import logo from '../assets/logo.png';

const Layout = ({ children }) => {
  const { user, logout, isAdmin, isMeterUser, isCapturer, selectedBranch, updateSelectedBranch, effectiveBranch } = useAuth();
  const navigate = useNavigate();
  // Show branch selector for admins or meter users/capturers with no branch assigned (can switch branches)
  const canSwitchBranches = isAdmin || ((isMeterUser || isCapturer) && !user?.branch);
  const location = useLocation();
  const showBackButton = location.pathname !== '/';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState(new Set());

  const toggleSection = (name) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // Auto-expand section when current route is within it (e.g. direct nav or refresh)
  useEffect(() => {
    let sectionToExpand = null;
    navigation.forEach((item) => {
      item.children?.forEach((child) => {
        if (child.children?.some((gc) => location.pathname === gc.href || (gc.href !== '/' && location.pathname.startsWith(gc.href)))) {
          sectionToExpand = child.name;
        }
      });
    });
    if (sectionToExpand) {
      setExpandedSections((prev) => new Set(prev).add(sectionToExpand));
    }
  }, [location.pathname]);

  const navigation = isCapturer
    ? [
        { name: 'Home', href: '/', icon: Home },
        { 
          name: 'Meter Readings', 
          href: '/meter-readings', 
          icon: LayoutDashboard,
          children: [
            { name: 'Monthly Capture', href: '/capture', icon: LayoutDashboard },
            { name: 'History', href: '/history', icon: ScrollText },
          ]
        },
      ]
    : [
    { name: 'Home', href: '/', icon: Home },
    { 
      name: 'Copier Service', 
      href: '/copier-service', 
      icon: Printer,
      children: [
        { name: 'Customers', href: '/customers', icon: Building2 },
        { name: 'Meter Readings', href: '/meter-readings', icon: LayoutDashboard, activePaths: ['/capture', '/history', '/import-readings'] },
        { name: 'Machines', href: '/machines', icon: Printer },
        { name: 'Consumable Orders', href: '/consumables/orders', icon: Package, activePaths: ['/consumables'] },
        { name: 'Consumable Summary', href: '/consumables/summary', icon: Package, activePaths: ['/consumables/summary'] },
      ]
    },
    ...(isAdmin ? [
      { 
        name: 'Admin Tools', 
        href: '/admin', 
        icon: Wrench,
        children: [
          { name: 'Machine Configuration', href: '/admin/machine-configuration', icon: Cog },
          { name: 'Parts & Pricing', href: '/admin/parts-pricing', icon: Package },
          { name: 'Users', href: '/users', icon: Users },
          { name: 'Transaction History', href: '/transaction-history', icon: ScrollText },
        ]
      },
    ] : []),
  ];

  const isActive = (href) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  const isChildActive = (child) => {
    if (child.activePaths?.some((p) => location.pathname.startsWith(p))) return true;
    return isActive(child.href) || (child.children && child.children.some((gc) => isActive(gc.href)));
  };

  const hasActiveChild = (item) => {
    if (!item.children) return false;
    return item.children.some((c) => isChildActive(c));
  };

  const isItemActive = (item) => isActive(item.href) || hasActiveChild(item);

  // Prevent copy to clipboard
  const handleCopy = useCallback((e) => {
    e.preventDefault();
  }, []);

  useEffect(() => {
    document.addEventListener('copy', handleCopy);
    return () => document.removeEventListener('copy', handleCopy);
  }, [handleCopy]);

  return (
    <div 
      className="min-h-screen no-copy"
      style={{ 
        backgroundImage: 'linear-gradient(135deg, rgb(226 232 240), rgb(241 245 249), rgb(228 231 235))',
        backgroundSize: '100% 100%'
      }}
    >
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - glass effect */}
      <aside data-tour="sidebar" className={clsx(
        'fixed inset-y-0 left-0 z-30 w-64 bg-gray-900/95 backdrop-blur-xl border-r border-white/10 shadow-xl transform transition-transform duration-300 lg:translate-x-0',
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
                  isItemActive(item)
                    ? 'bg-red-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                )}
              >
                <item.icon className="h-5 w-5 mr-3" />
                {item.name}
              </Link>
              {item.children && isItemActive(item) && (
                <div className="ml-4 mt-1 space-y-1">
                  {item.children.map((child) => {
                    const isExpanded = expandedSections.has(child.name);
                    const hasChildren = child.children?.length > 0;
                    return (
                      <div key={child.name}>
                        {hasChildren ? (
                          <>
                            <button
                              type="button"
                              onClick={() => toggleSection(child.name)}
                              className="flex items-center w-full px-4 py-2 mb-1 rounded-lg transition-colors text-sm text-left text-gray-400 hover:bg-gray-800 hover:text-white"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 mr-1 flex-shrink-0" />
                              ) : (
                                <ChevronRight className="h-4 w-4 mr-1 flex-shrink-0" />
                              )}
                              <child.icon className="h-4 w-4 mr-2" />
                              {child.name}
                            </button>
                            {isExpanded && (
                              <div className="ml-4 mt-1 space-y-1">
                                {child.children.map((grandchild) => (
                                  <Link
                                    key={grandchild.name}
                                    to={grandchild.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className="flex items-center px-4 py-2 mb-1 rounded-lg transition-colors text-xs text-gray-400 hover:bg-gray-800 hover:text-white"
                                  >
                                    <grandchild.icon className="h-3.5 w-3 mr-3" />
                                    {grandchild.name}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <Link
                            to={child.href}
                            onClick={() => setSidebarOpen(false)}
                            className="flex items-center px-4 py-2 mb-1 rounded-lg transition-colors text-sm text-gray-400 hover:bg-gray-800 hover:text-white"
                          >
                            <child.icon className="h-4 w-4 mr-2" />
                            {child.name}
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700 space-y-3">
          {/* Branch Selector for Admins and Meter Users with All Branches Access */}
          {canSwitchBranches && (
            <div data-tour="branch-selector" className="mb-3">
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
        {/* Top bar - glass */}
        <header className="bg-white/20 backdrop-blur-3xl border-b border-white/30 shadow-sm h-16 flex items-center justify-between px-6" style={{ boxShadow: '0 1px 0 0 rgba(255,255,255,0.5) inset' }}>
          <div className="flex items-center gap-3">
            {showBackButton && (
              <button
                onClick={() => navigate(-1)}
                className="p-2 -ml-2 rounded-lg text-gray-600 hover:text-red-600 hover:bg-white/30 transition-colors"
                title="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <button 
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            <h2 className="text-lg font-semibold text-gray-800">
              {location.pathname.startsWith('/consumables/machines/') ? 'Machine Consumables' 
                : location.pathname.startsWith('/admin/machine-configuration') ? 'Machine Configuration'
                : navigation.find(n => isItemActive(n))?.name || 'Dashboard'}
            </h2>
          </div>
          <button
            onClick={() => import('../services/tutorial').then((m) => m.startTutorial(location.pathname, isAdmin))}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-white/30 rounded-lg transition-colors"
            title="Take a tour"
          >
            <HelpCircle className="h-5 w-5" />
            <span className="hidden sm:inline">Help</span>
          </button>
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
