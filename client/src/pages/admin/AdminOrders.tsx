import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { api, toImageUrl } from '../../lib/api';
import { AdminOrderListItem } from '../../lib/types';
import { formatPriceWithUnit, formatDateTime, faNum } from '../../lib/format';
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '../../lib/constants';
import { InlineLoading } from '../../components/ui/Loading';

const STATUSES = ['registered', 'preparing', 'shipped_to_post', 'in_transit', 'delivered'];

export default function AdminOrders() {
  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (s: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ orders: AdminOrderListItem[]; total: number }>(
        `/admin/orders?limit=100&status=${encodeURIComponent(s)}`
      );
      setOrders(res.data?.orders ?? []);
      setTotal(res.data?.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در دریافت سفارش‌ها');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load('');
  }, [load]);

  return (
    <div>
      <Helmet>
        <title>مدیریت سفارش‌ها | چولفیش کت</title>
      </Helmet>

      <h1 className="text-2xl font-black">سفارش‌ها</h1>
      <p className="mt-1 text-sm text-stone-500">{faNum(total)} سفارش</p>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => { setStatus(''); load(''); }}
          className={`badge px-3 py-1.5 ${status === '' ? 'bg-black text-white' : 'bg-stone-100 text-stone-600'}`}
        >
          همه
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => { setStatus(s); load(s); }}
            className={`badge px-3 py-1.5 ${status === s ? 'bg-black text-white' : 'bg-stone-100 text-stone-600'}`}
          >
            {ORDER_STATUS_LABELS[s]?.label ?? s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-8"><InlineLoading /></div>
      ) : error ? (
        <p className="mt-6 bg-red-50 p-4 text-sm text-red-600">{error}</p>
      ) : (
        <div className="card mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-right text-sm">
            <thead className="bg-stone-50 text-xs text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">شماره سفارش</th>
                <th className="px-4 py-3 font-medium">مشتری</th>
                <th className="px-4 py-3 font-medium">اقلام</th>
                <th className="px-4 py-3 font-medium">مبلغ</th>
                <th className="px-4 py-3 font-medium">وضعیت</th>
                <th className="px-4 py-3 font-medium">پرداخت</th>
                <th className="px-4 py-3 font-medium">تاریخ</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-stone-100">
                  <td className="px-4 py-3">
                    <Link to={`/admin/orders/${o.id}`} className="font-bold tracking-wide hover:underline" dir="ltr">
                      {o.order_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {o.full_name}
                    <span className="block text-xs text-stone-400" dir="ltr">{o.phone}</span>
                  </td>
                  <td className="px-4 py-3">{faNum(Number(o.item_count))}</td>
                  <td className="px-4 py-3">{formatPriceWithUnit(o.total)}</td>
                  <td className="px-4 py-3">
                    <span className="badge border-stone-300 text-stone-600">
                      {ORDER_STATUS_LABELS[o.status]?.label ?? o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-500">
                    <span>{PAYMENT_STATUS_LABELS[o.payment_status] ?? o.payment_status}</span>
                    {o.receipt_image_url && (
                      <a
                        href={toImageUrl(o.receipt_image_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block text-[11px] text-ink underline underline-offset-2"
                      >
                        مشاهده رسید
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-500">{formatDateTime(o.created_at)}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-stone-400">سفارشی یافت نشد.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
