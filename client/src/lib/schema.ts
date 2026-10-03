import { Article, ProductDetail } from './types';
import { BRAND, SITE_NAME, absoluteImageUrl, absoluteUrl } from './seo';

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${BRAND.url}/#organization`,
    name: SITE_NAME,
    alternateName: BRAND.alternateName,
    url: BRAND.url,
    logo: { '@type': 'ImageObject', url: BRAND.logo },
    image: BRAND.image,
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${BRAND.url}/#website`,
    url: BRAND.url,
    name: SITE_NAME,
    inLanguage: 'fa-IR',
    publisher: { '@id': `${BRAND.url}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BRAND.url}/shop?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/**
 * Product schema — فقط فیلدهایی که در داده‌های واقعی موجودند.
 * sku از slug ساخته می‌شود و gtin/mpn جعلی تولید نمی‌شود.
 */
export function productSchema(product: ProductDetail, path: string) {
  const images = [
    ...(product.images?.map((i) => absoluteImageUrl(i.url)) ?? []),
    ...(product.mainImage ? [absoluteImageUrl(product.mainImage)] : []),
  ];
  const uniqueImages = Array.from(new Set(images)).slice(0, 8);

  const inStock = product.availableSizes.length > 0;

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.metaDescription || product.description,
    sku: product.slug,
    url: absoluteUrl(path),
    image: uniqueImages,
    brand: { '@type': 'Brand', name: SITE_NAME },
    category: 'کت و شلوار مردانه',
    material: product.fabric?.name,
    color: product.color,
    offers: {
      '@type': 'Offer',
      url: absoluteUrl(path),
      priceCurrency: 'IRR',
      price: product.price,
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': `${BRAND.url}/#organization` },
    },
  };

  if (product.oldPrice && product.oldPrice > product.price) {
    (schema.offers as Record<string, unknown>).priceSpecification = {
      '@type': 'UnitPriceSpecification',
      price: product.price,
      priceCurrency: 'IRR',
    };
  }

  return schema;
}

export function articleSchema(article: Article, path: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.metaDescription || article.excerpt,
    image: absoluteImageUrl(article.coverImage),
    datePublished: article.publishedAt,
    dateModified: article.publishedAt,
    inLanguage: 'fa-IR',
    mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(path) },
    author: { '@type': 'Organization', name: SITE_NAME, url: BRAND.url },
    publisher: { '@id': `${BRAND.url}/#organization` },
  };
}
