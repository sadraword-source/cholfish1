import { Helmet } from 'react-helmet-async';
import {
  SITE_NAME,
  SITE_URL,
  DEFAULT_OG_IMAGE,
  absoluteUrl,
  absoluteImageUrl,
  truncate,
} from '../lib/seo';

export interface SeoProps {
  title: string;
  description: string;
  /** مسیر فعلی صفحه، مثل /product/navy-slim-fit-suit */
  path: string;
  image?: string | null;
  type?: 'website' | 'article' | 'product';
  noindex?: boolean;
  /** JSON-LD برای درج در head */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  keywords?: string[];
}

export default function Seo({
  title,
  description,
  path,
  image,
  type = 'website',
  noindex = false,
  jsonLd,
  keywords,
}: SeoProps) {
  const canonical = absoluteUrl(path);
  const cleanDescription = truncate(description);
  const ogImage = image ? absoluteImageUrl(image) : DEFAULT_OG_IMAGE;

  return (
    <Helmet prioritizeSeoTags>
      <title>{title}</title>
      <meta name="description" content={cleanDescription} />
      {keywords && keywords.length > 0 && <meta name="keywords" content={keywords.join('، ')} />}
      <link rel="canonical" href={canonical} />

      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}

      {/* Open Graph */}
      <meta property="og:type" content={type === 'product' ? 'website' : type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="fa_IR" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={cleanDescription} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content={title} />

      {/* Twitter / X */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={cleanDescription} />
      <meta name="twitter:image" content={ogImage} />

      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(Array.isArray(jsonLd) ? jsonLd : [jsonLd])}
        </script>
      )}
      <link rel="alternate" hrefLang="fa-IR" href={canonical} />
      <link rel="alternate" hrefLang="x-default" href={SITE_URL + '/'} />
    </Helmet>
  );
}
