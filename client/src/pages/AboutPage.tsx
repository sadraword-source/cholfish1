import { Link } from 'react-router-dom';
import { SITE_TAGLINE } from '../lib/constants';
import Seo from '../components/Seo';
import { breadcrumbSchema } from '../lib/schema';

const VALUES = [
  {
    title: 'پارچه ویسکوز',
    desc: 'انتخابی آگاهانه برای یک استایل سبک، نرم و درعین‌حال رسمی.',
  },
  {
    title: 'برش اسلیم‌فیت',
    desc: 'خطوطی مدرن که اندام را کشیده و متناسب نشان می‌دهد.',
  },
  {
    title: 'دوخت ایتالیایی',
    desc: 'دقتی که در جزئیات، از یقه تا دکمه‌ها، دیده می‌شود.',
  },
  {
    title: 'طراحی مینیمال',
    desc: 'زیبایی در سادگی؛ بدون شلوغی، بدون حاشیه.',
  },
];

export default function AboutPage() {
  return (
    <div className="pb-24">
      <Seo
        title="درباره CAVERO | فروشگاه تخصصی کت و شلوار مردانه"
        description="CAVERO فروشگاه تخصصی کت و شلوار مردانه است؛ با تمرکز بر برش اسلیم‌فیت، پارچه ویسکوز و دوخت ایتالیایی. داستان برند، ارزش‌ها و رویکرد ما به استایل رسمی را بخوانید."
        path="/about"
        jsonLd={breadcrumbSchema([
          { name: 'خانه', path: '/' },
          { name: 'درباره CAVERO', path: '/about' },
        ])}
      />

      <div className="border-b border-stone-200 bg-ivory py-16 sm:py-20">
        <div className="container-sadra">
          <p className="eyebrow">ABOUT CAVERO</p>
          <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">درباره CAVERO</h1>
          <p className="mt-5 max-w-2xl text-sm leading-8 text-stone-500 sm:text-base">
            {SITE_TAGLINE}. ما در CAVERO اعتقاد داریم استایل رسمی می‌تواند مدرن، سبک و راحت باشد.
          </p>
        </div>
      </div>

      <div className="container-sadra">
        {/* داستان برند */}
        <section className="py-20">
          <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
            <div>
              <p className="eyebrow">داستان ما</p>
              <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">داستان CAVERO</h2>
              <div className="mt-7 space-y-5 text-sm leading-8 text-stone-600 sm:text-base sm:leading-9">
                <p>
                  CAVERO با یک سؤال ساده متولد شد: چرا پوشیدن کت‌وشلوار در نسل جدید، همیشه باید سنگین و
                  رسمیِ قدیمی و ناراحت باشد؟ پاسخ ما یک فروشگاه اینترنتی است که استایل رسمی را برای زندگی
                  امروزی بازتعریف می‌کند.
                </p>
                <p>
                  ما پارچه ویسکوز را به‌عنوان قلب محصولات خود انتخاب کردیم؛ پارچه‌ای نرم، سبک و مدرن که در
                  رنگ مشکی، عمقی لوکس و درخشان دارد. برش اسلیم‌فیت را استاندارد کردیم و دوخت ایتالیایی را
                  به آن افزودیم تا جزئیات، دقیق و تمیز باشند.
                </p>
                <p>
                  امروز CAVERO به شما کمک می‌کند از خواندن مقاله درباره پارچه، تا انتخاب سایز با ابزار
                  اندازه‌گیری بدن و ثبت سفارش، تجربه‌ای آسان و مطمئن از خرید کت‌وشلوار داشته باشید.
                </p>
              </div>
            </div>
            <div className="relative aspect-[4/5] overflow-hidden bg-ink lg:aspect-auto lg:min-h-[520px]">
              <img src="/static/images/hero.svg" alt="CAVERO استایل" className="h-full w-full object-cover opacity-90" />
            </div>
          </div>
        </section>

        {/* ارزش‌ها */}
        <section className="border-t border-stone-200 py-20">
          <p className="eyebrow">ارزش‌ها</p>
          <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">ارزش‌های ما</h2>
          <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((value, index) => (
              <div key={value.title} className="border-t border-stone-200 pt-6">
                <span className="text-[11px] font-semibold tracking-[0.24em] text-stone-300">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-3 text-base font-bold text-ink">{value.title}</h3>
                <p className="mt-2 text-sm leading-7 text-stone-500">{value.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* دعوت به اقدام */}
        <section className="bg-ink px-6 py-16 text-center text-white sm:px-12 sm:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/45">کلکسیون CAVERO</p>
          <h2 className="mx-auto mt-5 max-w-xl text-2xl font-black tracking-tight sm:text-4xl">آماده‌ی یک استایل جدید؟</h2>
          <p className="mx-auto mt-5 max-w-md text-sm leading-8 text-stone-400">
            کلکسیون کت‌وشلوار CAVERO را ببینید و با ابزار پیشنهاد سایز، خرید دقیق را تجربه کنید.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/shop" className="btn bg-white text-ink hover:bg-stone-200">مشاهده محصولات</Link>
            <Link to="/size-guide" className="btn-on-dark">راهنمای انتخاب سایز</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
