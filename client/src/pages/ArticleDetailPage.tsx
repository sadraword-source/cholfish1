import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, toImageUrl } from '../lib/api';
import { Article, Product } from '../lib/types';
import { formatDate } from '../lib/format';
import Seo from '../components/Seo';
import { articleSchema, breadcrumbSchema } from '../lib/schema';
import { truncate } from '../lib/seo';
import { InlineLoading } from '../components/ui/Loading';
import { ErrorState } from '../components/ui/ErrorState';
import ProductCard from '../components/ui/ProductCard';

export default function ArticleDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<Article>(`/articles/${slug}`);
        setArticle(res.data ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'خطا در دریافت مقاله');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Seo
          title="مقاله | چولفیش کت"
          description="مطالعه مقاله تخصصی کت و شلوار مردانه در چولفیش کت."
          path={`/articles/${slug ?? ''}`}
          noindex
        />
        <div aria-hidden="true">
          <div className="bg-brand-950 py-20">
            <div className="container-sadra max-w-3xl animate-pulse space-y-4">
              <div className="h-4 w-1/3 rounded bg-white/10" />
              <div className="h-9 w-3/4 rounded bg-white/10" />
            </div>
          </div>
          <div className="container-sadra mt-10 max-w-3xl animate-pulse space-y-3">
            <div className="h-4 w-full rounded bg-stone-100" />
            <div className="h-4 w-11/12 rounded bg-stone-100" />
            <div className="h-4 w-10/12 rounded bg-stone-100" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="container-sadra py-16">
        <ErrorState
          title="مقاله یافت نشد"
          message={error ?? 'مقاله مورد نظر در دسترس نیست.'}
          action={
            <Link to="/articles" className="btn-primary">
              همه مقالات
            </Link>
          }
        />
      </div>
    );
  }

  const relatedProducts = (article.relatedProducts ?? []) as Product[];

  const articlePath = `/articles/${article.slug}`;

  return (
    <div className="pb-20">
      <Seo
        title={article.metaTitle ?? `${article.title} | چولفیش کت`}
        description={truncate(article.metaDescription || article.excerpt)}
        path={articlePath}
        image={article.coverImage}
        type="article"
        jsonLd={[
          articleSchema(article, articlePath),
          breadcrumbSchema([
            { name: 'خانه', path: '/' },
            { name: 'مقالات', path: '/articles' },
            { name: article.title, path: articlePath },
          ]),
        ]}
      />

      {/* هدر مقاله */}
      <div className="relative overflow-hidden bg-brand-950 py-20">
        {article.coverImage && (
          <img
            src={toImageUrl(article.coverImage)}
            alt={`تصویر مقاله ${article.title}`}
            width={1200}
            height={630}
            className="absolute inset-0 h-full w-full object-cover opacity-40"
          />
        )}
        <div className="absolute inset-0 bg-ink/75" />
        <div className="relative container-sadra">
          <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white/60">
            {article.fabric && (
              <Link to={`/articles/${article.fabric.slug}`} className="flex items-center gap-1 hover:underline">
                جنس {article.fabric.name}
              </Link>
            )}
            <span>•</span>
            <span>{article.category}</span>
            <span>•</span>
            <span>{formatDate(article.publishedAt)}</span>
          </div>
          <h1 className="mt-4 max-w-3xl text-3xl font-black leading-snug text-white sm:text-4xl">
            {article.title}
          </h1>
        </div>
      </div>

      <div className="container-sadra mt-10 max-w-3xl">
        <nav aria-label="مسیر صفحه" className="mb-8 flex flex-wrap items-center gap-2.5 text-[11px] tracking-wide text-stone-400">
          <Link to="/" className="transition-colors duration-300 hover:text-ink">خانه</Link>
          <span aria-hidden="true">/</span>
          <Link to="/articles" className="transition-colors duration-300 hover:text-ink">مقالات کت و شلوار</Link>
          <span aria-hidden="true">/</span>
          <span className="text-stone-600">{article.title}</span>
        </nav>

        {/* محتوای مقاله */}
        <article
          className="article-content"
          dangerouslySetInnerHTML={{ __html: article.content ?? '' }}
        />

        {article.fabric && (
          <div className="mt-12 border-t border-stone-200 bg-ivory p-6 sm:p-8">
            <p className="eyebrow">جنس این مقاله</p>
            <p className="mt-3 text-base font-bold text-ink">{article.fabric.name}</p>
            <p className="mt-2 text-sm leading-7 text-stone-600">
              {article.fabric.description}
            </p>
            <Link to={`/shop?fabric=${article.fabric.slug}`} className="link-underline mt-5 inline-block text-sm font-semibold text-ink">
              مشاهده محصولات {article.fabric.name}
            </Link>
          </div>
        )}

        {/* محصولات مرتبط (هم‌جنس پارچه) */}
        {relatedProducts.length > 0 && (
          <section className="mt-14">
            <h2 className="section-title !text-xl">کت و شلوارهای مرتبط با این مقاله</h2>
            <p className="section-subtitle">
              محصولات ساخته‌شده از همین پارچه —{' '}
              <Link to="/shop" className="underline underline-offset-4">
                مشاهده همه کت و شلوارهای مردانه
              </Link>
            </p>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
              {relatedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        <div className="mt-12 border-t border-stone-100 pt-6">
          <Link to="/articles" className="text-sm font-semibold text-stone-500 hover:text-black">
            ← بازگشت به همه مقالات
          </Link>
        </div>
      </div>
    </div>
  );
}