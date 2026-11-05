import { Link } from 'react-router-dom';
import { Product } from '../../lib/types';
import { formatPriceWithUnit } from '../../lib/format';
import { toImageUrl } from '../../lib/api';

export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link to={`/product/${product.slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[#f3f1ec]">
        <img
          src={toImageUrl(product.mainImage)}
          alt={`${product.name} — کت و شلوار مردانه ${product.color}`}
          width={1000}
          height={1250}
          loading="lazy"
          className="h-full w-full object-contain transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]"
        />
        {product.oldPrice && (
          <span className="absolute right-0 top-0 bg-ink px-3 py-1.5 text-[10px] font-semibold tracking-[0.18em] text-white">
            تخفیف
          </span>
        )}
      </div>

      <div className="pt-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-stone-400">
          {product.fabric.name}
        </p>
        <h3 className="mt-2 text-[15px] font-semibold leading-6 text-ink transition-colors duration-300 group-hover:text-stone-600">
          {product.name}
        </h3>
        <div className="mt-2.5 flex items-baseline gap-2.5">
          <span className="text-sm font-bold text-ink">{formatPriceWithUnit(product.price)}</span>
          {product.oldPrice && (
            <span className="text-xs text-stone-400 line-through">{formatPriceWithUnit(product.oldPrice)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
