import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { api, toImageUrl } from '../../lib/api';
import { AdminProductListItem } from '../../lib/types';
import { formatPrice, faNum } from '../../lib/format';
import { InlineLoading } from '../../components/ui/Loading';

export default function AdminProducts() {
  const [products, setProducts] = useState<AdminProductListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ products: AdminProductListItem[]; total: number }>(
        `/admin/products?limit=100&search=${encodeURIComponent(q)}`
      );
      setProducts(res.data?.products ?? []);
      setTotal(res.data?.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در دریافت محصولات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load('');
  }, [load]);

  const handleDelete = async (p: AdminProductListItem) => {
    if (!window.confirm(`حذف «${p.name}»؟`)) return;
    setBusyId(p.id);
    try {
      await api.delete(`/admin/products/${p.id}`);
      await load(search);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'خطا در حذف محصول');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <Helmet>
        <title>مدیریت محصولات | چولفیش کت</title>
      </Helmet>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">محصولات</h1>
          <p className="mt-1 text-sm text-stone-500">{faNum(total)} محصول</p>
        </div>
        <Link to="/admin/products/new" className="btn-primary">
          + محصول جدید
        </Link>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load(search);
        }}
        className="mt-5 flex gap-2"
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجوی نام یا اسلاگ..."
          className="input"
        />
        <button type="submit" className="btn-outline whitespace-nowrap">
          جستجو
        </button>
      </form>

      {loading ? (
        <div className="mt-8">
          <InlineLoading />
        </div>
      ) : error ? (
        <p className="mt-6 bg-red-50 p-4 text-sm text-red-600">{error}</p>
      ) : (
        <div className="card mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-right text-sm">
            <thead className="bg-stone-50 text-xs text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">محصول</th>
                <th className="px-4 py-3 font-medium">پارچه / مدل</th>
                <th className="px-4 py-3 font-medium">قیمت</th>
                <th className="px-4 py-3 font-medium">موجودی</th>
                <th className="px-4 py-3 font-medium">وضعیت</th>
                <th className="px-4 py-3 font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t border-stone-100">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={toImageUrl(p.main_image)}
                        alt={p.name}
                        className="h-12 w-10 object-cover"
                      />
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-stone-400" dir="ltr">{p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {p.fabric_name}
                    <br />
                    <span className="text-xs text-stone-400">{p.fit_name}</span>
                  </td>
                  <td className="px-4 py-3">{formatPrice(p.price)}</td>
                  <td className="px-4 py-3">{faNum(Number(p.total_stock))}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${p.is_active ? 'bg-green-50 text-green-700' : 'bg-stone-100 text-stone-500'}`}>
                      {p.is_active ? 'فعال' : 'غیرفعال'}
                    </span>
                    {p.is_featured ? <span className="badge mr-1 border-stone-300 text-stone-600">ویژه</span> : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link to={`/admin/products/${p.id}`} className="text-sm text-blue-600 hover:underline">
                        ویرایش
                      </Link>
                      <button
                        type="button"
                        disabled={busyId === p.id}
                        onClick={() => handleDelete(p)}
                        className="text-sm text-red-600 hover:underline disabled:opacity-50"
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-stone-400">
                    محصولی یافت نشد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
