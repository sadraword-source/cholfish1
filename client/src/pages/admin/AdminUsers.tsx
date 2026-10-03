import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { api } from '../../lib/api';
import { AdminUserRow } from '../../lib/types';
import { formatPrice, formatDate, faNum } from '../../lib/format';
import { InlineLoading } from '../../components/ui/Loading';
import { ErrorState } from '../../components/ui/ErrorState';

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<AdminUserRow[]>('/admin/users');
        setUsers(res.data ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'خطا در دریافت کاربران');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <InlineLoading text="در حال بارگذاری کاربران..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <Helmet>
        <title>کاربران | چولفیش کت</title>
      </Helmet>

      <h1 className="text-2xl font-black">کاربران</h1>
      <p className="mt-1 text-sm text-stone-500">{faNum(users.length)} کاربر</p>

      <div className="card mt-5 overflow-x-auto">
        <table className="w-full min-w-[680px] text-right text-sm">
          <thead className="bg-stone-50 text-xs text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">نام</th>
              <th className="px-4 py-3 font-medium">موبایل</th>
              <th className="px-4 py-3 font-medium">ایمیل</th>
              <th className="px-4 py-3 font-medium">نقش</th>
              <th className="px-4 py-3 font-medium">سفارش‌ها</th>
              <th className="px-4 py-3 font-medium">مجموع خرید</th>
              <th className="px-4 py-3 font-medium">عضویت</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-stone-100">
                <td className="px-4 py-3 font-medium">{u.full_name}</td>
                <td className="px-4 py-3" dir="ltr">{u.phone}</td>
                <td className="px-4 py-3 text-stone-500" dir="ltr">{u.email ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${u.role === 'admin' ? 'bg-black text-white' : 'bg-stone-100 text-stone-600'}`}>
                    {u.role === 'admin' ? 'مدیر' : 'کاربر'}
                  </span>
                </td>
                <td className="px-4 py-3">{faNum(Number(u.order_count))}</td>
                <td className="px-4 py-3">{formatPrice(Number(u.total_spent))}</td>
                <td className="px-4 py-3 text-xs text-stone-500">{formatDate(u.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
