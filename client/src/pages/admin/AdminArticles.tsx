import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { api } from '../../lib/api';
import { AdminArticleListItem } from '../../lib/types';
import { formatDate, faNum } from '../../lib/format';
import { InlineLoading } from '../../components/ui/Loading';

export default function AdminArticles() {
  const [articles, setArticles] = useState<AdminArticleListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ articles: AdminArticleListItem[]; total: number }>(
        `/admin/articles?limit=100&search=${encodeURIComponent(q)}`
      );
      setArticles(res.data?.articles ?? []);
      setTotal(res.data?.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در دریافت مقالات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load('');
  }, [load]);

  const handleDelete = async (a: AdminArticleListItem) => {
    if (!window.confirm(`حذف «${a.title}»؟`)) return;
    setBusyId(a.id);
    try {
      await api.delete(`/admin/articles/${a.id}`);
      await load(search);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'خطا در حذف مقاله');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <Helmet>
        <title>مدیریت مقالات | چولفیش کت</title>
      </Helmet>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">مقالات</h1>
          <p className="mt-1 text-sm text-stone-500">{faNum(total)} مقاله</p>
        </div>
        <Link to="/admin/articles/new" className="btn-primary">
          + مقاله جدید
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
          placeholder="جستجوی عنوان یا اسلاگ..."
          className="input"
        />
        <button type="submit" className="btn-outline whitespace-nowrap">جستجو</button>
      </form>

      {loading ? (
        <div className="mt-8"><InlineLoading /></div>
      ) : error ? (
        <p className="mt-6 bg-red-50 p-4 text-sm text-red-600">{error}</p>
      ) : (
        <div className="card mt-5 overflow-x-auto">
          <table className="w-full min-w-[680px] text-right text-sm">
            <thead className="bg-stone-50 text-xs text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">عنوان</th>
                <th className="px-4 py-3 font-medium">دسته</th>
                <th className="px-4 py-3 font-medium">پارچه</th>
                <th className="px-4 py-3 font-medium">وضعیت</th>
                <th className="px-4 py-3 font-medium">تاریخ</th>
                <th className="px-4 py-3 font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((a) => (
                <tr key={a.id} className="border-t border-stone-100">
                  <td className="px-4 py-3">
                    <p className="font-medium">{a.title}</p>
                    <p className="text-xs text-stone-400" dir="ltr">{a.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-stone-600">{a.category}</td>
                  <td className="px-4 py-3 text-stone-600">{a.fabric_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${a.is_published ? 'bg-green-50 text-green-700' : 'bg-stone-100 text-stone-500'}`}>
                      {a.is_published ? 'منتشرشده' : 'پیش‌نویس'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-500">{formatDate(a.published_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link to={`/admin/articles/${a.id}`} className="text-sm text-blue-600 hover:underline">ویرایش</Link>
                      <button
                        type="button"
                        disabled={busyId === a.id}
                        onClick={() => handleDelete(a)}
                        className="text-sm text-red-600 hover:underline disabled:opacity-50"
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {articles.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-stone-400">مقاله‌ای یافت نشد.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
