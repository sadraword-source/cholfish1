import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { api } from '../lib/api';
import { User } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import { faNum, formatDate } from '../lib/format';
import { InlineLoading } from '../components/ui/Loading';
import { ErrorState } from '../components/ui/ErrorState';
import { SITE_URL } from '../lib/seo';

export default function ProfilePage() {
  const { user, isLoading, refresh } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFullName(user?.fullName ?? '');
    setEmail(user?.email ?? '');
  }, [user]);

  if (isLoading) {
    return (
      <div className="container-sadra py-16">
        <InlineLoading />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth?redirect=/account" replace />;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      await api.put('/users/profile', { fullName: fullName.trim(), email: email.trim() });
      setMessage('اطلاعات با موفقیت ذخیره شد.');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ذخیره اطلاعات');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-sadra py-10">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href={`${SITE_URL}/account`} />

        <title>حساب کاربری | چولفیش کت</title>
        <meta name="description" content="حساب کاربری چولفیش کت" />
      </Helmet>

      <div className="mb-8">
        <h1 className="text-3xl font-black">حساب کاربری</h1>
        <p className="mt-2 text-sm text-stone-500">خوش آمدید، {user.fullName}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-4">
        {/* سایدبار */}
        <aside className="lg:col-span-1">
          <nav className="card overflow-hidden">
            {[
              { to: '/account', label: 'پروفایل', active: true },
              { to: '/account/measurements', label: 'اندازه‌ها و پیشنهاد سایز', active: false },
              { to: '/account/addresses', label: 'آدرس‌ها', active: false },
              { to: '/account/orders', label: 'سفارش‌های من', active: false },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`block border-b border-stone-50 px-5 py-3.5 text-sm font-medium transition-colors ${
                  item.active ? 'bg-black text-white' : 'text-stone-700 hover:bg-stone-50'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* محتوا */}
        <div className="lg:col-span-3">
          <div className="card p-6 sm:p-8">
            <h2 className="text-base font-bold">اطلاعات شخصی</h2>

            <div className="mt-6 grid gap-2 bg-ivory p-4 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-2 py-1">
                <span className="text-stone-500">شماره موبایل</span>
                <span className="font-semibold" dir="ltr">{user.phone}</span>
              </div>
              <div className="flex justify-between gap-2 py-1">
                <span className="text-stone-500">سایز پیشنهادی</span>
                <span className="font-semibold">
                  {user.suggestedSize ? `سایز ${faNum(user.suggestedSize)}` : 'ثبت نشده'}
                </span>
              </div>
              <div className="flex justify-between gap-2 py-1 sm:col-span-2">
                <span className="text-stone-500">تاریخ عضویت</span>
                <span className="font-semibold">{user.createdAt ? formatDate(user.createdAt) : '—'}</span>
              </div>
            </div>

            <form onSubmit={handleSave} className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">نام و نام خانوادگی</label>
                <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="نام کامل" />
              </div>
              <div>
                <label className="label">ایمیل (اختیاری)</label>
                <input className="input" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
              </div>

              {error && <p className="bg-red-50 p-3 text-sm text-red-600 sm:col-span-2">{error}</p>}
              {message && <p className="bg-green-50 p-3 text-sm text-green-700 sm:col-span-2">{message}</p>}

              <div className="sm:col-span-2">
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}