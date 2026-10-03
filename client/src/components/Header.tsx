import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { SITE_NAME } from '../lib/constants';
import { faNum } from '../lib/format';
import BackButton from './BackButton';

const NAV_ITEMS = [
  { to: '/', label: 'خانه' },
  { to: '/shop', label: 'فروشگاه' },
  { to: '/stylist', label: 'استایلیست AI' },
  { to: '/articles', label: 'مقالات' },
  { to: '/size-guide', label: 'راهنمای سایز' },
  { to: '/about', label: 'درباره ما' },
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
                CHOLFISH CAT
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
          <nav className="container-sadra flex flex-col py-2">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `border-b border-stone-100 py-3.5 text-sm font-medium tracking-wide last:border-0 ${
                    isActive ? 'text-ink' : 'text-stone-500'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}

            <div className="mt-3 border-t border-stone-200 pt-4">
              {user ? (
                <>
                  {user.role === 'admin' && (
                    <Link
                      to="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="block py-3 text-sm font-semibold text-gold-dark"
                    >
                      پنل مدیریت
                    </Link>
                  )}
                  <Link
                    to="/account"
                    onClick={() => setMenuOpen(false)}
                    className="block py-3 text-sm font-medium text-stone-600"
                  >
                    حساب کاربری ({user.fullName})
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full py-3 text-right text-sm font-medium text-red-600"
                  >
                    خروج از حساب
                  </button>
                </>
              ) : (
                <Link
                  to="/auth"
                  onClick={() => setMenuOpen(false)}
                  className="block py-3 text-sm font-medium text-stone-600"
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
