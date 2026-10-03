import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { SizeGuideRow } from '../lib/types';
import { faNum } from '../lib/format';
import Seo from '../components/Seo';
import { breadcrumbSchema } from '../lib/schema';
import { InlineLoading } from '../components/ui/Loading';
import { ErrorState } from '../components/ui/ErrorState';

export default function SizeGuidePage() {
  const { user } = useAuth();
  const [sizes, setSizes] = useState<SizeGuideRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<SizeGuideRow[]>('/products/sizes');
        setSizes(res.data ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'خطا');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="container-sadra py-16">
        <InlineLoading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-sadra py-16">
        <ErrorState message={error} />
      </div>
    );
  }

  return (
    <div className="pb-20">
      <Seo
        title="راهنمای سایز کت و شلوار مردانه | جدول سایزبندی — چولفیش کت"
        description="جدول سایزبندی کت و شلوار مردانه (۴۴ تا ۵۸) و روش اندازه‌گیری دور سینه و دور کمر. با ابزار پیشنهاد سایز چولفیش کت، اندازه مناسب خود را دقیق پیدا کنید."
        path="/size-guide"
        keywords={['راهنمای سایز کت و شلوار مردانه', 'جدول سایز کت و شلوار', 'سایز کت و شلوار مردانه']}
        jsonLd={breadcrumbSchema([
          { name: 'خانه', path: '/' },
          { name: 'راهنمای سایز کت و شلوار مردانه', path: '/size-guide' },
        ])}
      />

      <div className="border-b border-stone-200 bg-ivory py-14 sm:py-16">
        <div className="container-sadra">
          <nav aria-label="مسیر صفحه" className="mb-5 flex items-center gap-2.5 text-[11px] tracking-wide text-stone-400">
            <Link to="/" className="transition-colors duration-300 hover:text-ink">خانه</Link>
            <span aria-hidden="true">/</span>
            <span className="text-stone-600">راهنمای سایز</span>
          </nav>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">راهنمای سایز کت و شلوار مردانه</h1>
          <p className="mt-3 text-sm leading-7 text-stone-500">جدول استاندارد سایز اروپایی برای کت و شلوار مردانه</p>
        </div>
      </div>

      <div className="container-sadra mt-12">
        {/* جدول سایز */}
        <div className="overflow-x-auto border border-stone-200">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="bg-ink text-white">
                <th className="px-5 py-3.5 text-right font-semibold">سایز</th>
                <th className="px-5 py-3.5 text-right font-semibold">دور سینه (سانتی‌متر)</th>
                <th className="px-5 py-3.5 text-right font-semibold">دور کمر (سانتی‌متر)</th>
                <th className="px-5 py-3.5 text-right font-semibold">سایز ایرانی تقریبی</th>
              </tr>
            </thead>
            <tbody>
              {sizes.map((row, idx) => (
                <tr key={row.code} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-stone-50/50'}`}>
                  <td className="px-5 py-3 font-bold">{faNum(row.label)}</td>
                  <td className="px-5 py-3">
                    {faNum(row.minChest)} – {faNum(row.maxChest)}
                  </td>
                  <td className="px-5 py-3">
                    {faNum(row.minWaist)} – {faNum(row.maxWaist)}
                  </td>
                  <td className="px-5 py-3 text-stone-500">
                    {faNum(Math.round((row.minChest + row.maxChest) / 2 / 5))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ابزار پیشنهاد سایز */}
        <section className="mt-16 bg-ink px-8 py-16 text-center text-white sm:px-12 sm:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/45">ابزار هوشمند</p>
          <h2 className="mx-auto mt-4 max-w-lg text-2xl font-black tracking-tight sm:text-3xl">نمی‌دانید چه سایزی هستید؟</h2>
          <p className="mx-auto mt-4 max-w-md text-sm leading-8 text-stone-400">
            اندازه‌های بدن خود را وارد کنید تا الگوریتم چولفیش کت سایز پیشنهادی را دقیق حساب کند.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            {user ? (
              <Link to="/account/measurements" className="btn-light">
                پیشنهاد سایز من
              </Link>
            ) : (
              <Link to="/auth?redirect=/account/measurements" className="btn-light">
                ثبت اندازه‌های بدن
              </Link>
            )}
            <Link to="/shop" className="btn-on-dark">
              مشاهده محصولات
            </Link>
          </div>
        </section>

        {/* راهنمای اندازه‌گیری */}
        <section className="mt-12">
          <h2 className="text-2xl font-black">چطور اندازه‌گیری کنیم؟</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: 'دور سینه', desc: 'متر را صاف و افقی دور پهن‌ترین بخش سینه ببندید و عدد را بخوانید.' },
              { title: 'دور کمر', desc: 'روی خط ناف، بدون سفت کردن متر اندازه بگیرید.' },
              { title: 'قد آستین', desc: 'از مرکز پشت گردن تا مچ دست در امتداد بازو.' },
              { title: 'عرض شانه', desc: 'از انتهای یک شانه، پشت گردن، تا انتهای شانه دیگر.' },
            ].map((item) => (
              <div key={item.title} className="border border-stone-100 p-6">
                <h3 className="text-base font-bold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}