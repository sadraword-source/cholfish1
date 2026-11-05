import { Link } from 'react-router-dom';
import { SITE_TAGLINE } from '../lib/constants';

const QUICK_LINKS = [
  { to: '/shop', label: 'فروشگاه' },
  { to: '/articles', label: 'مقالات' },
  { to: '/size-guide', label: 'راهنمای انتخاب سایز' },
  { to: '/stylist', label: 'استایلیست AI' },
  { to: '/about', label: 'درباره ما' },
];

const ACCOUNT_LINKS = [
  { to: '/account', label: 'پروفایل' },
  { to: '/account/orders', label: 'سفارش‌های من' },
  { to: '/cart', label: 'سبد خرید' },
];

export default function Footer() {
  return (
    <footer className="bg-ink text-stone-400">
      <div className="container-sadra">
        {/* بالا */}
        <div className="grid gap-12 py-16 sm:py-20 lg:grid-cols-[1.6fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <img src="/logo-mark.png" alt="CAVERO" className="h-10 w-10 object-cover" />
              <span className="flex flex-col leading-none">
                <span className="text-lg font-black tracking-tight text-white">CAVERO</span>
                <span className="mt-1 text-[9px] font-medium uppercase tracking-[0.3em] text-white/40">
                  CAVERO
                </span>
              </span>
            </div>
            <p className="mt-6 max-w-sm text-sm leading-7 text-stone-400">
              {SITE_TAGLINE}. CAVERO با تمرکز بر کت‌وشلوارهای اسلیم‌فیت، پارچه ویسکوز و دوخت
              ایتالیایی، استایل رسمی را برای نسل جدید بازتعریف می‌کند.
            </p>
          </div>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white">دسترسی سریع</h3>
            <ul className="mt-6 space-y-3.5 text-sm">
              {QUICK_LINKS.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="text-stone-400 transition-colors duration-300 hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white">حساب کاربری</h3>
            <ul className="mt-6 space-y-3.5 text-sm">
              {ACCOUNT_LINKS.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="text-stone-400 transition-colors duration-300 hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* پایین */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 py-7 text-[11px] tracking-wide text-stone-500 sm:flex-row">
          <span>© ۱۴۰۴ CAVERO — تمامی حقوق محفوظ است.</span>
          <span className="tracking-[0.2em]">فروشگاه اینترنتی کت‌وشلوار مردانه</span>
        </div>
      </div>
    </footer>
  );
}
