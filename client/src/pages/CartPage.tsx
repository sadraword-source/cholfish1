import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useCart } from '../context/CartContext';
import { toImageUrl } from '../lib/api';
import { formatPriceWithUnit, faNum } from '../lib/format';
import { SHIPPING_COST } from '../lib/constants';
import { EmptyState } from '../components/ui/EmptyState';
import { InlineLoading } from '../components/ui/Loading';
import { SITE_URL } from '../lib/seo';

export default function CartPage() {
  const { cart, isLoading, updateQuantity, removeItem, clear } = useCart();

  if (isLoading) {
    return (
      <div className="container-sadra py-16">
        <InlineLoading text="در حال بارگذاری سبد خرید..." />
      </div>
    );
  }

  const items = cart?.items ?? [];
  const subtotal = cart?.subtotal ?? 0;

  return (
    <div className="pb-20">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href={`${SITE_URL}/cart`} />

        <title>سبد خرید | CAVERO</title>
        <meta name="description" content="سبد خرید فروشگاه CAVERO" />
      </Helmet>

      <div className="border-b border-stone-100 bg-ivory py-14">
        <div className="container-sadra">
          <h1 className="text-3xl font-black">سبد خرید</h1>
          <p className="mt-2 text-sm text-stone-500">مرور و مدیریت محصولات انتخاب‌شده</p>
        </div>
      </div>

      <div className="container-sadra mt-8">
        {items.length === 0 ? (
          <EmptyState
            title="سبد خرید شما خالی است"
            description="هنوز محصولی به سبد اضافه نشده. کت‌وشلوارهای CAVERO منتظر شما هستند."
            action={
              <Link to="/shop" className="btn-primary">
                مشاهده محصولات
              </Link>
            }
          />
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* آیتم‌ها */}
            <div className="space-y-4 lg:col-span-2">
              {items.map((item) => (
                <div key={item.id} className="card flex gap-4 p-4">
                  <Link to={`/product/${item.productSlug}`} className="shrink-0">
                    <img src={toImageUrl(item.imageUrl)} alt={item.productName} className="h-28 w-24 object-cover" />
                  </Link>
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <Link to={`/product/${item.productSlug}`} className="text-sm font-bold hover:underline">
                        {item.productName}
                      </Link>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-red-50 hover:text-red-500"
                        aria-label="حذف از سبد"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                      <span className="badge bg-stone-100 text-stone-700">سایز {item.sizeLabel}</span>
                      <span>رنگ: {item.color}</span>
                    </div>

                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                      <div className="inline-flex items-center rounded-xl border border-stone-200">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="flex h-8 w-8 items-center justify-center text-stone-600 hover:bg-stone-50"
                        >
                          +
                        </button>
                        <span className="w-9 text-center text-sm font-bold">{faNum(item.quantity)}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="flex h-8 w-8 items-center justify-center text-stone-600 hover:bg-stone-50"
                        >
                          −
                        </button>
                      </div>
                      <span className="text-sm font-extrabold">{formatPriceWithUnit(item.lineTotal)}</span>
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex justify-end">
                <button onClick={clear} className="text-sm text-stone-400 underline underline-offset-4 hover:text-red-500">
                  خالی کردن سبد خرید
                </button>
              </div>
            </div>

            {/* خلاصه */}
            <div className="h-fit space-y-4 lg:sticky lg:top-24">
              <div className="card p-6">
                <h2 className="text-base font-bold">خلاصه سفارش</h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-stone-500">جمع کالاها</dt>
                    <dd className="font-semibold">{formatPriceWithUnit(subtotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-stone-500">هزینه ارسال</dt>
                    <dd className="font-semibold">
                      {items.length > 0 ? formatPriceWithUnit(SHIPPING_COST) : '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between border-t border-stone-100 pt-3 text-base">
                    <dt className="font-bold">مبلغ قابل پرداخت</dt>
                    <dd className="font-extrabold">{formatPriceWithUnit(subtotal + (items.length > 0 ? SHIPPING_COST : 0))}</dd>
                  </div>
                </dl>
                <Link to="/checkout" className="btn-primary mt-6 w-full !py-3.5">
                  ثبت سفارش
                </Link>
                <p className="mt-3 text-center text-xs text-stone-500">
                  پرداخت آنلاین به‌زودی فعال می‌شود
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}