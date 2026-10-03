import { Link } from 'react-router-dom';
import { Article } from '../../lib/types';
import { formatDate } from '../../lib/format';
import { toImageUrl } from '../../lib/api';

export default function ArticleCard({ article }: { article: Article }) {
  return (
    <Link to={`/articles/${article.slug}`} className="group block">
      <div className="relative aspect-[3/2] overflow-hidden bg-stone-100">
        <img
          src={toImageUrl(article.coverImage)}
          alt={article.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]"
        />
      </div>

      <div className="pt-5">
        <div className="flex items-center gap-2.5 text-[10px] font-medium uppercase tracking-[0.2em] text-stone-400">
          <span className="text-ink">{article.category}</span>
          <span className="h-3 w-px bg-stone-300" aria-hidden="true" />
          <span>{formatDate(article.publishedAt)}</span>
        </div>
        <h3 className="mt-3 text-base font-bold leading-7 text-ink transition-colors duration-300 group-hover:text-stone-600">
          {article.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-7 text-stone-500">{article.excerpt}</p>
      </div>
    </Link>
  );
}
