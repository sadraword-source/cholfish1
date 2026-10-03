import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, toImageUrl } from '../lib/api';
import { Article, Fabric, Product } from '../lib/types';
import Seo from '../components/Seo';
import { organizationSchema, websiteSchema } from '../lib/schema';
import ProductCard from '../components/ui/ProductCard';
import ArticleCard from '../components/ui/ArticleCard';

function CardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[4/5] bg-stone-100" />
      <div className="space-y-3 pt-4">
        <div className="h-2.5 w-1/3 bg-stone-100" />
        <div className="h-3 w-3/4 bg-stone-100" />
        <div className="h-3 w-1/2 bg-stone-100" />
      </div>
    </div>
  );
}

const PILLARS = [
  { title: 'پارچه ویسکوز', desc: 'نرم، سبک و رسمی' },
  { title: 'برش اسلیم‌فیت', desc: 'مدرن و متناسب' },
  { title: 'دوخت ایتالیایی', desc: 'دقت در جزئیات' },
  { title: 'ارسال سراسر ایران', desc: 'بسته‌بندی اختصاصی' },
];

const GUIDE_ITEMS = [
  {
    title: 'انتخاب سایز کت و شلوار',
    text: 'مهم‌ترین معیار، دور سینه است؛ نه فقط قد و وزن. کت باید روی شانه‌ها کاملاً بنشیند و آستین تا مچ برسد. با',
    linkLabel: 'راهنمای سایز چولفیش کت',
    to: '/size-guide',
    after: 'می‌توانید اندازه‌های بدن خود را وارد کنید و سایز پیشنهادی را ببینید.',
  },
  {
    title: 'اسلیم‌فیت یا کلاسیک؟',
    text: 'برش اسلیم‌فیت ظاهری کشیده و مدرن می‌سازد و برای اندام‌های متناسب مناسب است؛ برش کلاسیک راحتی بیشتری می‌دهد و برای شانه‌های پهن و استفاده طولانی‌مدت انتخاب بهتری است.',
    linkLabel: 'مدل‌های اسلیم‌فیت',
    to: '/shop?fit=slim-fit',
    after: 'را ببینید.',
  },
  {
    title: 'جنس پارچه مناسب',
    text: 'ویسکوز برای فصل‌های گرم و استایل رسمی، ترکیب ویسکوز-پلی‌استر برای استفاده روزمره، و پشم-ویسکوز برای زمستان و مجالس. جزئیات را در',
    linkLabel: 'مقایسه انواع پارچه کت و شلوار',
    to: '/articles/fabric-types-difference',
    after: 'بخوانید.',
  },
  {
    title: 'کت و شلوار رسمی و مجلسی',
    text: 'برای جلسات کاری، مشکی و سرمه‌ای مطمئن‌ترین انتخاب‌اند. برای مجالس و مراسم، رنگ‌های روشن و خاص ظاهری ویژه می‌سازند. مجموعه',
    linkLabel: 'کت و شلوارهای مردانه',
    to: '/shop',
    after: 'را ببینید.',
  },
  {
    title: 'کت و شلوار دامادی',
    text: 'برای روز دامادی، هماهنگی رنگ کت با پیراهن، کراوات و کفش اهمیت دارد. اصول ست کردن را در',
    linkLabel: 'راهنمای ترکیب پیراهن و اکسسوری',
    to: '/articles/shirt-accessories-guide',
    after: 'یاد بگیرید.',
  },
  {
    title: 'نگهداری از کت و شلوار',
    text: 'بعد از هر پوشیدن، کت را یک روز استراحت دهید، از چوب‌لباسی پهن استفاده کنید و خشکشویی را محدود کنید. جزئیات کامل در',
    linkLabel: 'راهنمای نگهداری کت و شلوار',
    to: '/articles/suit-care-guide',
    after: 'آمده است.',
  },
];

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[] | null>(null);
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [fabrics, setFabrics] = useState<Fabric[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [productsRes, articlesRes, fabricsRes] = await Promise.all([
          api.get<{ products: Product[] }>('/products?limit=8'),
          api.get<{ articles: Article[] }>('/articles?limit=3'),
          api.get<Fabric[]>('/products/fabrics'),
        ]);
        setFeaturedProducts(productsRes.data?.products ?? []);
        setArticles(articlesRes.data?.articles ?? []);
        setFabrics(fabricsRes.data ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'خطا در دریافت اطلاعات');
      }
    })();
  }, []);

  const heroImage = toImageUrl('/images/hero.svg');
  const productsLoading = featuredProducts === null && !error;
  const articlesLoading = articles === null && !error;
  const fabricsLoading = fabrics === null && !error;

  return (
    <div>
      <Seo
        title="کت و شلوار مردانه | خرید کت و شلوار شیک و رسمی — چولفیش کت"
        description="خرید کت و شلوار مردانه اسلیم‌فیت و کلاسیک با پارچه ویسکوز و دوخت ایتالیایی. کت و شلوار مردانه رسمی، مجلسی و دامادی در رنگ‌های مشکی، سرمه‌ای و طوسی، همراه با راهنمای سایز و ارسال به سراسر ایران."
        path="/"
        image="/logo.png"
        keywords={[
          'کت و شلوار مردانه',
          'خرید کت و شلوار مردانه',
          'کت و شلوار مردانه شیک',
          'کت و شلوار مردانه رسمی',
          'کت و شلوار مردانه مشکی',
          'کت و شلوار مردانه slim fit',
          'قیمت کت و شلوار مردانه',
          'کت و شلوار دامادی',
          'کت و شلوار مردانه مجلسی',
        ]}
        jsonLd={[organizationSchema(), websiteSchema()]}
      />

      {/* ===== Hero ===== */}
      <section className="relative flex min-h-[88vh] items-center overflow-hidden bg-ink">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="کت و شلوار مردانه اسلیم‌فیت چولفیش کت با پارچه ویسکوز و دوخت ایتالیایی"
            width={1600}
            height={1000}
            decoding="async"
            className="h-full w-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-ink via-ink/80 to-ink/25" />
        </div>

        <div className="relative container-sadra py-28 lg:py-36">
          <div className="max-w-2xl animate-fade-up">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/50">
              CHOLFISH CAT — کلکسیون رسمی
            </p>
            <h1 className="mt-7 text-4xl font-black leading-[1.15] tracking-tight text-white sm:text-5xl lg:text-[4rem] lg:leading-[1.1]">
              کت و شلوار مردانه، برای استایل رسمی و مدرن
            </h1>
            <p className="mt-7 max-w-xl text-sm leading-8 text-stone-300 sm:text-base sm:leading-9">
              کلکسیون کت و شلوار مردانه چولفیش کت با برش اسلیم‌فیت و کلاسیک، پارچه ویسکوز و دوخت
              ایتالیایی؛ انتخابی شیک برای جلسه‌های کاری، مجالس رسمی و استایل روزمره.
            </p>
            <div className="mt-11 flex flex-wrap items-center gap-3">
              <Link to="/shop" className="btn bg-white text-ink hover:bg-stone-200">
                مشاهده کلکسیون
              </Link>
              <Link to="/size-guide" className="btn-on-dark">
                راهنمای انتخاب سایز
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== ستون‌های اعتماد ===== */}
      <section className="border-b border-stone-200 bg-white">
        <div className="container-sadra">
          <div className="grid grid-cols-2 divide-stone-200 sm:grid-cols-4 sm:divide-x sm:divide-x-reverse">
            {PILLARS.map((item) => (
              <div key={item.title} className="px-2 py-7 text-center sm:px-6">
                <h3 className="text-[13px] font-bold text-ink">{item.title}</h3>
                <p className="mt-1.5 text-[11px] tracking-wide text-stone-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {error && (
        <div className="container-sadra pt-8">
          <p className="border border-stone-200 bg-ivory p-4 text-center text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* ===== محبوب‌ترین‌ها ===== */}
      <section className="section">
        <div className="container-sadra">
          <div className="mb-12 flex items-end justify-between gap-6 border-b border-stone-200 pb-7">
            <div>
              <p className="eyebrow">منتخب چولفیش کت</p>
              <h2 className="section-title mt-3">محبوب‌ترین کت و شلوارهای مردانه</h2>
              <p className="section-subtitle">پرفروش‌ترین مدل‌های اسلیم‌فیت و کلاسیک چولفیش کت</p>
            </div>
            <Link
              to="/shop"
              className="link-underline hidden shrink-0 pb-1 text-[13px] font-semibold text-ink sm:inline-flex"
              aria-label="مشاهده همه کت و شلوارهای مردانه"
            >
              مشاهده همه
            </Link>
          </div>

          {productsLoading ? (
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-7">
              {Array.from({ length: 4 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : featuredProducts && featuredProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-7">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-stone-400">محصولی یافت نشد.</p>
          )}

          <div className="mt-10 text-center sm:hidden">
            <Link to="/shop" className="btn-outline w-full">
              مشاهده همه محصولات
            </Link>
          </div>
        </div>
      </section>

      {/* ===== معرفی پارچه ===== */}
      <section className="section border-y border-stone-200 bg-ivory">
        <div className="container-sadra">
          <div className="mb-12 max-w-2xl">
            <p className="eyebrow">متریال</p>
            <h2 className="section-title mt-3">پارچه، قلب یک کت و شلوار مردانه</h2>
            <p className="section-subtitle">
              انتخاب هوشمندانه‌ی جنس پارچه، تفاوت یک کت و شلوار معمولی و یک استایل حرفه‌ای است
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-10">
            {fabricsLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[4/3] bg-stone-200/60" />
                    <div className="space-y-3 pt-5">
                      <div className="h-4 w-1/2 bg-stone-200/60" />
                      <div className="h-3 w-full bg-stone-200/60" />
                    </div>
                  </div>
                ))
              : (fabrics ?? []).map((fabric, index) => (
                  <Link key={fabric.id} to="/articles/viscose-fabric" className="group block">
                    <div className="relative aspect-[4/3] overflow-hidden bg-ink">
                      <div
                        className="h-full w-full bg-stone-300 bg-cover bg-center transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]"
                        style={{
                          backgroundImage: `url(${fabric.image_url ? toImageUrl(fabric.image_url) : ''})`,
                        }}
                      />
                      <span className="absolute right-0 top-0 bg-white/90 px-3 py-1.5 text-[10px] font-semibold tracking-[0.2em] text-ink">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="pt-5">
                      <h3 className="text-lg font-bold text-ink transition-colors duration-300 group-hover:text-stone-600">
                        {fabric.name}
                      </h3>
                      <p className="mt-2 line-clamp-2 text-sm leading-7 text-stone-500">{fabric.description}</p>
                      <span className="link-underline mt-4 inline-block text-[12px] font-semibold text-ink">
                        مطالعه درباره پارچه
                      </span>
                    </div>
                  </Link>
                ))}
          </div>
        </div>
      </section>

      {/* ===== مقالات ===== */}
      <section className="section">
        <div className="container-sadra">
          <div className="mb-12 flex items-end justify-between gap-6 border-b border-stone-200 pb-7">
            <div>
              <p className="eyebrow">ژورنال</p>
              <h2 className="section-title mt-3">راهنمای خرید و مقالات کت و شلوار</h2>
              <p className="section-subtitle">از شناخت پارچه و انتخاب سایز تا هنر استایل رسمی</p>
            </div>
            <Link to="/articles" className="link-underline hidden shrink-0 pb-1 text-[13px] font-semibold text-ink sm:inline-flex">
              همه مقالات
            </Link>
          </div>

          {articlesLoading ? (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-10">
              {Array.from({ length: 3 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : articles && articles.length > 0 ? (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-10">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-stone-400">مقاله‌ای یافت نشد.</p>
          )}
        </div>
      </section>

      {/* ===== راهنمای خرید ===== */}
      <section className="section border-t border-stone-200">
        <div className="container-sadra">
          <div className="mb-12 max-w-3xl">
            <p className="eyebrow">راهنمای خرید</p>
            <h2 className="section-title mt-3">پیش از خرید، این نکته‌ها را بدانید</h2>
            <p className="section-subtitle">
              کت و شلواری بخرید که سال‌ها همراه شماست؛ از انتخاب سایز تا نگهداری.
            </p>
          </div>

          <div className="grid gap-x-14 gap-y-10 sm:grid-cols-2">
            {GUIDE_ITEMS.map((item, index) => (
              <article key={item.title} className="border-t border-stone-200 pt-6">
                <span className="text-[11px] font-semibold tracking-[0.24em] text-stone-300">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-3 text-lg font-bold text-ink">{item.title}</h3>
                <p className="mt-3 text-sm leading-8 text-stone-500">
                  {item.text}{' '}
                  <Link
                    to={item.to}
                    className="font-semibold text-ink underline decoration-stone-300 underline-offset-4 transition-colors duration-300 hover:decoration-ink"
                  >
                    {item.linkLabel}
                  </Link>{' '}
                  {item.after}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== معرفی برند ===== */}
      <section className="bg-ink py-24 text-white sm:py-28">
        <div className="container-sadra">
          <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/45">
                ABOUT CHOLFISH CAT
              </p>
              <h2 className="mt-6 text-3xl font-black leading-[1.2] tracking-tight text-white sm:text-4xl lg:text-5xl">
                برای مردی که دقیق می‌پوشد
              </h2>
              <p className="mt-6 max-w-lg text-sm leading-8 text-stone-400 sm:text-base sm:leading-9">
                چولفیش کت با این باور متولد شد که کت و شلوار مردانه می‌تواند رسمی، مدرن و در همان حال
                راحت باشد. پارچه ویسکوز را انتخاب کردیم، برش اسلیم‌فیت را استاندارد ساختیم و دوخت
                ایتالیایی را کنار جزئیات دقیق گذاشتیم؛ نتیجه، کت و شلوارهایی است که هم در جلسه‌ی کاری
                می‌درخشند و هم در شب‌های مهم.
              </p>
              <Link
                to="/about"
                className="link-underline mt-9 inline-flex items-center gap-2 text-[13px] font-semibold text-white"
              >
                درباره چولفیش کت بیشتر بخوانید
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 -scale-x-100">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </Link>
            </div>

            <div className="grid grid-cols-1 divide-y divide-white/10 border-y border-white/10 sm:grid-cols-3 sm:divide-x sm:divide-x-reverse sm:divide-y-0">
              {[
                { label: 'پارچه ویسکوز', desc: 'نرم‌ترین انتخاب' },
                { label: 'برش اسلیم‌فیت', desc: 'مدرن و متناسب' },
                { label: 'دوخت ایتالیایی', desc: 'دقت در جزئیات' },
              ].map((item) => (
                <div key={item.label} className="px-4 py-7 text-center sm:px-6 sm:py-10">
                  <h3 className="text-[13px] font-bold text-white sm:text-sm">{item.label}</h3>
                  <p className="mt-2 text-[11px] tracking-wide text-stone-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
