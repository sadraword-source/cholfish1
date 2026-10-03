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
  other: 'پیشنهاد ویژه',
};

export default function StylistProductCard({ recommendation, onAdd, added, adding }: StylistProductCardProps) {
  const { product, sizes, reason, category } = recommendation;
  const [sizeId, setSizeId] = useState<number | null>(sizes[0]?.id ?? null);

  return (
    <div className="flex flex-col border border-stone-200 bg-white">
      <Link to={`/product/${product.slug}`} className="group relative block aspect-[4/5] overflow-hidden bg-stone-100">
        <img
          src={toImageUrl(product.mainImage)}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]"
        />
        <span className="absolute right-0 top-0 bg-ink px-3 py-1.5 text-[10px] font-semibold tracking-[0.18em] text-white">
          {CATEGORY_LABELS[category] ?? category}
        </span>
        <span className="absolute left-0 top-0 border border-stone-200 bg-white/95 px-3 py-1.5 text-[10px] font-medium tracking-[0.14em] text-stone-600">
          {product.color}
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <Link
          to={`/product/${product.slug}`}
          className="text-[15px] font-semibold leading-6 text-ink transition-colors duration-300 hover:text-stone-600"
        >
          {product.name}
        </Link>

        <p className="border-r-2 border-stone-200 bg-ivory p-3 text-xs leading-6 text-stone-600">
          <span className="font-bold text-ink">چرا این را پیشنهاد دادم؟ </span>
          {reason}
        </p>

        {sizes.length > 0 ? (
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-stone-400">انتخاب سایز</p>
            <div className="flex flex-wrap gap-1.5">
              {sizes.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSizeId(s.id)}
                  className={`h-8 min-w-[2rem] border px-2 text-xs font-bold transition-colors duration-200 ${
                    sizeId === s.id
                      ? 'border-ink bg-ink text-white'
                      : 'border-stone-200 text-stone-600 hover:border-ink hover:text-ink'
                  }`}
                >
                  {faNum(s.label)}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-red-500">در حال حاضر موجود نیست</p>
        )}

        <div className="mt-auto flex items-baseline gap-2.5 pt-1">
          <span className="text-sm font-bold text-ink">{formatPriceWithUnit(product.price)}</span>
          {product.oldPrice && (
            <span className="text-xs text-stone-400 line-through">{formatPriceWithUnit(product.oldPrice)}</span>
          )}
        </div>

        <div className="mt-1 grid grid-cols-2 gap-2">
          <Link to={`/product/${product.slug}`} className="btn-outline justify-center !px-3 !py-2.5 text-xs">
            مشاهده
          </Link>
          <button
            type="button"
            disabled={adding || !sizeId || sizes.length === 0}
            onClick={() => sizeId && onAdd(product.id, sizeId)}
            className="btn-primary justify-center !px-3 !py-2.5 text-xs"
          >
            {added ? 'در سبد ✓' : adding ? 'در حال افزودن...' : 'افزودن به سبد'}
          </button>
        </div>
      </div>
    </div>
  );
}
