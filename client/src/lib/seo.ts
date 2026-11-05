const runtimeOrigin =
  typeof window !== 'undefined' && window.location ? window.location.origin : '';

export const SITE_URL = (
  import.meta.env.VITE_SITE_URL || runtimeOrigin || 'http://localhost:5173'
).replace(/\/$/, '');

export const SITE_NAME = 'CAVERO';
export const SITE_NAME_EN = 'CAVERO';
export const SITE_TAGLINE = 'کت و شلوار مردانه';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/logo.png`;

export const BRAND = {
  name: SITE_NAME,
  alternateName: SITE_NAME_EN,
  url: SITE_URL,
  logo: `${SITE_URL}/logo-mark.png`,
  image: DEFAULT_OG_IMAGE,
};

export function absoluteUrl(path: string): string {
  if (!path) return SITE_URL;
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/** تصاویر دیتابیس با /images/... ذخیره می‌شوند که از /static سرو می‌شوند */
export function absoluteImageUrl(path: string | null | undefined): string {
  if (!path) return DEFAULT_OG_IMAGE;
  if (/^https?:\/\//.test(path)) return path;
  if (path.startsWith('/static')) return absoluteUrl(path);
  return absoluteUrl(`/static${path}`);
}

export function truncate(text: string, max = 158): string {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

/** صفحه‌هایی که نباید در نتایج جستجو بیایند */
export const PRIVATE_PATHS = [
  '/cart',
  '/checkout',
  '/auth',
  '/account',
  '/account/orders',
  '/account/addresses',
  '/account/measurements',
  '/admin',
  '/admin/login',
];

export function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
