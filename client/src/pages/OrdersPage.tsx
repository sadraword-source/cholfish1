import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { api } from '../lib/api';
import { OrderSummary } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import { formatPriceWithUnit, formatDateTime, faNum } from '../lib/format';
import { ORDER_STATUS_LABELS } from '../lib/constants';
import { InlineLoading } from '../components/ui/Loading';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { SITE_URL } from '../lib/seo';

export default function OrdersPage() {
  const { user, isLoading } = useAuth();
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get<OrderSummary[]>('/orders');
        setOrders(res.data ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'خطا در دریافت سفارش‌ها');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (isLoading) {
    return (
      <div className="container-sadra py-16">
        <InlineLoading />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth?redirect=/account/orders" replace />;
  }

  return (
    <div className="container-sadra py-10">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href={`${SITE_URL}/account/orders`} />

        <title>سفارش‌های من | چولفیش کت</title>
        <meta name="description" content="لیست سفارش‌های شما در چولفیش کت" />
      </Helmet>

      <div className="mb-8">
        <h1 className="text-3xl font-black">سفارش‌های من</h1>
        <p className="mt-2 text-sm text-stone-500">پیگیری و مشاهده سفارش‌های قبلی</p>
      </div>

      {loading ? (
        <InlineLoading />
      ) : error ? (
        <ErrorState message={error} />
      ) : orders && orders.length === 0 ? (
        <EmptyState
          title="هنوز سفارشی ثبت نکرده‌اید"
          description="اولین سفارش شما در چولفیش کت منتظر است."
          action={
            <Link to="/shop" className="btn-primary">
              شروع خرید
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {(orders ?? []).map((order) => (
            <Link
              key={order.id}
              to={`/account/orders/${order.orderNumber}`}
              className="card flex flex-col gap-4 p-5 transition-colors duration-300 hover:border-ink sm:flex-row sm:items-center"
            >
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-bold tracking-wide text-stone-900" dir="ltr">
                    {order.orderNumber}
                  </span>
                  <span className="badge bg-black text-white">{faNum(order.itemCount)} کالا</span>
                </div>
                <p className="mt-1.5 text-xs text-stone-500">{formatDateTime(order.createdAt)}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-extrabold">{formatPriceWithUnit(order.total)}</span>
                <span className={`badge ${order.status === 'delivered' ? 'border-green-200 text-green-700' : 'border-stone-300 text-stone-600'}`}>
                  {ORDER_STATUS_LABELS[order.status]?.label ?? order.status}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 -scale-x-100 text-stone-300">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}