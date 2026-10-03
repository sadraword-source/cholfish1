import { Router } from 'express';
import { db } from '../db/connection.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

function siteUrl(): string {
  return (process.env.SITE_URL || 'http://localhost:5173').replace(/\/$/, '');
}

// GET /robots.txt
router.get('/robots.txt', (_req, res) => {
  const base = siteUrl();
  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    '# صفحات خصوصی و پنل مدیریت نباید ایندکس شوند',
    'Disallow: /cart',
    'Disallow: /checkout',
    'Disallow: /auth',
    'Disallow: /account',
    'Disallow: /admin',
    'Disallow: /api/',
    '',
    '# صفحات نتیجه فیلتر/جستجو برای جلوگیری از duplicate content',
    'Disallow: /shop?*sort=',
    'Disallow: /shop?*search=',
    'Disallow: /shop?*fabric=',
    'Disallow: /shop?*fit=',
    'Disallow: /shop?*minPrice=',
    'Disallow: /shop?*maxPrice=',
    'Disallow: /*?search=',
    '',
    `Sitemap: ${base}/sitemap.xml`,
    '',
  ].join('\n');

  res.type('text/plain').send(body);
});

// GET /sitemap.xml — صفحات استاتیک + محصولات + مقالات
router.get(
  '/sitemap.xml',
  asyncHandler(async (_req, res) => {
    const base = siteUrl();

    const products = (await db
      .prepare("SELECT slug, updated_at FROM products WHERE is_active = 1 ORDER BY id")
      .all()) as { slug: string; updated_at: string }[];

    const articles = (await db
      .prepare('SELECT slug, published_at FROM articles WHERE is_published = 1 ORDER BY id')
      .all()) as { slug: string; published_at: string }[];

    const toDate = (value: string | Date | undefined): string => {
      const d = value ? new Date(value) : new Date();
      return Number.isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
    };

    const staticPages = [
      { path: '/', priority: '1.0', changefreq: 'daily' },
      { path: '/shop', priority: '0.9', changefreq: 'daily' },
      { path: '/articles', priority: '0.7', changefreq: 'weekly' },
      { path: '/size-guide', priority: '0.6', changefreq: 'monthly' },
      { path: '/about', priority: '0.5', changefreq: 'monthly' },
    ];

    const urls: string[] = staticPages.map(
      (p) =>
        `  <url>\n    <loc>${base}${p.path}</loc>\n    <lastmod>${toDate(undefined)}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`
    );

    for (const p of products) {
      urls.push(
        `  <url>\n    <loc>${base}/product/${p.slug}</loc>\n    <lastmod>${toDate(p.updated_at)}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`
      );
    }

    for (const a of articles) {
      urls.push(
        `  <url>\n    <loc>${base}/articles/${a.slug}</loc>\n    <lastmod>${toDate(a.published_at)}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`
      );
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;

    res.type('application/xml').send(xml);
  })
);

export default router;
