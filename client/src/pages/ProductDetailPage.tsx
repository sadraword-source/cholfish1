import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, toImageUrl } from '../lib/api';
import { ProductDetail, ProductSize } from '../lib/types';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatPriceWithUnit, faNum } from '../lib/format';
import Seo from '../components/Seo';
import { breadcrumbSchema, productSchema } from '../lib/schema';
import { truncate } from '../lib/seo';
import { InlineLoading } from '../components/ui/Loading';
import { ErrorState } from '../components/ui/ErrorState';
import ProductCard from '../components/ui/ProductCard';
import ProductReviews from '../components/ProductReviews';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { user } = useAuth();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      setMessage(null);
      setErrorMessage(null);
      setSelectedSize(null);
      setActiveImage(0);
      setQuantity(1);
      try {
        const res = await api.get<ProductDetail>(`/products/${slug}`);
        setProduct(res.data ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'خطا در دریافت محصول');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="container-sadra pt-10">
        <div className="grid animate-pulse gap-12 lg:grid-cols-2">
          <div className="aspect-[4/5] w-full bg-stone-100" />
          <div className="space-y-4 pt-2">
            <div className="h-4 w-1/3 bg-stone-100" />
            <div className="h-8 w-2/3 bg-stone-100" />
            <div className="h-6 w-1/4 bg-stone-100" />
            <div className="h-24 w-full bg-stone-100" />
            <div className="h-14 w-full bg-stone-100" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container-sadra py-16">
        <ErrorState
          title="محصول یافت نشد"
          message={error ?? 'این محصول در دسترس نیست.'}
          action={
            <Link to="/shop" className="btn-primary">
              بازگشت به فروشگاه
            </Link>
          }
        />
      </div>
    );
  }

  const images = product.images.length > 0 ? product.images : [{ url: product.mainImage, alt: product.name, imageType: 'main' as const, id: 0, sortOrder: 0 }];

  const handleAddToCart = async () => {
    if (!user) {
      navigate(`/auth?redirect=/product/${product.slug}`);
      return;
    }
    if (!selectedSize) {
      setErrorMessage('لطفاً ابتدا سایز خود را انتخاب کنید.');
      return;
    }
    setErrorMessage(null);
    setAdding(true);
    try {
      await addItem(product.id, selectedSize.id, quantity);
      setMessage('با موفقیت به سبد خرید اضافه شد.');
      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'خطا در افزودن به سبد خرید');
    } finally {
      setAdding(false);
    }
  };

  const discount = product.oldPrice
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0;

  const productPath = `/product/${product.slug}`;
  const seoTitle =
    product.metaTitle ??
    `${product.name} | کت و شلوار مردانه ${product.fabric.name} — چولفیش کت`;
  const seoDescription = truncate(
    product.metaDescription ||
      `${product.name} از جنس ${product.fabric.name} با برش ${product.fit.name} و ${product.stitchingType}. ${
        product.availableSizes.length > 0
          ? `سایزهای موجود: ${product.availableSizes.map((s) => s.label).join('، ')}.`
          : 'در حال حاضر ناموجود.'
      } قیمت ${formatPriceWithUnit(product.price)} — خرید آنلاین از چولفیش کت.`
  );

  return (
    <div className="pb-20">
      <Seo
        title={seoTitle}
        description={seoDescription}
        path={productPath}
        image={product.mainImage}
        type="product"
        keywords={[
          product.name,
          `کت و شلوار مردانه ${product.color}`,
          `کت و شلوار مردانه ${product.fit.name}`,
          `کت و شلوار ${product.fabric.name}`,
          'کت و شلوار مردانه',
        ]}
        jsonLd={[
          productSchema(product, productPath),
          breadcrumbSchema([
            { name: 'خانه', path: '/' },
            { name: 'فروشگاه کت و شلوار مردانه', path: '/shop' },
            { name: product.name, path: productPath },
          ]),
        ]}
      />

      <div className="container-sadra pt-8">
        {/* بردکرامب */}
        <nav aria-label="مسیر صفحه" className="mb-8 flex flex-wrap items-center gap-2.5 text-[11px] tracking-wide text-stone-400">
          <Link to="/" className="transition-colors duration-300 hover:text-ink">خانه</Link>
          <span aria-hidden="true">/</span>
          <Link to="/shop" className="transition-colors duration-300 hover:text-ink">کت و شلوار مردانه</Link>
          <span aria-hidden="true">/</span>
          <span className="text-stone-600">{product.name}</span>
        </nav>

        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* گالری */}
          <div>
            <div className="overflow-hidden bg-stone-100">
              <img
                src={toImageUrl(images[activeImage].url)}
                alt={`${product.name} — ${images[activeImage].alt || 'نمای محصول'}`}
                width={800}
                height={1000}
                className="aspect-[4/5] w-full object-cover"
              />
            </div>
            {images.length > 1 && (
              <div className="mt-4 grid grid-cols-5 gap-3">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    aria-label={`نمایش تصویر ${faNum(idx + 1)} از ${faNum(images.length)}`}
                    onClick={() => setActiveImage(idx)}
                    className={`overflow-hidden border bg-stone-100 transition-colors duration-300 ${
                      idx === activeImage ? 'border-ink opacity-100' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={toImageUrl(img.url)}
                      alt={`${product.name} — ${img.alt || 'نمای دیگر'}`}
                      width={160}
                      height={160}
                      loading="lazy"
                      className="aspect-square w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* اطلاعات */}
          <div className="lg:pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge border-ink bg-ink text-white">{product.fit.name}</span>
              <span className="badge">{product.stitchingType}</span>
              <span className="badge">رنگ: {product.color}</span>
            </div>

            <h1 className="mt-6 text-3xl font-black leading-snug tracking-tight sm:text-4xl">{product.name}</h1>

            <div className="mt-6 flex items-baseline gap-3">
              <span className="text-2xl font-black">{formatPriceWithUnit(product.price)}</span>
              {product.oldPrice && (
                <>
                  <span className="text-sm text-stone-400 line-through">{formatPriceWithUnit(product.oldPrice)}</span>
                  <span className="text-xs font-semibold text-red-600">{faNum(discount)}٪ تخفیف</span>
                </>
              )}
            </div>

            {/* جنس پارچه -> مقاله */}
            <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 border-y border-stone-200 py-5 text-sm">
              <span className="text-stone-400">جنس پارچه:</span>
              <Link
                to={`/shop?fabric=${product.fabric.slug}`}
                className="font-semibold text-ink underline decoration-stone-300 underline-offset-4 transition-colors duration-300 hover:decoration-ink"
              >
                {product.fabric.name}
              </Link>
              {product.fabricArticles && product.fabricArticles.length > 0 && (
                <Link
                  to={`/articles/${product.fabricArticles[0].slug}`}
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-stone-500 underline decoration-stone-300 underline-offset-4 transition-colors duration-300 hover:text-ink hover:decoration-ink"
                >
                  شناخت پارچه {product.fabric.name}
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5 -scale-x-100">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </Link>
              )}
              {product.fabricArticles.length === 0 && (
                <Link to="/articles/viscose-fabric" className="text-[12px] font-medium text-stone-500 underline decoration-stone-300 underline-offset-4 transition-colors duration-300 hover:text-ink">
                  شناخت پارچه ویسکوز
                </Link>
              )}
            </div>

            {/* انتخاب سایز */}
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-semibold">انتخاب سایز</label>
                <Link to="/size-guide" className="text-xs font-semibold text-stone-500 underline underline-offset-4 hover:text-black">
                  راهنمای سایز
                </Link>
              </div>

              {product.availableSizes.length > 0 ? (
                <div className="flex flex-wrap gap-2.5">
                  {product.availableSizes.map((size) => (
                    <button
                      key={size.id}
                      onClick={() => setSelectedSize(size)}
                      className={`h-12 w-14 border text-sm font-bold transition-colors duration-300 ${
                        selectedSize?.id === size.id
                          ? 'border-ink bg-ink text-white'
                          : 'border-stone-200 text-stone-600 hover:border-ink hover:text-ink'
                      }`}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="border border-stone-200 bg-ivory p-4 text-sm text-red-600">متأسفانه این محصول در حال حاضر ناموجود است.</p>
              )}

              {product.outOfStockSizes.length > 0 && (
                <p className="mt-3 text-xs text-stone-400">
                  سایزهای {product.outOfStockSizes.map((s) => s.label).join('، ')} ناموجودند.
                </p>
              )}
            </div>

            {/* تعداد */}
            <div className="mt-8">
              <label className="text-sm font-semibold">تعداد</label>
              <div className="mt-3 inline-flex items-center border border-stone-200">
                <button
                  onClick={() => setQuantity((q) => Math.min(q + 1, 99))}
                  className="flex h-11 w-11 items-center justify-center text-lg text-stone-500 transition-colors duration-200 hover:text-ink"
                >
                  +
                </button>
                <span className="w-12 text-center text-sm font-bold">{faNum(quantity)}</span>
                <button
                  onClick={() => setQuantity((q) => Math.max(q - 1, 1))}
                  className="flex h-11 w-11 items-center justify-center text-lg text-stone-500 transition-colors duration-200 hover:text-ink"
                >
                  −
                </button>
              </div>
            </div>

            {/* دکمه افزودن */}
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleAddToCart}
                disabled={adding || product.availableSizes.length === 0}
                className="btn-primary flex-1"
              >
                {adding ? 'در حال افزودن...' : 'افزودن به سبد خرید'}
              </button>
              <Link to="/cart" className="btn-outline">
                مشاهده سبد خرید
              </Link>
            </div>

            {message && <p className="mt-4 border border-stone-200 bg-ivory p-4 text-sm text-green-700">{message}</p>}
            {errorMessage && <p className="mt-4 border border-stone-200 bg-ivory p-4 text-sm text-red-600">{errorMessage}</p>}

            {!user && (
              <p className="mt-5 text-xs text-stone-400">
                برای افزودن به سبد خرید ابتدا وارد حساب کاربری شوید.
              </p>
            )}
          </div>
        </div>

        {/* توضیحات */}
        <section className="mt-20 grid gap-14 border-t border-stone-200 pt-14 lg:grid-cols-3 lg:gap-16">
          <div className="lg:col-span-2">
            <p className="eyebrow">جزئیات</p>
            <h2 className="mt-3 text-xl font-black">توضیحات محصول</h2>
            <div className="mt-6 whitespace-pre-line text-sm leading-8 text-stone-600">
              {product.description}
            </div>
          </div>
          <div>
            <p className="eyebrow">مشخصات</p>
            <h2 className="mt-3 text-xl font-black">در یک نگاه</h2>
            <dl className="mt-6 divide-y divide-stone-200 border-y border-stone-200 text-sm">
              <div className="flex justify-between gap-4 py-3.5">
                <dt className="text-stone-400">جنس پارچه</dt>
                <dd className="font-semibold">
                  <Link to={`/shop?fabric=${product.fabric.slug}`} className="transition-colors duration-300 hover:text-stone-600">
                    {product.fabric.name}
                  </Link>
                </dd>
              </div>
              <div className="flex justify-between gap-4 py-3.5">
                <dt className="text-stone-400">مدل</dt>
                <dd className="font-semibold">
                  <Link to={`/shop?fit=${product.fit.slug}`} className="transition-colors duration-300 hover:text-stone-600">
                    {product.fit.name}
                  </Link>
                </dd>
              </div>
              <div className="flex justify-between gap-4 py-3.5">
                <dt className="text-stone-400">نوع دوخت</dt>
                <dd className="font-semibold">{product.stitchingType}</dd>
              </div>
              <div className="flex justify-between gap-4 py-3.5">
                <dt className="text-stone-400">رنگ</dt>
                <dd className="font-semibold">{product.color}</dd>
              </div>
              <div className="flex justify-between gap-4 py-3.5">
                <dt className="text-stone-400">سایزهای موجود</dt>
                <dd className="font-semibold">{product.availableSizes.map((s) => s.label).join('، ')}</dd>
              </div>
            </dl>

            <h3 className="mt-8 text-[12px] font-semibold uppercase tracking-[0.2em] text-stone-400">راهنمای مرتبط</h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <Link to="/size-guide" className="text-stone-500 underline decoration-stone-200 underline-offset-4 transition-colors duration-300 hover:text-ink hover:decoration-ink">
                  راهنمای انتخاب سایز کت و شلوار
                </Link>
              </li>
              <li>
                <Link to={`/shop?fabric=${product.fabric.slug}`} className="text-stone-500 underline decoration-stone-200 underline-offset-4 transition-colors duration-300 hover:text-ink hover:decoration-ink">
                  همه کت و شلوارهای مردانه با پارچه {product.fabric.name}
                </Link>
              </li>
              <li>
                <Link to={`/shop?fit=${product.fit.slug}`} className="text-stone-500 underline decoration-stone-200 underline-offset-4 transition-colors duration-300 hover:text-ink hover:decoration-ink">
                  همه مدل‌های {product.fit.name}
                </Link>
              </li>
              <li>
                <Link to="/articles/suit-care-guide" className="text-stone-500 underline decoration-stone-200 underline-offset-4 transition-colors duration-300 hover:text-ink hover:decoration-ink">
                  نگهداری و مراقبت از کت و شلوار
                </Link>
              </li>
            </ul>
          </div>
        </section>

        {/* نظرات کاربران */}
        <ProductReviews slug={product.slug} />
      </div>
    </div>
  );
}