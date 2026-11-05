import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Article } from '../lib/types';
import Seo from '../components/Seo';
import { breadcrumbSchema } from '../lib/schema';
import ArticleCard from '../components/ui/ArticleCard';
import { InlineLoading } from '../components/ui/Loading';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [catsRes] = await Promise.all([
          api.get<{ name: string; count: number }[]>('/articles/categories'),
        ]);
        setCategories(catsRes.data ?? []);
      } catch {
        // بدون دسته‌بندی
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ limit: '30' });
        if (activeCategory) params.set('category', activeCategory);
        const res = await api.get<{ articles: Article[] }>(`/articles?${params}`);
        setArticles(res.data?.articles ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'خطا در دریافت مقالات');
      } finally {
        setLoading(false);
      }
    })();
  }, [activeCategory]);

  return (
    <div className="pb-20">
      <Seo
        title="مقالات کت و شلوار مردانه | راهنمای خرید، پارچه و استایل — CAVERO"
        description="مجموعه مقالات و راهنماهای کت و شلوار مردانه: انتخاب سایز، مقایسه پارچه‌ها (ویسکوز، پلی‌استر، پشم)، تفاوت اسلیم‌فیت و کلاسیک، استایل رسمی و نگهداری."
        path="/articles"
        keywords={['مقالات کت و شلوار مردانه', 'راهنمای خرید کت و شلوار', 'پارچه کت و شلوار']}
        jsonLd={breadcrumbSchema([
          { name: 'خانه', path: '/' },
          { name: 'مقالات کت و شلوار مردانه', path: '/articles' },
        ])}
      />

      <div className="border-b border-stone-200 bg-ivory py-14 sm:py-16">
        <div className="container-sadra">
          <nav aria-label="مسیر صفحه" className="mb-5 flex items-center gap-2.5 text-[11px] tracking-wide text-stone-400">
            <Link to="/" className="transition-colors duration-300 hover:text-ink">خانه</Link>
            <span aria-hidden="true">/</span>
            <span className="text-stone-600">مقالات</span>
          </nav>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">مقالات کت و شلوار مردانه</h1>
          <p className="mt-3 text-sm leading-7 text-stone-500">از شناخت پارچه و انتخاب سایز تا هنر استایل رسمی</p>
        </div>
      </div>

      <div className="container-sadra mt-12">
        {/* دسته بندی */}
        {categories.length > 0 && (
          <div className="mb-12 flex flex-wrap gap-2.5 border-b border-stone-200 pb-7">
            <button
              onClick={() => setActiveCategory('')}
              className={`border px-4 py-2 text-[12px] font-medium tracking-wide transition-colors duration-300 ${
                activeCategory === ''
                  ? 'border-ink bg-ink text-white'
                  : 'border-stone-200 text-stone-500 hover:border-ink hover:text-ink'
              }`}
            >
              همه
            </button>
            {categories.map((category) => (
              <button
                key={category.name}
                onClick={() => setActiveCategory(category.name)}
                className={`border px-4 py-2 text-[12px] font-medium tracking-wide transition-colors duration-300 ${
                  activeCategory === category.name
                    ? 'border-ink bg-ink text-white'
                    : 'border-stone-200 text-stone-500 hover:border-ink hover:text-ink'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <InlineLoading />
        ) : error ? (
          <ErrorState message={error} />
        ) : articles && articles.length === 0 ? (
          <EmptyState title="مقاله‌ای یافت نشد" description="فعلاً مقاله‌ای در این دسته‌بندی منتشر نشده است." />
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-10">
            {(articles ?? []).map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}