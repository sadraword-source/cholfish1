import { useState } from 'react';
import { Link } from 'react-router-dom';
import { StylistRecommendation } from '../lib/types';
import { formatPriceWithUnit, faNum } from '../lib/format';
import { toImageUrl } from '../lib/api';

interface StylistProductCardProps {
  recommendation: StylistRecommendation;
  onAdd: (productId: number, sizeId: number) => Promise<void>;
  added: boolean;
  adding: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  suit: 'کت و شلوار',
  jacket: 'کت',
  trousers: 'شلوار',
  other: 'پیشنهاد ویژه',
};

export default function StylistProductCard({ recommendation, onAdd, added, adding }: StylistProductCardProps) {
  const { product, sizes, reason, category } = recommendation;
  const [sizeId, setSizeId] = useState<number | null>(sizes[0]?.id ?? null);

  return (
    <article className="group flex min-w-0 flex-col">
      <Link
        to={`/product/${product.slug}`}
        className="relative block aspect-[4/5] overflow-hidden bg-[#f3f1ec]"
      >
        <img
          src={toImageUrl(product.mainImage)}
          alt={product.name}
          loading="lazy"
          className="h-full w-full rounded-none object-cover transition-transform duration-[1100ms] ease-out group-hover:scale-[1.03]"
        />
      </Link>

      <div className="flex flex-1 flex-col pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[9px] font-medium uppercase tracking-[0.24em] text-stone-400">
            {CATEGORY_LABELS[category] ?? category}
          </span>
          <span className="shrink-0 text-[10px] text-stone-400">{product.color}</span>
        </div>

        <Link
          to={`/product/${product.slug}`}
          className="mt-2 break-words text-[15px] font-semibold leading-6 text-ink transition-colors duration-300 hover:text-stone-500"
        >
          {product.name}
        </Link>

        <div className="mt-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span className="text-[13px] font-medium text-ink">{formatPriceWithUnit(product.price)}</span>
          {product.oldPrice && (
            <span className="text-[11px] text-stone-400 line-through">{formatPriceWithUnit(product.oldPrice)}</span>
          )}
        </div>

        <p className="mt-3 line-clamp-2 text-[11px] leading-6 text-stone-500">{reason}</p>

        <div className="mt-auto pt-4">
          {sizes.length > 0 ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-[9px] uppercase tracking-[0.22em] text-stone-300">سایز</span>
              {sizes.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSizeId(s.id)}
                  aria-pressed={sizeId === s.id}
                  className={`text-[11px] font-medium transition-colors duration-200 ${
                    sizeId === s.id
                      ? 'text-ink underline decoration-ink underline-offset-4'
                      : 'text-stone-400 hover:text-ink'
                  }`}
                >
                  {faNum(s.label)}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-stone-400">در حال حاضر موجود نیست</p>
          )}

          <div className="mt-4 flex items-center justify-between gap-3">
            <Link
              to={`/product/${product.slug}`}
              className="text-[10px] font-medium tracking-wide text-stone-400 transition-colors hover:text-ink"
            >
              مشاهده محصول
            </Link>
            <button
              type="button"
              disabled={adding || !sizeId || sizes.length === 0}
              onClick={() => sizeId && onAdd(product.id, sizeId)}
              className="text-[10px] font-semibold tracking-wide text-ink transition-colors hover:text-stone-500 disabled:text-stone-300"
            >
              {added ? 'در سبد ✓' : adding ? 'در حال افزودن...' : 'افزودن به سبد'}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
