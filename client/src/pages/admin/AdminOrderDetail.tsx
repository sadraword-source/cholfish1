import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { api, toImageUrl } from '../../lib/api';
import { AdminOrderDetailData } from '../../lib/types';
import { formatPriceWithUnit, formatDateTime, faNum } from '../../lib/format';
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '../../lib/constants';
import { InlineLoading } from '../../components/ui/Loading';
import { ErrorState } from '../../components/ui/ErrorState';

const STATUSES = ['registered', 'preparing', 'shipped_to_post', 'in_transit', 'delivered'];

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<AdminOrderDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<AdminOrderDetailData>(`/admin/orders/${id}`);
      setData(res.data ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در دریافت سفارش');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (status: string) => {
    if (!data) return;
    setSaving(true);
    try {
      await api.patch(`/admin/orders/${id}/status`, { status });
      setData({ ...data, order: { ...data.order, status } });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'خطا در تغییر وضعیت');
    } finally {
      setSaving(false);
    }
  };

  const updatePaymentStatus = async (paymentStatus: 'paid' | 'rejected') => {
    if (!data) return;
    setSaving(true);
    try {
      await api.patch(`/admin/orders/${id}/payment`, { paymentStatus });
      setData({ ...data, order: { ...data.order, payment_status: paymentStatus } });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'خطا در تغییر وضعیت پرداخت');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <InlineLoading text="در حال بارگذاری سفارش..." />;
  if (error || !data) return <ErrorState message={error ?? 'سفارش یافت نشد.'} />;

  const { order, items, address } = data;

  return (
    <div>
      <Helmet>
        <title>سفارش {order.order_number} | CAVERO</title>
      </Helmet>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black" dir="ltr">{order.order_number}</h1>
          <p className="mt-1 text-xs text-stone-500">{formatDateTime(order.created_at)}</p>
        </div>
        <Link to="/admin/orders" className="text-sm text-stone-500 hover:text-black">← همه سفارش‌ها</Link>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h2 className="font-bold">اقلام سفارش</h2>
          <div className="mt-4 space-y-3">
            {items.map((it) => (
              <div key={it.id} className="flex items-center gap-3 border-b border-stone-100 pb-3 last:border-0">
                {it.image_url ? (
                  <img src={toImageUrl(it.image_url)} alt={it.product_name} className="h-14 w-12 object-cover" />
                ) : (
                  <div className="h-14 w-12 bg-stone-100" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium">{it.product_name}</p>
                  <p className="text-xs text-stone-400">سایز {it.size_label} × {faNum(it.quantity)}</p>
                </div>
                <span className="text-sm font-bold">{formatPriceWithUnit(it.total_price)}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-1.5 border-t border-stone-100 pt-4 text-sm">
            <div className="flex justify-between text-stone-500">
              <span>جمع کالاها</span>
              <span>{formatPriceWithUnit(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-stone-500">
              <span>هزینه ارسال</span>
              <span>{formatPriceWithUnit(order.shipping_cost)}</span>
            </div>
            <div className="flex justify-between font-black">
              <span>مجموع</span>
              <span>{formatPriceWithUnit(order.total)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="font-bold">وضعیت</h2>
            <select
              className="input mt-3"
              value={order.status}
              disabled={saving}
              onChange={(e) => updateStatus(e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{ORDER_STATUS_LABELS[s]?.label ?? s}</option>
              ))}
            </select>
            <p className="mt-2 text-xs text-stone-400">با انتخاب، وضعیت ذخیره می‌شود.</p>
          </div>

          <div className="card p-5">
            <h2 className="font-bold">پرداخت و رسید</h2>
            <p className="mt-2 text-sm text-stone-600">
              وضعیت پرداخت:{' '}
              <span className="font-medium text-stone-800">
                {PAYMENT_STATUS_LABELS[order.payment_status] ?? order.payment_status}
              </span>
            </p>

            {order.receipt_image_url ? (
              <a
                href={toImageUrl(order.receipt_image_url)}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block"
              >
                <img
                  src={toImageUrl(order.receipt_image_url)}
                  alt="رسید پرداخت"
                  className="w-full border border-stone-200 object-contain"
                />
                <span className="mt-2 block text-center text-xs text-stone-500">برای مشاهده بزرگ‌تر کلیک کنید</span>
              </a>
            ) : (
              <p className="mt-3 text-sm text-stone-400">مشتری هنوز رسیدی بارگذاری نکرده است.</p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={saving || !order.receipt_image_url || order.payment_status === 'paid'}
                onClick={() => updatePaymentStatus('paid')}
                className="bg-green-600 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                تایید رسید
              </button>
              <button
                type="button"
                disabled={saving || !order.receipt_image_url || order.payment_status === 'rejected'}
                onClick={() => updatePaymentStatus('rejected')}
                className="bg-red-50 px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                رد رسید
              </button>
            </div>
            <p className="mt-2 text-xs leading-5 text-stone-400">
              با تایید، برای مشتری «سفارش شما با موفقیت ثبت شد» و با رد، «سفارش شما پذیرفته نشد» نمایش داده می‌شود.
            </p>
          </div>

          <div className="card p-5">
            <h2 className="font-bold">مشتری</h2>
            <p className="mt-2 text-sm">{order.full_name}</p>
            <p className="text-xs text-stone-500" dir="ltr">{order.phone}</p>
          </div>

          <div className="card p-5">
            <h2 className="font-bold">آدرس</h2>
            {address ? (
              <div className="mt-2 space-y-1 text-sm text-stone-600">
                <p>{address.full_name}</p>
                <p className="text-xs" dir="ltr">{address.phone}</p>
                <p>{address.province}، {address.city}</p>
                <p>{address.address_line}</p>
                <p className="text-xs">کد پستی: <span dir="ltr">{address.postal_code}</span></p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-stone-400">آدرسی ثبت نشده است.</p>
            )}
          </div>

          {order.note && (
            <div className="card p-5">
              <h2 className="font-bold">یادداشت مشتری</h2>
              <p className="mt-2 text-sm text-stone-600">{order.note}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
