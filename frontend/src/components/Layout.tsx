import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore, useUser, useIsAdmin } from '../store/authStore';
import {
  HomeIcon,
  BuildingStorefrontIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  BanknotesIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  UserGroupIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Дашборд', href: '/', icon: HomeIcon },
  { name: 'Склад', href: '/warehouse', icon: CubeIcon },
  { name: 'Поставщики', href: '/vendors', icon: BuildingStorefrontIcon },
  { name: 'Клиенты', href: '/clients', icon: UsersIcon },
  { name: 'Заказы', href: '/orders', icon: ClipboardDocumentListIcon },
  { name: 'Финансы', href: '/finance', icon: BanknotesIcon },
  { name: 'Отчеты', href: '/reports', icon: ChartBarIcon },
];

const adminNavigation = [
  { name: 'Пользователи', href: '/users', icon: UserGroupIcon },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const user = useUser();
  const isAdmin = useIsAdmin();
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleLabels: Record<string, string> = {
    ADMIN: 'Администратор',
    MANAGER: 'Менеджер',
    ANALYST: 'Аналитик',
    WAREHOUSE: 'Кладовщик',
  };

  return (
    <div className="min-h-screen flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-surface-900/95 backdrop-blur-xl border-r border-surface-800
          transform transition-transform duration-300 ease-out
          lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-surface-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/25">
                <svg className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M3 4h14v2H3zM3 8h10v2H3zM3 12h12v2H3zM3 16h8v2H3z" opacity="0.9"/>
                </svg>
              </div>
              <div>
                <h1 className="font-display font-bold text-lg text-white">Fulfillment</h1>
                <p className="text-[10px] text-surface-500 uppercase tracking-wider">Finance CRM</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-surface-800 text-surface-400"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  isActive ? 'nav-link-active' : 'nav-link'
                }
                end={item.href === '/'}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </NavLink>
            ))}

            {isAdmin && (
              <>
                <div className="divider !my-4" />
                <p className="px-4 text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">
                  Администрирование
                </p>
                {adminNavigation.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      isActive ? 'nav-link-active' : 'nav-link'
                    }
                  >
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </NavLink>
                ))}
              </>
            )}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-surface-800">
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface-800/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-success-500 flex items-center justify-center text-white font-bold">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-semibold text-surface-100 truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-surface-500">
                    {user?.role && roleLabels[user.role]}
                  </p>
                </div>
                <ChevronDownIcon className={`w-4 h-4 text-surface-500 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {userMenuOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-surface-800 border border-surface-700 rounded-xl shadow-xl overflow-hidden animate-scale-in">
                  <NavLink
                    to="/settings"
                    onClick={() => {
                      setUserMenuOpen(false);
                      setSidebarOpen(false);
                    }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-surface-700/50 text-surface-300 hover:text-surface-100 transition-colors"
                  >
                    <Cog6ToothIcon className="w-5 h-5" />
                    Настройки
                  </NavLink>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-danger-500/10 text-danger-500 transition-colors"
                  >
                    <ArrowRightOnRectangleIcon className="w-5 h-5" />
                    Выйти
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between h-16 px-4 bg-surface-900/95 backdrop-blur-xl border-b border-surface-800">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-surface-800 text-surface-400"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3 4h14v2H3zM3 8h10v2H3zM3 12h12v2H3zM3 16h8v2H3z" opacity="0.9"/>
              </svg>
            </div>
            <span className="font-display font-bold text-white">FF</span>
          </div>
          <div className="w-10" />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
