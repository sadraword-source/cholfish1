import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Fit, Product, SizeGuideRow } from '../lib/types';
import Seo from '../components/Seo';
import { breadcrumbSchema } from '../lib/schema';
import ProductCard from '../components/ui/ProductCard';
import { InlineLoading } from '../components/ui/Loading';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { faNum } from '../lib/format';
import { truncate } from '../lib/seo';

interface FiltersData {
  fabrics: { id: number; name: string; slug: string; description: string }[];
  fits: Fit[];
  sizes: SizeGuideRow[];
}

const SORTS = [
  { value: 'newest', label: 'جدیدترین' },
  { value: 'popular', label: 'محبوب‌ترین' },
  { value: 'price_asc', label: 'ارزان‌ترین' },
  { value: 'price_desc', label: 'گران‌ترین' },
];

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [filtersData, setFiltersData] = useState<FiltersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = searchParams.get('search') ?? '';
  const fabric = searchParams.get('fabric') ?? '';
  const fit = searchParams.get('fit') ?? '';
  const sort = searchParams.get('sort') ?? 'newest';

  useEffect(() => {
    (async () => {
      try {
        const filtersRes = await api.get<FiltersData>('/products/filters');
        setFiltersData(filtersRes.data ?? null);
      } catch {
        // فیلترها مسئله‌ساز نیستند
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ limit: '60' });
        if (search) params.set('search', search);
        if (fabric) params.set('fabric', fabric);
        if (fit) params.set('fit', fit);
        if (sort) params.set('sort', sort);

        const res = await api.get<{ products: Product[]; total: number }>(`/products?${params}`);
        setProducts(res.data?.products ?? []);
        setTotal(res.data?.total ?? 0);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'خطا در دریافت محصولات');
      } finally {
        setLoading(false);
      }
    })();
  }, [search, fabric, fit, sort]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (value.trim()) params.set('search', value.trim());
      else params.delete('search');
      setSearchParams(params, { replace: true });
    }, 400);
  };

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    setSearchParams(params, { replace: true });
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const activeFilterCount = useMemo(
    () => (fabric ? 1 : 0) + (fit ? 1 : 0) + (search ? 1 : 0),
    [fabric, fit, search]
  );

  const renderFilters = () => (
    <div className="space-y-7">
      {/* جستجو */}
      <div>
        <label className="label">جستجو</label>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="نام محصول..."
          className="input"
        />
      </div>

      {/* جنس پارچه */}
      {filtersData && filtersData.fabrics.length > 0 && (
        <div>
          <p className="eyebrow mb-3">جنس پارچه</p>
          <div className="space-y-0.5">
            {filtersData.fabrics.map((f) => (
              <label
                key={f.id}
                className={`flex cursor-pointer items-center gap-3 py-2 text-sm transition-colors duration-200 ${
                  fabric === f.slug ? 'text-ink' : 'text-stone-500 hover:text-ink'
                }`}
              >
                <input
                  type="radio"
                  name="fabric"
                  checked={fabric === f.slug}
                  onChange={() => setParam('fabric', fabric === f.slug ? '' : f.slug)}
                  className="h-3.5 w-3.5 accent-black"
                />
                {f.name}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* مدل */}
      {filtersData && filtersData.fits.length > 0 && (
        <div>
          <p className="eyebrow mb-3">مدل</p>
          <div className="space-y-0.5">
            {filtersData.fits.map((fitItem) => (
              <label
                key={fitItem.id}
                className={`flex cursor-pointer items-center gap-3 py-2 text-sm transition-colors duration-200 ${
                  fit === fitItem.slug ? 'text-ink' : 'text-stone-500 hover:text-ink'
                }`}
              >
                <input
                  type="radio"
                  name="fit"
                  checked={fit === fitItem.slug}
                  onChange={() => setParam('fit', fit === fitItem.slug ? '' : fitItem.slug)}
                  className="h-3.5 w-3.5 accent-black"
                />
                {fitItem.name}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* مرتب‌سازی */}
      <div>
        <p className="label">مرتب‌سازی</p>
        <select aria-label="مرتب‌سازی محصولات" value={sort} onChange={(e) => setParam('sort', e.target.value)} className="input">
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {activeFilterCount > 0 && (
        <button onClick={clearFilters} className="btn-outline w-full !py-2.5 text-sm">
          حذف فیلترها ({faNum(activeFilterCount)})
        </button>
      )}
    </div>
  );

  // عنوان و توضیح بر اساس فیلترهای فعال (برای جلوگیری از duplicate content)
  const activeFabricName = filtersData?.fabrics.find((f) => f.slug === fabric)?.name;
  const activeFitName = filtersData?.fits.find((f) => f.slug === fit)?.name;

  const pageTitle = activeFabricName
    ? `کت و شلوار مردانه ${activeFabricName} | خرید آنلاین — CAVERO`
    : activeFitName
      ? `کت و شلوار مردانه ${activeFitName} | خرید آنلاین — CAVERO`
      : 'خرید کت و شلوار مردانه | فروشگاه آنلاین — CAVERO';

  const pageDescription = truncate(
    activeFabricName
      ? `خرید کت و شلوار مردانه با پارچه ${activeFabricName} در مدل‌های اسلیم‌فیت و کلاسیک. قیمت مناسب، دوخت ایتالیایی و ارسال به سراسر ایران.`
      : activeFitName
        ? `کت و شلوار مردانه ${activeFitName} در رنگ‌های مشکی، سرمه‌ای و طوسی. خرید آنلاین با قیمت مناسب و ارسال سریع از CAVERO.`
        : 'خرید آنلاین کت و شلوار مردانه اسلیم‌فیت و کلاسیک با پارچه ویسکوز، ویسکوز-پلی‌استر و پشم-ویسکوز. مقایسه قیمت، راهنمای سایز و ارسال به سراسر ایران.',
    158
  );

  // صفحات فیلترشده نباید index شوند تا duplicate content ایجاد نشود
  const hasFilterParams = Boolean(fabric || fit || search || (sort && sort !== 'newest'));

  const h1Text = activeFabricName
    ? `کت و شلوار مردانه ${activeFabricName}`
    : activeFitName
      ? `کت و شلوار مردانه ${activeFitName}`
      : 'خرید کت و شلوار مردانه';

  return (
    <div className="pb-20">
      <Seo
        title={pageTitle}
        description={pageDescription}
        path="/shop"
        noindex={hasFilterParams}
        keywords={[
          'خرید کت و شلوار مردانه',
          'قیمت کت و شلوار مردانه',
          'کت و شلوار مردانه شیک',
          'کت و شلوار مردانه slim fit',
        ]}
        jsonLd={breadcrumbSchema([
          { name: 'خانه', path: '/' },
          { name: 'فروشگاه کت و شلوار مردانه', path: '/shop' },
        ])}
      />

      <div className="border-b border-stone-200 bg-ivory py-14 sm:py-16">
        <div className="container-sadra">
          <nav aria-label="مسیر صفحه" className="mb-5 flex items-center gap-2.5 text-[11px] tracking-wide text-stone-400">
            <Link to="/" className="transition-colors duration-300 hover:text-ink">
              خانه
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-stone-600">فروشگاه</span>
          </nav>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{h1Text}</h1>
          <p className="mt-3 text-sm leading-7 text-stone-500">
            کت و شلوارهای مردانه CAVERO — مینیمال، لوکس، رسمی
          </p>
        </div>
      </div>

      <div className="container-sadra mt-8">
        {/* هدر موبایل */}
        <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
          <button onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)} className="btn-outline !py-2.5 text-sm">
            {mobileFiltersOpen ? 'بستن فیلترها' : 'فیلترها'}
            {activeFilterCount > 0 && <span className="badge ml-1 bg-black text-white">{faNum(activeFilterCount)}</span>}
          </button>
          <select aria-label="مرتب‌سازی محصولات" value={sort} onChange={(e) => setParam('sort', e.target.value)} className="input !w-40 !py-2.5 text-sm">
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-10 lg:grid-cols-[240px_1fr] lg:gap-12">
          {/* سایدبار دسکتاپ */}
          <aside className="hidden lg:block">
            <div className="sticky top-28 border-t border-stone-200 pt-7">{renderFilters()}</div>
          </aside>

          {/* فیلترهای موبایل */}
          {mobileFiltersOpen && (
            <div className="lg:hidden">
              <div className="rounded-2xl border border-stone-200 bg-white p-6">{renderFilters()}</div>
            </div>
          )}

          {/* محصولات */}
          <div>
            <div className="mb-7 flex items-center justify-between border-b border-stone-200 pb-4 text-[12px] tracking-wide text-stone-400">
              <span>{faNum(total)} محصول</span>
              <span className="hidden lg:block">مرتب‌سازی بر اساس انتخاب شما</span>
            </div>

            <h2 className="sr-only">فهرست کت و شلوارهای مردانه</h2>
            {loading ? (
              <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-x-6 lg:grid-cols-3 lg:gap-x-7" aria-busy="true" aria-label="در حال بارگذاری محصولات">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[4/5] bg-stone-100" />
                    <div className="space-y-3 pt-4">
                      <div className="h-2.5 w-1/3 bg-stone-100" />
                      <div className="h-3 w-3/4 bg-stone-100" />
                      <div className="h-3 w-1/2 bg-stone-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <ErrorState message={error} />
            ) : products.length === 0 ? (
              <EmptyState
                title="محصولی پیدا نشد"
                description="فیلترها یا جستجوی خود را تغییر دهید و دوباره امتحان کنید."
                action={
                  <button onClick={clearFilters} className="btn-outline">
                    حذف فیلترها
                  </button>
                }
              />
            ) : (
              <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-x-6 lg:grid-cols-3 lg:gap-x-7">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}

            {/* لینک داخلی به دسته‌بندی‌ها و راهنماها */}
            <section className="mt-16 border-t border-stone-200 pt-8">
              <h2 className="text-lg font-bold text-ink">دسته‌بندی‌های کت و شلوار مردانه</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-500">
                بسته به فصل، مناسبت و اندام، انتخاب جنس و برش متفاوت است. برای مشاهده سریع‌تر می‌توانید
                بر اساس پارچه یا مدل فیلتر کنید:
              </p>
              <ul className="mt-5 flex flex-wrap gap-2.5">
                {filtersData?.fabrics.map((f) => (
                  <li key={`fabric-${f.id}`}>
                    <Link
                      to={`/shop?fabric=${f.slug}`}
                      className="badge transition-colors duration-300 hover:border-ink hover:text-ink"
                    >
                      کت و شلوار {f.name}
                    </Link>
                  </li>
                ))}
                {filtersData?.fits.map((f) => (
                  <li key={`fit-${f.id}`}>
                    <Link
                      to={`/shop?fit=${f.slug}`}
                      className="badge transition-colors duration-300 hover:border-ink hover:text-ink"
                    >
                      کت و شلوار {f.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link to="/size-guide" className="badge transition-colors duration-300 hover:border-ink hover:text-ink">
                    راهنمای انتخاب سایز
                  </Link>
                </li>
                <li>
                  <Link to="/articles/how-to-choose-suit" className="badge transition-colors duration-300 hover:border-ink hover:text-ink">
                    راهنمای خرید کت و شلوار
                  </Link>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}