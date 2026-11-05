import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { SITE_NAME } from '../lib/constants';
import { faNum } from '../lib/format';
import BackButton from './BackButton';

const NAV_ITEMS = [
  {
    to: '/',
    label: 'خانه',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
    ),
  },
  {
    to: '/shop',
    label: 'فروشگاه',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 016.5 7.5h11a1.125 1.125 0 011.11 1.007z" />
    ),
  },
  {
    to: '/stylist',
    label: 'استایلیست AI',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    ),
  },
  {
    to: '/articles',
    label: 'مقالات',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25H5.625A2.25 2.25 0 013.375 18V6A2.25 2.25 0 015.625 3.75H14.25A2.25 2.25 0 0116.5 6v9z" />
    ),
  },
  {
    to: '/size-guide',
    label: 'راهنمای سایز',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
    ),
  },
  {
    to: '/about',
    label: 'درباره ما',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    ),
  },
];

export default function Header() {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const cartCount = cart?.count ?? 0;

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200 bg-white">
      {/* نوار اطلاع‌رسانی */}
      <div className="hidden bg-ink text-white md:block">
        <div className="container-sadra flex h-9 items-center justify-center">
          <p className="text-[11px] font-medium tracking-[0.28em] text-white/70">
            پارچه ویسکوز &nbsp;·&nbsp; دوخت ایتالیایی &nbsp;·&nbsp; ارسال به سراسر ایران
          </p>
        </div>
      </div>

      <div className="container-sadra">
        <div className="flex h-[68px] items-center justify-between gap-4 lg:h-[76px]">
          {/* لوگو */}
          <Link to="/" className="flex shrink-0 items-center gap-3" aria-label={SITE_NAME}>
            <img
              src="/logo-mark.png"
              alt={SITE_NAME}
              className="h-9 w-9 object-cover"
            />
            <span className="flex flex-col leading-none">
              <span className="text-[17px] font-black tracking-tight text-ink">{SITE_NAME}</span>
              <span className="mt-1 hidden text-[9px] font-medium uppercase tracking-[0.3em] text-stone-400 sm:block">
                CAVERO
              </span>
            </span>
          </Link>

          {/* ناوبری دسکتاپ */}
          <nav className="hidden flex-1 items-center justify-center gap-8 lg:flex">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `group relative py-2 text-[13px] font-medium tracking-wide transition-colors duration-300 ${
                    isActive ? 'text-ink' : 'text-stone-500 hover:text-ink'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {item.label}
                    <span
                      className={`absolute inset-x-0 -bottom-0.5 h-px origin-right bg-ink transition-transform duration-300 ${
                        isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                      }`}
                    />
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* اقدامات */}
          <div className="flex shrink-0 items-center gap-0.5">
            <BackButton />
            <Link
              to="/cart"
              className="relative flex h-10 w-10 items-center justify-center text-stone-700 transition-colors duration-300 hover:text-ink"
              aria-label="سبد خرید"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.4} stroke="currentColor" className="h-[22px] w-[22px]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 016.5 7.5h11a1.125 1.125 0 011.11 1.007z" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center bg-ink px-1 text-[10px] font-bold text-white">
                  {faNum(cartCount)}
                </span>
              )}
            </Link>

            {user ? (
              <div className="hidden items-center gap-0.5 sm:flex">
                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="hidden px-3 text-[13px] font-semibold text-ink transition-colors duration-300 hover:text-gold-dark lg:block"
                  >
                    پنل مدیریت
                  </Link>
                )}
                <Link
                  to="/account"
                  className="flex h-10 w-10 items-center justify-center text-stone-700 transition-colors duration-300 hover:text-ink"
                  aria-label="حساب کاربری"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.4} stroke="currentColor" className="h-[22px] w-[22px]">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </Link>
                <button
                  onClick={handleLogout}
                  className="hidden px-3 text-[13px] font-medium text-stone-400 transition-colors duration-300 hover:text-ink lg:block"
                >
                  خروج
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                className="hidden border-r border-stone-200 pr-4 text-[13px] font-medium text-stone-600 transition-colors duration-300 hover:text-ink lg:block"
              >
                ورود / ثبت‌نام
              </Link>
            )}

            {/* دکمه منوی موبایل */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-10 w-10 items-center justify-center text-stone-800 transition-colors duration-300 hover:text-ink lg:hidden"
              aria-label="منو"
              aria-expanded={menuOpen}
            >
              {menuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.4} stroke="currentColor" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.4} stroke="currentColor" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* منوی موبایل */}
      {menuOpen && (
        <div className="border-t border-stone-200 bg-white lg:hidden">
          <nav className="container-sadra flex flex-col py-3">
            {user && (
              <div className="mb-2 flex items-center gap-3 border border-stone-100 bg-ivory/60 p-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-base font-bold text-white">
                  {user.fullName?.trim()?.charAt(0) || '؟'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-ink">{user.fullName}</span>
                  <span className="block text-xs text-stone-500" dir="ltr">{user.phone}</span>
                </span>
                <Link
                  to="/account"
                  onClick={() => setMenuOpen(false)}
                  className="shrink-0 text-xs font-semibold text-ink"
                >
                  حساب من
                </Link>
              </div>
            )}

            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 border-b border-stone-100 px-1 py-3.5 text-sm font-medium tracking-wide last:border-0 ${
                    isActive ? 'text-ink' : 'text-stone-500'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.6}
                      stroke="currentColor"
                      className={`h-5 w-5 shrink-0 ${isActive ? 'text-ink' : 'text-stone-400'}`}
                    >
                      {item.icon}
                    </svg>
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}

            <div className="mt-3 border-t border-stone-200 pt-2">
              {user ? (
                <>
                  {user.role === 'admin' && (
                    <Link
                      to="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-1 py-3.5 text-sm font-semibold text-gold-dark"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="h-5 w-5 shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                      پنل مدیریت
                    </Link>
                  )}
                  <Link
                    to="/account"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-1 py-3.5 text-sm font-medium text-stone-600"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="h-5 w-5 shrink-0 text-stone-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                    حساب کاربری
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-1 py-3.5 text-right text-sm font-medium text-red-600"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="h-5 w-5 shrink-0 text-red-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                    </svg>
                    خروج از حساب
                  </button>
                </>
              ) : (
                <Link
                  to="/auth"
                  onClick={() => setMenuOpen(false)}
                  className="mt-2 flex items-center justify-center border border-ink px-4 py-3.5 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-white"
                >
                  ورود / ثبت‌نام
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
