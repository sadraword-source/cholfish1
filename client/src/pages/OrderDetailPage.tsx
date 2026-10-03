import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { api, toImageUrl } from '../lib/api';
import { OrderDetail } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import { formatPriceWithUnit, formatDateTime, faNum } from '../lib/format';
import { ORDER_TIMELINE, PAYMENT_STATUS_LABELS } from '../lib/constants';
import { InlineLoading } from '../components/ui/Loading';
import { ErrorState } from '../components/ui/ErrorState';
import BankCard from '../components/BankCard';
import { SITE_URL } from '../lib/seo';

export default function OrderDetailPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const { user, isLoading } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !orderNumber) return;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get<OrderDetail>(`/orders/${orderNumber}`);
        setOrder(res.data ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'خطا در دریافت سفارش');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, orderNumber]);

  if (isLoading) {
    return (
      <div className="container-sadra py-16">
        <InlineLoading />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/auth?redirect=/account/orders/${orderNumber}`} replace />;
  }

  if (loading) {
    return (
      <div className="container-sadra py-16">
        <InlineLoading />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container-sadra py-16">
        <ErrorState
          title="سفارش یافت نشد"
          message={error ?? 'چنین سفارشی وجود ندارد.'}
          action={
            <Link to="/account/orders" className="btn-outline">
              بازگشت به سفارش‌ها
            </Link>
          }
        />
      </div>
    );
  }

  const currentStep = order.currentStep;

  return (
    <div className="container-sadra py-10">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href={`${SITE_URL}/account/orders`} />

        <title>جزئیات سفارش {order.orderNumber} | چولفیش کت</title>
      </Helmet>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black" dir="ltr">
            {order.orderNumber}
          </h1>
          <p className="mt-1.5 text-sm text-stone-500">ثبت‌شده در {formatDateTime(order.createdAt)}</p>
        </div>
        <span className="badge bg-black px-4 py-2 !text-sm text-white">{order.statusLabel}</span>
      </div>

      {/* Timeline */}
      <div className="card p-6">
        <h2 className="text-sm font-bold">وضعیت سفارش</h2>
        <div className="mt-6 flex items-center">
          {ORDER_TIMELINE.map((step, idx) => {
            const isDone = idx + 1 <= currentStep;
            const isCurrent = idx + 1 === currentStep;
            return (
              <div key={step.key} className={`flex-1 ${idx > 0 ? 'rtl:flex-row' : ''}`}>
                <div className="flex items-center">
                  {idx > 0 && (
                    <div className={`h-0.5 flex-1 ${isDone ? 'bg-black' : 'bg-stone-200'}`} />
                  )}
                  <div
                    className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white ${
                      isDone ? 'bg-black' : 'bg-stone-200 text-stone-400'
                    } ${isCurrent ? 'ring-4 ring-black/10' : ''}`}
                  >
                    {isDone ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-5 w-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      <span className="text-xs font-bold">{faNum(idx + 1)}</span>
                    )}
                  </div>
                </div>
                <p className={`mt-2 text-xs font-medium ${idx + 1 <= currentStep ? 'text-black' : 'text-stone-400'}`}>
                  {step.label}
                </p>
              </div>
            );
          })}
        </div>
        <p className="mt-6 bg-ivory p-3 text-xs leading-6 text-stone-600">
          سفارش شما در وضعیت <strong>{order.statusLabel}</strong> قرار دارد. {order.paymentStatus === 'paid' ? 'پرداخت انجام شده است.' : 'پرداخت آنلاین به‌زودی فعال می‌شود.'}
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* محصولات */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <h2 className="text-sm font-bold">محصولات سفارش</h2>
            <div className="mt-4 space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-4">
                  {item.image_url && (
                    <img src={toImageUrl(item.image_url)} alt={item.product_name} className="h-20 w-16 object-cover" />
                  )}
                  <div className="flex-1">
                    <Link
                      to={item.product_slug ? `/product/${item.product_slug}` : '#'}
                      className="text-sm font-bold hover:underline"
                    >
                      {item.product_name}
                    </Link>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-stone-500">
                      <span className="badge bg-stone-100 text-stone-700">سایز {item.size_label}</span>
                      <span>تعداد: {faNum(item.quantity)}</span>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-extrabold">{formatPriceWithUnit(item.total_price)}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      {formatPriceWithUnit(item.unit_price)} × {faNum(item.quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {order.note && (
              <p className="mt-4 bg-ivory p-3 text-sm text-stone-600">
                <strong>یادداشت:</strong> {order.note}
              </p>
            )}
          </div>
        </div>

        {/* خلاصه و آدرس */}
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-sm font-bold">مبالغ</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-stone-500">جمع کالاها</dt>
                <dd className="font-semibold">{formatPriceWithUnit(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-stone-500">هزینه ارسال</dt>
                <dd className="font-semibold">{formatPriceWithUnit(order.shippingCost)}</dd>
              </div>
              <div className="flex justify-between border-t border-stone-100 pt-3">
                <dt className="font-bold">مبلغ کل</dt>
                <dd className="font-extrabold">{formatPriceWithUnit(order.total)}</dd>
              </div>
            </dl>
          </div>

          <div className="card p-6">
            <h2 className="text-sm font-bold">پرداخت</h2>
            <p className="mt-3 text-sm text-stone-600">
              وضعیت: <strong>{PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}</strong>
            </p>

            {order.paymentStatus === 'paid' && (
              <p className="mt-3 bg-green-50 p-3 text-xs font-medium text-green-700">
                سفارش شما با موفقیت ثبت شد و پرداخت تایید شده است.
              </p>
            )}
            {order.paymentStatus === 'rejected' && (
              <p className="mt-3 bg-red-50 p-3 text-xs font-medium text-red-700">
                سفارش شما پذیرفته نشد. لطفاً رسید صحیح را دوباره ارسال کنید.
              </p>
            )}
            {order.paymentStatus === 'receipt_uploaded' && (
              <p className="mt-3 bg-amber-50 p-3 text-xs font-medium text-amber-700">
                رسید شما در انتظار تایید است.
              </p>
            )}

            {order.paymentStatus !== 'paid' && (
              <BankCard cardNumber={order.cardNumber} holderName={order.cardHolder} className="mt-3" />
            )}

            {order.receiptImageUrl && (
              <a href={toImageUrl(order.receiptImageUrl)} target="_blank" rel="noreferrer" className="mt-3 block">
                <img
                  src={toImageUrl(order.receiptImageUrl)}
                  alt="رسید پرداخت"
                  className="w-full border border-stone-200 object-contain"
                />
              </a>
            )}

            {order.paymentStatus !== 'paid' && (
              <Link to={`/payment/${order.orderNumber}`} className="btn-primary mt-4 w-full !py-3 text-center">
                {order.receiptImageUrl ? 'مشاهده / ارسال مجدد رسید' : 'پرداخت و بارگذاری رسید'}
              </Link>
            )}
          </div>

          {order.address && (
            <div className="card p-6">
              <h2 className="text-sm font-bold">آدرس تحویل</h2>
              <div className="mt-3 text-sm leading-6 text-stone-600">
                <p className="font-semibold text-stone-800">{order.address.full_name}</p>
                <p dir="ltr" className="text-left">{order.address.phone}</p>
                <p className="mt-1">
                  {order.address.province}، {order.address.city}
                </p>
                <p>{order.address.address_line}</p>
                <p className="mt-1 text-xs text-stone-500">
                  کد پستی: <span dir="ltr">{order.address.postal_code}</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}