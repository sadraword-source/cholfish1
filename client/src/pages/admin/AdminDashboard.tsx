import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { api } from '../../lib/api';
import { AdminStats } from '../../lib/types';
import { formatPriceWithUnit, formatDateTime, faNum } from '../../lib/format';
import { ORDER_STATUS_LABELS } from '../../lib/constants';
import { InlineLoading } from '../../components/ui/Loading';
import { ErrorState } from '../../components/ui/ErrorState';

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<AdminStats>('/admin/stats');
        setStats(res.data ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'خطا در دریافت اطلاعات');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <InlineLoading text="در حال بارگذاری داشبورد..." />;
  if (error || !stats) return <ErrorState message={error ?? 'اطلاعاتی یافت نشد.'} />;

  const cards = [
    { label: 'محصولات', value: faNum(stats.counts.products), hint: `${faNum(stats.counts.activeProducts)} فعال`, to: '/admin/products' },
    { label: 'مقالات', value: faNum(stats.counts.articles), hint: 'منتشرشده و پیش‌نویس', to: '/admin/articles' },
    { label: 'سفارش‌ها', value: faNum(stats.counts.orders), hint: 'کل سفارش‌ها', to: '/admin/orders' },
    { label: 'کاربران', value: faNum(stats.counts.users), hint: 'ثبت‌نام‌شده', to: '/admin/users' },
  ];

  return (
    <div>
      <Helmet>
        <title>داشبورد مدیریت | CAVERO</title>
      </Helmet>

      <h1 className="text-2xl font-black">داشبورد</h1>
      <p className="mt-1 text-sm text-stone-500">نمای کلی فروشگاه</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="card p-5 transition-colors duration-300 hover:border-ink">
            <p className="text-sm text-stone-500">{c.label}</p>
            <p className="mt-2 text-2xl font-black">{c.value}</p>
            <p className="mt-1 text-xs text-stone-400">{c.hint}</p>
          </Link>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <p className="text-sm text-stone-500">مجموع فروش</p>
          <p className="mt-2 text-2xl font-black">{formatPriceWithUnit(stats.revenue)}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-stone-500">وضعیت سفارش‌ها</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {stats.byStatus.length === 0 && <span className="text-xs text-stone-400">سفارشی ثبت نشده است.</span>}
            {stats.byStatus.map((s) => (
              <span key={s.status} className="badge bg-stone-100 text-stone-700">
                {ORDER_STATUS_LABELS[s.status]?.label ?? s.status}: {faNum(Number(s.count))}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">آخرین سفارش‌ها</h2>
          <Link to="/admin/orders" className="text-sm text-stone-500 hover:text-black">
            همه سفارش‌ها
          </Link>
        </div>
        <div className="card overflow-hidden">
          {stats.recentOrders.length === 0 ? (
            <p className="p-6 text-center text-sm text-stone-400">سفارشی ثبت نشده است.</p>
          ) : (
            <table className="w-full text-right text-sm">
              <thead className="bg-stone-50 text-xs text-stone-500">
                <tr>
                  <th className="px-4 py-3 font-medium">شماره</th>
                  <th className="px-4 py-3 font-medium">مشتری</th>
                  <th className="px-4 py-3 font-medium">مبلغ</th>
                  <th className="px-4 py-3 font-medium">وضعیت</th>
                  <th className="px-4 py-3 font-medium">تاریخ</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((o) => (
                  <tr key={o.id} className="border-t border-stone-100">
                    <td className="px-4 py-3">
                      <Link to={`/admin/orders/${o.id}`} className="font-bold tracking-wide hover:underline" dir="ltr">
                        {o.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{o.full_name}</td>
                    <td className="px-4 py-3">{formatPriceWithUnit(o.total)}</td>
                    <td className="px-4 py-3">
                      <span className="badge border-stone-300 text-stone-600">
                        {ORDER_STATUS_LABELS[o.status]?.label ?? o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-500">{formatDateTime(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
