import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { ProductReviewsData } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import { Stars, StarInput } from './Stars';
import { faNum, formatDateTime } from '../lib/format';
import { InlineLoading } from './ui/Loading';

export default function ProductReviews({ slug }: { slug: string }) {
  const { user } = useAuth();
  const location = useLocation();

  const [data, setData] = useState<ProductReviewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ProductReviewsData>(`/products/${slug}/reviews`);
      setData(res.data ?? null);
      if (res.data?.myReview) {
        setRating(res.data.myReview.rating);
        setComment(res.data.myReview.comment);
      } else {
        setRating(5);
        setComment('');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در دریافت نظرات');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSavedMsg(null);
    if (comment.trim().length < 3) {
      setFormError('متن نظر را کامل‌تر بنویسید.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/products/${slug}/reviews`, { rating, comment: comment.trim() });
      setSavedMsg('نظر شما ثبت شد. سپاسگزاریم!');
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'خطا در ثبت نظر');
    } finally {
      setSubmitting(false);
    }
  };

  const summary = data?.summary;
  const total = summary?.count ?? 0;
  const maxDist = Math.max(1, ...Object.values(summary?.distribution ?? {}).map((v) => Number(v)));

  return (
    <section className="mt-16 border-t border-stone-100 pt-12" id="reviews">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="section-title !text-xl">نظرات کاربران</h2>
        {summary && summary.count > 0 && (
          <div className="flex items-center gap-2">
            <Stars value={summary.avg} size="sm" />
            <span className="text-sm font-bold">{faNum(summary.avg.toFixed(1))}</span>
            <span className="text-xs text-stone-500">از {faNum(summary.count)} نظر</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="mt-6">
          <InlineLoading />
        </div>
      ) : error ? (
        <p className="mt-6 bg-red-50 p-4 text-sm text-red-600">{error}</p>
      ) : (
        <div className="mt-6 grid gap-8 lg:grid-cols-3">
          {/* ستون خلاصه و فرم */}
          <div className="space-y-6 lg:col-span-1">
            {/* خلاصه هوش مصنوعی */}
            <div className="border border-stone-100 bg-ivory p-5">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[10px] font-black text-white">
                  AI
                </span>
                <h3 className="text-sm font-bold">خلاصه کیفیت از نظر کاربران</h3>
              </div>
              <p className="mt-3 text-xs leading-6 text-stone-600">
                {total === 0
                  ? 'هنوز نظری برای این محصول ثبت نشده است. اولین نفری باشید که تجربه‌ی خود را مینویسد.'
                  : summary?.text || 'خلاصه‌ای برای نمایش وجود ندارد.'}
              </p>
            </div>

            {/* توزیع امتیازها */}
            {summary && total > 0 && (
              <div className="border border-stone-100 p-5">
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-black">{faNum(summary.avg.toFixed(1))}</span>
                  <div>
                    <Stars value={summary.avg} size="md" />
                    <p className="mt-0.5 text-[11px] text-stone-500">
                      {faNum(total)} نظر · {faNum(summary.verifiedCount)} خرید تاییدشده
                    </p>
                  </div>
                </div>
                <div className="mt-4 space-y-1.5">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = Number(summary.distribution[String(star)] ?? 0);
                    return (
                      <div key={star} className="flex items-center gap-2 text-[11px] text-stone-500">
                        <span className="w-3">{faNum(star)}</span>
                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3 text-gold" aria-hidden="true">
                          <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.78L10 14.77 4.8 17.5l.99-5.78-4.21-4.1 5.82-.85L10 1.5z" />
                        </svg>
                        <div className="h-1 flex-1 overflow-hidden bg-stone-200">
                          <div className="h-full bg-ink" style={{ width: `${(count / maxDist) * 100}%` }} />
                        </div>
                        <span className="w-6 text-left">{faNum(count)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* فرم ثبت نظر */}
            {user ? (
              <form onSubmit={handleSubmit} className="border border-stone-100 p-5">
                <h3 className="text-sm font-bold">{data?.myReview ? 'ویرایش نظر شما' : 'ثبت نظر شما'}</h3>
                <div className="mt-3">
                  <label className="label">امتیاز شما</label>
                  <StarInput value={rating} onChange={setRating} />
                </div>
                <div className="mt-4">
                  <label className="label" htmlFor="review-comment">نظر شما</label>
                  <textarea
                    id="review-comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    maxLength={1000}
                    placeholder="تجربه‌ی خود از کیفیت، سایز و دوخت این محصول را بنویسید..."
                    className="input min-h-[100px] resize-y"
                  />
                </div>

                {formError && <p className="mt-3 bg-red-50 p-3 text-xs text-red-600">{formError}</p>}
                {savedMsg && <p className="mt-3 bg-green-50 p-3 text-xs text-green-700">{savedMsg}</p>}

                <button type="submit" disabled={submitting} className="btn-primary mt-4 w-full !py-3 text-sm">
                  {submitting ? 'در حال ثبت...' : data?.myReview ? 'به‌روزرسانی نظر' : 'ثبت نظر'}
                </button>
              </form>
            ) : (
              <div className="border border-stone-100 p-5 text-center">
                <p className="text-sm text-stone-600">برای ثبت نظر و امتیاز ابتدا وارد حساب شوید.</p>
                <Link to={`/auth?redirect=${encodeURIComponent(location.pathname)}`} className="btn-primary mt-4 w-full !py-3 text-sm">
                  ورود / ثبت‌نام
                </Link>
              </div>
            )}
          </div>

          {/* لیست نظرات */}
          <div className="lg:col-span-2">
            {!data || data.reviews.length === 0 ? (
              <div className="border border-dashed border-stone-200 p-10 text-center">
                <p className="text-sm text-stone-500">هنوز نظری برای این محصول ثبت نشده است.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.reviews.map((review) => (
                  <article key={review.id} className="border border-stone-100 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-xs font-bold text-white">
                          {review.userName.trim().charAt(0) || '؟'}
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold">{review.userName}</span>
                            {review.verified ? (
                              <span className="badge bg-green-50 text-[10px] text-green-700">خریداری کرده ✓</span>
                            ) : (
                              <span className="badge bg-stone-100 text-[10px] text-stone-500">خریداری نکرده</span>
                            )}
                          </div>
                          <span className="text-[11px] text-stone-400">{formatDateTime(review.createdAt)}</span>
                        </div>
                      </div>
                      <Stars value={review.rating} size="sm" />
                    </div>
                    <p className="mt-3 text-sm leading-7 text-stone-700">{review.comment}</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
