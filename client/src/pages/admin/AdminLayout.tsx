import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { InlineLoading } from '../../components/ui/Loading';

const NAV_ITEMS = [
  { to: '/admin', label: 'داشبورد', end: true },
  { to: '/admin/products', label: 'محصولات', end: false },
  { to: '/admin/articles', label: 'مقالات', end: false },
  { to: '/admin/orders', label: 'سفارش‌ها', end: false },
  { to: '/admin/users', label: 'کاربران', end: false },
  { to: '/admin/logs', label: 'لاگ‌ها', end: false },
  { to: '/admin/settings', label: 'تنظیمات', end: false },
];

export default function AdminLayout() {
  const { user, isLoading, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login', { replace: true });
  };

  if (isLoading) {
    return (
      <div className="container-sadra py-16">
        <InlineLoading text="در حال بررسی دسترسی..." />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="container-sadra py-8">
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="mb-4 hidden items-center gap-2 lg:flex">
            <img src="/logo-mark.png" alt="CAVERO" className="h-9 w-9 object-cover" />
            <span className="text-sm font-extrabold">پنل مدیریت</span>
          </div>
          <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-stone-100 bg-white p-2 lg:flex-col">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'bg-black text-white' : 'text-stone-700 hover:bg-stone-100'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-3 hidden rounded-2xl border border-stone-100 bg-white p-3 lg:block">
            <p className="truncate text-xs text-stone-500">
              {user.fullName}
              {user.username ? ` (${user.username})` : ''}
            </p>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-2 w-full bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
            >
              خروج از پنل
            </button>
          </div>
        </aside>

        <section className="min-w-0">
          <Outlet />
        </section>
      </div>
    </div>
  );
}
