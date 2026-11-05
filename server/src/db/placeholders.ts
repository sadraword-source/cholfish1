import fs from 'node:fs';
import path from 'node:path';

// تولید تصاویر Placeholder به صورت SVG با ظاهر لوکس و مینیمال
// جایگزینی تصاویر واقعی: فایل‌ها در server/public/images/... هستند

const SUIT_FRONT = (color: string, accent: string, label: string) => `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#141414"/>
      <stop offset="1" stop-color="#0a0a0a"/>
    </linearGradient>
    <linearGradient id="suit" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${color}"/>
      <stop offset="1" stop-color="#000"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.3" r="0.6">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.18"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="800" height="1000" fill="url(#bg)"/>
  <rect width="800" height="1000" fill="url(#glow)"/>
  <!-- jacket -->
  <path d="M250 340 L305 250 L400 300 L495 250 L550 340 L560 760 L470 780 L455 560 L345 560 L330 780 L240 760 Z"
        fill="${color}" stroke="#000" stroke-opacity="0.4"/>
  <!-- lapels -->
  <path d="M305 250 L400 300 L400 420 L345 380 Z" fill="${accent}" fill-opacity="0.9"/>
  <path d="M495 250 L400 300 L400 420 L455 380 Z" fill="${accent}" fill-opacity="0.7"/>
  <!-- tie -->
  <path d="M388 440 L412 440 L412 640 L400 660 L388 640 Z" fill="${accent}"/>
  <!-- shirt -->
  <path d="M345 380 L400 420 L455 380 L455 560 L400 660 L345 560 Z" fill="#e8e6e1"/>
  <!-- trousers -->
  <path d="M330 780 L470 780 L490 950 L430 950 L415 830 L385 830 L370 950 L310 950 Z" fill="${color}"/>
  <rect x="40" y="40" width="26" height="6" rx="3" fill="${accent}" opacity="0.8"/>
  <rect x="70" y="40" width="6" height="26" rx="3" fill="${accent}" opacity="0.8"/>
  <rect x="734" y="40" width="26" height="6" rx="3" fill="${accent}" opacity="0.8"/>
  <rect x="724" y="40" width="6" height="26" rx="3" fill="${accent}" opacity="0.8"/>
  <text x="400" y="965" text-anchor="middle" fill="#9a9a92" font-family="Vazirmatn, sans-serif" font-size="26">${label}</text>
</svg>`;

const SUIT_BACK = (color: string, accent: string, label: string) => `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
  <defs>
    <linearGradient id="bg2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#141414"/>
      <stop offset="1" stop-color="#0a0a0a"/>
    </linearGradient>
    <linearGradient id="suit2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${color}"/>
      <stop offset="1" stop-color="#000"/>
    </linearGradient>
  </defs>
  <rect width="800" height="1000" fill="url(#bg2)"/>
  <!-- jacket back -->
  <path d="M250 340 L305 250 L400 305 L495 250 L550 340 L560 760 L470 780 L440 570 L360 570 L330 780 L240 760 Z"
        fill="${color}"/>
  <path d="M305 250 L400 305 L330 780" fill="none" stroke="#000" stroke-opacity="0.5" stroke-width="3"/>
  <path d="M495 250 L400 305 L470 780" fill="none" stroke="#000" stroke-opacity="0.5" stroke-width="3"/>
  <!-- center vent -->
  <path d="M400 570 L400 780" fill="none" stroke="${accent}" stroke-opacity="0.7" stroke-width="4"/>
  <!-- trousers back -->
  <path d="M330 780 L470 780 L490 950 L430 950 L415 830 L385 830 L370 950 L310 950 Z" fill="${color}"/>
  <text x="400" y="965" text-anchor="middle" fill="#9a9a92" font-family="Vazirmatn, sans-serif" font-size="26">${label}</text>
</svg>`;

const FABRIC_DETAIL = (base: string, accent: string, label: string) => `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
  <defs>
    <pattern id="weave" width="40" height="40" patternUnits="userSpaceOnUse">
      <rect width="40" height="40" fill="${base}"/>
      <path d="M0 20 H40 M20 0 V40" stroke="${accent}" stroke-width="2" opacity="0.35"/>
    </pattern>
    <linearGradient id="bg3" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${base}"/>
      <stop offset="1" stop-color="#000"/>
    </linearGradient>
  </defs>
  <rect width="800" height="1000" fill="url(#bg3)"/>
  <g opacity="0.9"><rect x="0" y="0" width="800" height="1000" fill="url(#weave)"/></g>
  <rect x="150" y="380" width="500" height="240" rx="8" fill="#00000055" stroke="${accent}" stroke-opacity="0.6" stroke-width="2"/>
  <text x="400" y="470" text-anchor="middle" fill="#fff" font-family="Vazirmatn, sans-serif" font-size="40" font-weight="bold">جزئیات پارچه</text>
  <text x="400" y="530" text-anchor="middle" fill="#cfcfc7" font-family="Vazirmatn, sans-serif" font-size="24">${label}</text>
  <text x="400" y="965" text-anchor="middle" fill="#9a9a92" font-family="Vazirmatn, sans-serif" font-size="26">بافت ریز و کیفیت بالا</text>
</svg>`;

const STITCHING_DETAIL = (base: string, accent: string, label: string) => `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
  <defs>
    <linearGradient id="bg4" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${base}"/>
      <stop offset="1" stop-color="#000"/>
    </linearGradient>
  </defs>
  <rect width="800" height="1000" fill="url(#bg4)"/>
  <!-- seam lines -->
  <path d="M200 200 C 300 400, 500 600, 600 800" stroke="${accent}" stroke-width="3" fill="none" stroke-dasharray="12 6" opacity="0.9"/>
  <path d="M600 200 C 500 400, 300 600, 200 800" stroke="${accent}" stroke-width="3" fill="none" stroke-dasharray="12 6" opacity="0.6"/>
  <path d="M250 300 L600 300" stroke="${accent}" stroke-width="2" fill="none" stroke-dasharray="8 8" opacity="0.4"/>
  <path d="M250 700 L600 700" stroke="${accent}" stroke-width="2" fill="none" stroke-dasharray="8 8" opacity="0.5"/>
  <circle cx="400" cy="500" r="90" fill="none" stroke="${accent}" stroke-width="4" stroke-dasharray="2 10" opacity="0.85"/>
  <text x="400" y="495" text-anchor="middle" fill="#fff" font-family="Vazirmatn, sans-serif" font-size="30">دوخت</text>
  <text x="400" y="540" text-anchor="middle" fill="#cfcfc7" font-family="Vazirmatn, sans-serif" font-size="22">${label}</text>
  <text x="400" y="965" text-anchor="middle" fill="#9a9a92" font-family="Vazirmatn, sans-serif" font-size="26">جزئیات دوخت و خیاطی</text>
</svg>`;

const DESIGN_DETAIL = (base: string, accent: string, label: string) => `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
  <defs>
    <linearGradient id="bg5" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${base}"/>
      <stop offset="1" stop-color="#000"/>
    </linearGradient>
  </defs>
  <rect width="800" height="1000" fill="url(#bg5)"/>
  <!-- button design -->
  <circle cx="400" cy="350" r="70" fill="none" stroke="${accent}" stroke-width="5" opacity="0.9"/>
  <circle cx="400" cy="350" r="34" fill="${accent}"/>
  <circle cx="400" cy="350" r="14" fill="${base}"/>
  <circle cx="345" cy="470" r="16" fill="${accent}" opacity="0.85"/>
  <circle cx="455" cy="470" r="16" fill="${accent}" opacity="0.85"/>
  <line x1="400" y1="560" x2="400" y2="660" stroke="${accent}" stroke-width="3" opacity="0.5"/>
  <rect x="330" y="660" width="140" height="8" rx="4" fill="${accent}" opacity="0.6"/>
  <text x="400" y="800" text-anchor="middle" fill="#fff" font-family="Vazirmatn, sans-serif" font-size="30">طراحی مینیمال</text>
  <text x="400" y="840" text-anchor="middle" fill="#cfcfc7" font-family="Vazirmatn, sans-serif" font-size="22">${label}</text>
  <text x="400" y="965" text-anchor="middle" fill="#9a9a92" font-family="Vazirmatn, sans-serif" font-size="26">جزئیات طراحی</text>
</svg>`;

// ---------- تصاویر شاخص مقاله‌ها (Illustration های ادیتوریال) ----------
const ARTICLE_INK = '#dcd9d1';

// قالب مشترک همه کاورها: پس‌زمینه تیره، گرید ظریف، لهجه طلایی و هاله نرم
const articleFrame = (inner: string, accent: string): string => `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800" role="img">
  <defs>
    <linearGradient id="abg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0f0f0f"/>
      <stop offset="0.55" stop-color="#171717"/>
      <stop offset="1" stop-color="#0a0a0a"/>
    </linearGradient>
    <radialGradient id="agl" cx="0.66" cy="0.34" r="0.62">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.07"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="aac" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.16"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="800" fill="url(#abg)"/>
  <rect width="1200" height="800" fill="url(#agl)"/>
  <g stroke="#ffffff" stroke-opacity="0.035" stroke-width="1">
    <line x1="240" y1="0" x2="240" y2="800"/>
    <line x1="600" y1="0" x2="600" y2="800"/>
    <line x1="960" y1="0" x2="960" y2="800"/>
    <line x1="0" y1="400" x2="1200" y2="400"/>
  </g>
  <circle cx="810" cy="410" r="250" fill="url(#aac)"/>
  <g transform="translate(64,64)"><rect width="48" height="3" fill="${accent}"/><rect y="13" width="24" height="3" fill="${accent}" opacity="0.45"/></g>
  <g transform="translate(1088,64)"><rect width="48" height="3" fill="${accent}" opacity="0.45"/><rect x="24" y="13" width="24" height="3" fill="${accent}"/></g>
  <g transform="translate(64,726)" font-family="Vazirmatn, sans-serif">
    <rect width="34" height="2" fill="${accent}" opacity="0.7"/>
    <text y="24" fill="#8f8b83" font-size="14" letter-spacing="4">CAVERO</text>
    <text y="46" fill="#565248" font-size="11" letter-spacing="3">STYLE JOURNAL</text>
  </g>
  ${inner}
</svg>`;

// شِلایه کت‌وشلوار به‌صورت خطی (fashion sketch)
const suitGroup = (x: number, y: number, s: number, color: string, accent: string): string => {
  const jacket =
    'M-76 -148 L-34 -184 L0 -150 L34 -184 L76 -148 L84 44 L44 58 L40 -18 L-40 -18 L-44 58 L-84 44 Z';
  const clipId = `suit${Math.round(x)}-${Math.round(y)}-${Math.round(s * 100)}`;
  const stripes = Array.from({ length: 11 }, (_, i) => {
    const px = -120 + i * 24;
    return `<line x1="${px}" y1="-200" x2="${px - 60}" y2="90"/>`;
  }).join('');
  return `
<g transform="translate(${x},${y}) scale(${s})">
  <ellipse cx="0" cy="20" rx="150" ry="205" fill="${accent}" opacity="0.05"/>
  <path d="${jacket}" fill="${color}" opacity="0.94"/>
  <clipPath id="${clipId}"><path d="${jacket}"/></clipPath>
  <g clip-path="url(#${clipId})" stroke="${accent}" stroke-opacity="0.07" stroke-width="1">${stripes}</g>
  <g fill="none" stroke="${ARTICLE_INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
    <path d="M-76 -148 L-34 -184 L0 -150 L34 -184 L76 -148"/>
    <path d="M-76 -148 L-84 44 L-44 58 L-40 -18"/>
    <path d="M76 -148 L84 44 L44 58 L40 -18"/>
    <path d="M-40 -18 L40 -18"/>
    <path d="M-34 -184 L0 -150 L-30 -66 L0 -18"/>
    <path d="M34 -184 L0 -150 L30 -66 L0 -18"/>
    <path d="M-40 58 L40 58 L46 176 L20 176 L8 96 L-8 96 L-20 176 L-46 176 Z"/>
    <path d="M-8 96 L8 96"/>
  </g>
  <g fill="none" stroke="${accent}" stroke-width="1.4" stroke-dasharray="2 4" stroke-opacity="0.55" stroke-linecap="round">
    <path d="M-34 -184 L0 -150 L-30 -66"/>
    <path d="M34 -184 L0 -150 L30 -66"/>
  </g>
  <path d="M-30 -66 L0 -18 L30 -66 L30 12 L0 58 L-30 12 Z" fill="${ARTICLE_INK}" opacity="0.95"/>
  <path d="M-7 8 L7 8 L7 96 L0 112 L-7 96 Z" fill="${accent}"/>
  <path d="M-64 -34 L-26 -34" fill="none" stroke="${ARTICLE_INK}" stroke-width="2" stroke-opacity="0.45" stroke-linecap="round"/>
  <path d="M-62 -34 L-58 -58 L-44 -44 L-30 -58 L-26 -34 Z" fill="${accent}" opacity="0.85"/>
  <path d="M-58 -58 L-44 -44 L-50 -34 L-60 -40 Z" fill="#ffffff" opacity="0.25"/>
</g>`;
};

// چوب‌لباسی
const hangerArt = (x: number, y: number, s: number, accent: string, withSuit: boolean): string => `
<g transform="translate(${x},${y}) scale(${s})" fill="none" stroke="${ARTICLE_INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
  <path d="M0 -120 C 0 -150, -26 -150, -26 -126"/>
  <path d="M0 -104 L-150 30 L150 30 L0 -104 Z"/>
  ${withSuit ? `<path d="M-150 30 L-160 210 L-40 210 L-20 40 L20 40 L40 210 L160 210 L150 30" stroke-width="3"/><path d="M-20 40 L0 70 L20 40"/>` : ''}
  <path d="M-150 30 L150 30" stroke="${accent}" stroke-opacity="0.6" stroke-width="2"/>
</g>`;

// برس لباس
const brushArt = (x: number, y: number, s: number): string => `
<g transform="translate(${x},${y}) scale(${s})">
  <rect x="-150" y="-40" width="300" height="80" rx="10" fill="#1c1c1c" stroke="${ARTICLE_INK}" stroke-width="3"/>
  <g stroke="${ARTICLE_INK}" stroke-width="3" stroke-linecap="round">
    <line x1="-130" y1="40" x2="-130" y2="70"/><line x1="-90" y1="40" x2="-90" y2="70"/>
    <line x1="-50" y1="40" x2="-50" y2="70"/><line x1="-10" y1="40" x2="-10" y2="70"/>
    <line x1="30" y1="40" x2="30" y2="70"/><line x1="70" y1="40" x2="70" y2="70"/>
    <line x1="110" y1="40" x2="110" y2="70"/>
  </g>
  <line x1="-150" y1="-40" x2="150" y2="-40" stroke="#c9a24a" stroke-opacity="0.5" stroke-width="2"/>
</g>`;

// نوار اندازه‌گیری
const tapeArt = (x: number, y: number, s: number, accent: string): string => `
<g transform="translate(${x},${y}) scale(${s})">
  <path d="M-240 60 C -140 -90, 40 -90, 120 20 C 190 116, 280 110, 320 20"
        fill="none" stroke="${ARTICLE_INK}" stroke-width="30" stroke-linecap="round" opacity="0.95"/>
  <path d="M-240 60 C -140 -90, 40 -90, 120 20 C 190 116, 280 110, 320 20"
        fill="none" stroke="#0d0d0d" stroke-width="22" stroke-dasharray="4 22" stroke-linecap="round"/>
  <g stroke="${accent}" stroke-width="2" opacity="0.85" transform="translate(0,0)">
    <line x1="-200" y1="6" x2="-200" y2="30"/><line x1="-140" y1="-34" x2="-140" y2="-8"/>
    <line x1="-60" y1="-58" x2="-60" y2="-32"/><line x1="20" y1="-58" x2="20" y2="-32"/>
    <line x1="100" y1="-20" x2="100" y2="6"/><line x1="200" y1="60" x2="200" y2="86"/>
    <line x1="280" y1="60" x2="280" y2="86"/>
  </g>
</g>`;

// قیچی خیاطی
const scissorsArt = (x: number, y: number, s: number, accent: string): string => `
<g transform="translate(${x},${y}) scale(${s})" fill="none" stroke="${ARTICLE_INK}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="-120" cy="90" r="34"/><circle cx="-40" cy="150" r="34"/>
  <path d="M-96 64 L150 -140"/>
  <path d="M-20 128 L150 -40"/>
  <path d="M150 -140 L186 -104 L120 -40 Z" fill="${accent}" stroke="none" opacity="0.85"/>
  <path d="M150 -40 L186 -4 L120 60 Z" fill="${accent}" stroke="none" opacity="0.6"/>
  <path d="M-96 64 L-40 150" stroke-opacity="0.5"/>
</g>`;

// سوزن و نخ
const needleArt = (x: number, y: number, s: number, accent: string): string => `
<g transform="translate(${x},${y}) scale(${s})" fill="none" stroke-linecap="round">
  <line x1="-210" y1="120" x2="150" y2="-120" stroke="${ARTICLE_INK}" stroke-width="5"/>
  <circle cx="150" cy="-120" r="9" fill="${ARTICLE_INK}" stroke="none"/>
  <path d="M150 -120 C 120 -40, 40 -20, 30 40 C 22 90, 80 120, 130 90 C 180 60, 150 10, 100 30"
        stroke="${accent}" stroke-width="3" stroke-dasharray="6 8" opacity="0.9"/>
</g>`;

// اتوی بخار
const ironArt = (x: number, y: number, s: number, accent: string): string => `
<g transform="translate(${x},${y}) scale(${s})" fill="none" stroke="${ARTICLE_INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
  <path d="M-110 34 L92 34 C124 34 124 -6 92 -20 L-56 -20 C-96 -20 -110 0 -110 34 Z"/>
  <path d="M-72 -20 C -72 -78, 34 -78, 44 -20"/>
  <line x1="-120" y1="34" x2="104" y2="34"/>
  <circle cx="-52" cy="6" r="4" fill="${accent}" stroke="none"/>
  <path d="M58 -70 C 82 -92 56 -112 80 -136" stroke="${accent}" stroke-width="2" stroke-dasharray="4 8" opacity="0.6"/>
  <path d="M88 -62 C 112 -84 86 -104 110 -128" stroke="${accent}" stroke-width="2" stroke-dasharray="4 8" opacity="0.4"/>
</g>`;

// کراوات + ساعت (اکسسوری)
const accessoriesArt = (x: number, y: number, s: number, accent: string): string => `
<g transform="translate(${x},${y}) scale(${s})">
  <g transform="translate(-150,-20)" fill="none" stroke="${ARTICLE_INK}" stroke-width="3" stroke-linejoin="round">
    <path d="M-78 -180 L-10 -142 L-24 -70 L-70 -108 Z"/>
    <path d="M78 -180 L10 -142 L24 -70 L70 -108 Z"/>
    <path d="M-78 -180 C -40 -196, 40 -196, 78 -180" stroke-opacity="0.55"/>
    <path d="M-70 -108 L-64 120" stroke-opacity="0.3"/>
    <path d="M70 -108 L64 120" stroke-opacity="0.3"/>
  </g>
  <g transform="translate(-150,-20)">
    <path d="M-34 -150 L34 -150 L20 -96 L-20 -96 Z" fill="${accent}" opacity="0.9"/>
    <path d="M-20 -96 L20 -96 L34 150 L0 196 L-34 150 Z" fill="none" stroke="${ARTICLE_INK}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M-20 -96 L20 -96" stroke="${ARTICLE_INK}" stroke-width="4"/>
    <path d="M-9 -66 L9 -26 M-8 22 L8 62" stroke="${accent}" stroke-opacity="0.45" stroke-width="4" stroke-linecap="round"/>
  </g>
  <g transform="translate(180,0)" fill="none" stroke="${ARTICLE_INK}" stroke-width="4">
    <circle cx="0" cy="0" r="66"/>
    <path d="M-34 -60 L-40 -150 L40 -150 L34 -60"/>
    <path d="M-34 60 L-40 150 L40 150 L34 60"/>
    <path d="M0 0 L0 -40 M0 0 L30 18" stroke="${accent}" stroke-width="5" stroke-linecap="round"/>
  </g>
  <g transform="translate(-312,120)" fill="none" stroke="${ARTICLE_INK}" stroke-width="2.5" stroke-linejoin="round">
    <rect x="-26" y="-18" width="34" height="26" rx="5"/>
    <circle cx="-9" cy="-5" r="6" fill="${accent}" stroke="none"/>
    <rect x="8" y="16" width="34" height="26" rx="5"/>
    <circle cx="25" cy="29" r="6" fill="${accent}" stroke="none"/>
  </g>
</g>`;

const ARTICLE_ART: Record<string, (accent: string) => string> = {
  'viscose-fabric': (accent) => `
    <defs>
      <linearGradient id="vfCloth" x1="0.1" y1="0" x2="0.9" y2="1">
        <stop offset="0" stop-color="#2c3138"/>
        <stop offset="0.48" stop-color="#3b414b"/>
        <stop offset="1" stop-color="#171a1e"/>
      </linearGradient>
      <linearGradient id="vfSheen" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0"/>
        <stop offset="0.45" stop-color="#ffffff" stop-opacity="0.12"/>
        <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
      </linearGradient>
      <radialGradient id="vfGlow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="${accent}" stop-opacity="0.2"/>
        <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
      </radialGradient>
      <clipPath id="vfClip">
        <path d="M-232 -128 C -160 -184 -80 -108 0 -150 C 84 -194 158 -116 232 -158 L 244 138 C 168 186 92 112 4 160 C -84 208 -158 132 -232 178 Z"/>
      </clipPath>
    </defs>
    <ellipse cx="600" cy="430" rx="380" ry="300" fill="url(#vfGlow)"/>
    <circle cx="600" cy="420" r="298" fill="none" stroke="${accent}" stroke-opacity="0.14" stroke-width="2"/>
    <g transform="translate(600,430)">
      <path d="M-232 -128 C -160 -184 -80 -108 0 -150 C 84 -194 158 -116 232 -158 L 244 138 C 168 186 92 112 4 160 C -84 208 -158 132 -232 178 Z"
            transform="translate(24,6)" fill="#141619" stroke="${ARTICLE_INK}" stroke-opacity="0.22" stroke-width="2"/>
      <g fill="none" stroke="${ARTICLE_INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M0 -298 C 0 -328, -26 -328, -26 -305"/>
        <path d="M0 -284 L-196 -150 L196 -150 L0 -284 Z"/>
      </g>
      <path d="M-196 -150 L196 -150" stroke="${accent}" stroke-opacity="0.6" stroke-width="2" fill="none"/>
      <path d="M-232 -128 C -160 -184 -80 -108 0 -150 C 84 -194 158 -116 232 -158 L 244 138 C 168 186 92 112 4 160 C -84 208 -158 132 -232 178 Z"
            fill="url(#vfCloth)" stroke="${ARTICLE_INK}" stroke-width="2.5" stroke-linejoin="round"/>
      <g clip-path="url(#vfClip)">
        <g fill="none" stroke="#0b0c0e" stroke-width="20" stroke-opacity="0.18" stroke-linecap="round">
          <path d="M-196 -132 C -168 -20 -166 90 -150 172"/>
          <path d="M-44 -152 C -12 -20 -10 110 8 182"/>
          <path d="M122 -150 C 150 -30 154 80 168 150"/>
        </g>
        <g fill="none" stroke="#ffffff" stroke-width="12" stroke-opacity="0.06" stroke-linecap="round">
          <path d="M-122 -148 C -92 -20 -90 100 -72 178"/>
          <path d="M40 -156 C 72 -20 76 100 92 164"/>
          <path d="M196 -146 C 214 -50 216 60 222 128"/>
        </g>
        <g fill="none" stroke="${ARTICLE_INK}" stroke-linecap="round" stroke-width="2">
          <path d="M-196 -132 C -168 -20 -166 90 -150 172" stroke-opacity="0.35"/>
          <path d="M-122 -148 C -92 -20 -90 100 -72 178" stroke-opacity="0.2"/>
          <path d="M-44 -152 C -12 -20 -10 110 8 182" stroke-opacity="0.35"/>
          <path d="M40 -156 C 72 -20 76 100 92 164" stroke-opacity="0.2"/>
          <path d="M122 -150 C 150 -30 154 80 168 150" stroke-opacity="0.35"/>
          <path d="M196 -146 C 214 -50 216 60 222 128" stroke-opacity="0.2"/>
        </g>
        <path d="M-150 -240 L-30 -240 L-150 240 L-270 240 Z" fill="url(#vfSheen)"/>
        <g fill="none" stroke="${accent}" stroke-width="1.6" stroke-opacity="0.42">
          <path d="M-244 -74 C -140 -108 -40 -62 60 -96 C 150 -126 200 -96 250 -120"/>
          <path d="M-244 -14 C -140 -48 -40 -2 60 -36 C 150 -66 200 -36 250 -60"/>
          <path d="M-244 46 C -140 12 -40 58 60 24 C 150 -6 200 24 250 0"/>
          <path d="M-240 104 C -140 70 -40 116 60 82 C 150 52 200 84 250 60"/>
        </g>
      </g>
      <path d="M-232 -128 C -160 -184 -80 -108 0 -150 C 84 -194 158 -116 232 -158"
            fill="none" stroke="#f2efe8" stroke-opacity="0.9" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M-226 -110 C -156 -166 -80 -90 2 -132 C 86 -176 156 -98 226 -140"
            fill="none" stroke="${accent}" stroke-opacity="0.55" stroke-width="1.6" stroke-dasharray="6 8"/>
      <path d="M-232 178 C -158 132 -84 208 4 160 C 92 112 168 186 244 138"
            fill="none" stroke="${accent}" stroke-opacity="0.5" stroke-width="2" stroke-dasharray="7 9"/>
      <g transform="translate(-176,148)">
        <path d="M0 0 L10 46" fill="none" stroke="${accent}" stroke-opacity="0.6" stroke-width="1.5"/>
        <circle cx="10" cy="48" r="5" fill="none" stroke="${accent}" stroke-opacity="0.6" stroke-width="1.5"/>
        <g transform="translate(-32,54) rotate(-7)">
          <rect width="150" height="64" rx="7" fill="#101215" stroke="${accent}" stroke-opacity="0.5" stroke-width="1.5"/>
          <rect x="14" y="13" width="30" height="2" fill="${accent}" opacity="0.55"/>
          <text x="20" y="44" fill="#e9e4d9" font-family="Vazirmatn, sans-serif" font-size="19" letter-spacing="5">VISCOSE</text>
        </g>
      </g>
    </g>`,
  'how-to-choose-suit': (accent) => `
    <circle cx="600" cy="390" r="255" fill="none" stroke="${accent}" stroke-opacity="0.08" stroke-width="2"/>
    ${suitGroup(420, 400, 0.72, '#161616', accent)}
    ${suitGroup(600, 380, 0.92, '#1a1a1a', accent)}
    ${suitGroup(780, 400, 0.72, '#161616', accent)}
    <g font-family="Vazirmatn, sans-serif" font-size="14" letter-spacing="3" text-anchor="middle" fill="${accent}" opacity="0.75">
      <text x="420" y="620">01</text>
      <text x="600" y="620">02</text>
      <text x="780" y="620">03</text>
    </g>
    <g stroke="${accent}" stroke-opacity="0.3" stroke-width="1.5">
      <line x1="370" y1="632" x2="470" y2="632"/>
      <line x1="550" y1="632" x2="650" y2="632"/>
      <line x1="730" y1="632" x2="830" y2="632"/>
    </g>`,
  'fabric-types-difference': (accent) => {
    const viscoseWeave = Array.from({ length: 10 }, (_, i) => {
      const px = -88 + i * 19;
      return `<path d="M${px} -136 C ${px + 9} -60 ${px - 9} 60 ${px} 136"/>`;
    }).join('');
    const polyWeave =
      Array.from({ length: 7 }, (_, i) => {
        const py = -120 + i * 40;
        return `<line x1="-88" y1="${py}" x2="88" y2="${py}"/>`;
      }).join('') +
      Array.from({ length: 7 }, (_, i) => {
        const px = -84 + i * 28;
        return `<line x1="${px}" y1="-132" x2="${px}" y2="132"/>`;
      }).join('');
    const woolWeave = Array.from({ length: 30 }, (_, i) => {
      const px = -78 + (i % 6) * 31;
      const py = -118 + Math.floor(i / 6) * 46;
      return `<path d="M${px} ${py} q 9 11 2 20"/>`;
    }).join('');
    const swatch = (tx: number, label: string, weave: string, fill: string) => `
      <g transform="translate(${tx},0)">
        <rect x="-100" y="-140" width="200" height="280" rx="8" fill="#0b0c0e" opacity="0.55" transform="translate(6,8)"/>
        <rect x="-100" y="-140" width="200" height="280" rx="8" fill="${fill}" stroke="${ARTICLE_INK}" stroke-opacity="0.85" stroke-width="2.5"/>
        <g fill="none" stroke="${accent}" stroke-width="1.4" stroke-opacity="0.35">${weave}</g>
        <g transform="translate(0,-140)">
          <rect x="-30" y="-13" width="60" height="24" rx="4" fill="#101215" stroke="${accent}" stroke-opacity="0.6"/>
          <circle cx="0" cy="-1" r="3.4" fill="none" stroke="${accent}" stroke-opacity="0.75"/>
        </g>
        <text y="180" text-anchor="middle" fill="#8f8b83" font-family="Vazirmatn, sans-serif" font-size="15" letter-spacing="3">${label}</text>
      </g>`;
    return `
    <g transform="translate(600,390)">
      ${swatch(-260, 'VISCOSE', viscoseWeave, '#24272c')}
      ${swatch(0, 'POLYESTER', polyWeave, '#20242a')}
      ${swatch(260, 'WOOL', woolWeave, '#26241f')}
    </g>`;
  },
  'suit-size-guide': (accent) => `
    <circle cx="620" cy="360" r="225" fill="none" stroke="${accent}" stroke-opacity="0.09" stroke-width="2"/>
    ${suitGroup(620, 348, 0.95, '#161616', accent)}
    ${tapeArt(560, 605, 0.78, accent)}
    <g transform="translate(322,360)" fill="none" stroke="${accent}" stroke-opacity="0.5" stroke-width="1.6">
      <line x1="0" y1="-160" x2="0" y2="160" stroke-dasharray="4 7"/>
      <path d="M-7 -150 L0 -162 L7 -150"/>
      <path d="M-7 150 L0 162 L7 150"/>
      <line x1="-9" y1="-120" x2="9" y2="-120" stroke-opacity="0.6"/>
      <line x1="-9" y1="-80" x2="9" y2="-80" stroke-opacity="0.6"/>
      <line x1="-9" y1="-40" x2="9" y2="-40" stroke-opacity="0.6"/>
      <line x1="-9" y1="0" x2="9" y2="0" stroke-opacity="0.6"/>
      <line x1="-9" y1="40" x2="9" y2="40" stroke-opacity="0.6"/>
      <line x1="-9" y1="80" x2="9" y2="80" stroke-opacity="0.6"/>
      <line x1="-9" y1="120" x2="9" y2="120" stroke-opacity="0.6"/>
    </g>`,
  'suit-care-guide': (accent) => `
    ${hangerArt(500, 350, 0.95, accent, true)}
    ${ironArt(825, 405, 0.78, accent)}
    ${brushArt(825, 585, 0.6)}`,
  'black-suit-guide': (accent) => `
    <circle cx="600" cy="390" r="235" fill="none" stroke="${accent}" stroke-opacity="0.1" stroke-width="2"/>
    ${suitGroup(600, 390, 1.05, '#141414', accent)}
    <g font-family="Vazirmatn, sans-serif" text-anchor="middle" fill="${accent}" opacity="0.75">
      <text x="600" y="680" font-size="14" letter-spacing="4">THE BLACK SUIT</text>
      <line x1="540" y1="694" x2="660" y2="694" stroke="${accent}" stroke-opacity="0.4" stroke-width="1.5"/>
    </g>`,
  'slim-versus-classic-fit': (accent) => `
    <g transform="translate(600,400)" stroke="#ffffff" stroke-opacity="0.12" stroke-width="1">
      <line x1="0" y1="-260" x2="0" y2="260"/>
    </g>
    ${suitGroup(430, 380, 0.9, '#161616', accent)}
    <g transform="translate(770,380) scale(1.12,0.9)">${suitGroup(0, 0, 0.9, '#161616', accent)}</g>
    <g font-family="Vazirmatn, sans-serif" font-size="15" letter-spacing="4" text-anchor="middle" fill="${accent}" opacity="0.8">
      <text x="430" y="640">SLIM</text>
      <text x="770" y="640">CLASSIC</text>
    </g>
    <g stroke="${accent}" stroke-opacity="0.35" stroke-width="1.5">
      <line x1="360" y1="654" x2="500" y2="654"/>
      <line x1="700" y1="654" x2="840" y2="654"/>
    </g>`,
  'italian-versus-english-tailoring': (accent) => `
    ${scissorsArt(470, 375, 1.0, accent)}
    ${needleArt(760, 375, 0.9, accent)}
    <g font-family="Vazirmatn, sans-serif" font-size="14" letter-spacing="4" text-anchor="middle" fill="${accent}" opacity="0.8">
      <text x="470" y="620">ITALIAN</text>
      <text x="760" y="620">ENGLISH</text>
    </g>
    <g stroke="${accent}" stroke-opacity="0.35" stroke-width="1.5">
      <line x1="390" y1="634" x2="550" y2="634"/>
      <line x1="680" y1="634" x2="840" y2="634"/>
    </g>`,
  'navy-suit-guide': (accent) => `
    <circle cx="600" cy="390" r="235" fill="none" stroke="${accent}" stroke-opacity="0.1" stroke-width="2"/>
    ${suitGroup(600, 390, 1.05, '#172034', accent)}
    <g font-family="Vazirmatn, sans-serif" text-anchor="middle" fill="${accent}" opacity="0.75">
      <text x="600" y="680" font-size="14" letter-spacing="4">THE NAVY SUIT</text>
      <line x1="540" y1="694" x2="660" y2="694" stroke="${accent}" stroke-opacity="0.4" stroke-width="1.5"/>
    </g>`,
  'shirt-accessories-guide': (accent) => `${accessoriesArt(600, 400, 0.92, accent)}`,
};

const ARTICLE_COVER = (slug: string, accent: string): string => {
  const art = ARTICLE_ART[slug];
  const inner = art
    ? art(accent)
    : `<g transform="translate(600,400)" fill="none" stroke="${ARTICLE_INK}" stroke-width="3"><rect x="-240" y="-150" width="480" height="300" rx="8"/></g>`;
  return articleFrame(inner, accent);
};

const HERO_IMAGE = `
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
  <defs>
    <linearGradient id="bgH" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0c0c0c"/>
      <stop offset="1" stop-color="#050505"/>
    </linearGradient>
    <radialGradient id="hg" cx="0.65" cy="0.35" r="0.5">
      <stop offset="0" stop-color="#88888826"/>
      <stop offset="1" stop-color="#88888800"/>
    </radialGradient>
    <linearGradient id="hsuit" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1a1a1a"/>
      <stop offset="1" stop-color="#000"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="1000" fill="url(#bgH)"/>
  <rect width="1600" height="1000" fill="url(#hg)"/>
  <!-- suit silhouette -->
  <path d="M640 430 L700 330 L810 400 L920 330 L980 430 L990 800 L880 820 L865 590 L755 590 L740 820 L630 800 Z" fill="url(#hsuit)" stroke="#2a2a2a" stroke-width="2"/>
  <path d="M700 330 L810 400 L810 520 L755 470 Z" fill="#d8d5cd"/>
  <path d="M920 330 L810 400 L810 520 L865 470 Z" fill="#b9b6ad"/>
  <path d="M780 470 L840 470 L840 700 L810 720 L780 700 Z" fill="#d8d5cd"/>
  <path d="M740 820 L880 820 L900 990 L840 990 L810 860 L790 860 L760 990 L720 990 Z" fill="url(#hsuit)"/>
  <rect x="60" y="60" width="34" height="8" rx="4" fill="#c9a24a" opacity="0.9"/>
  <rect x="98" y="60" width="8" height="34" rx="4" fill="#c9a24a" opacity="0.9"/>
  <text x="60" y="920" fill="#3d3d3d" font-family="Garamond, Georgia, serif" font-size="24" letter-spacing="10">CAVERO</text>
</svg>`;

interface ProductColors {
  color: string;
  accent: string;
  hex: string;
}

export const PRODUCT_COLOR_MAP: Record<string, ProductColors> = {
  black: { color: '#181818', accent: '#cfc9bd', hex: '#181818' },
  navy: { color: '#1c2330', accent: '#c3c9d4', hex: '#1c2330' },
  charcoal: { color: '#2b2b2e', accent: '#d0ccc4', hex: '#2b2b2e' },
  grey: { color: '#3d3f42', accent: '#e0ddd6', hex: '#3d3f42' },
  ivory: { color: '#d9d4c9', accent: '#4a4539', hex: '#d9d4c9' },
  espresso: { color: '#2b2118', accent: '#c8b99e', hex: '#2b2118' },
  emerald: { color: '#0f2623', accent: '#bfd8cd', hex: '#0f2623' },
  burgundy: { color: '#2a1118', accent: '#d9b9c0', hex: '#2a1118' },
};

export function generateProductImages(
  slug: string,
  colorKey: string,
  productLabel: string
): { url: string; type: 'main' | 'gallery'; label: string }[] {
  const c = PRODUCT_COLOR_MAP[colorKey] ?? PRODUCT_COLOR_MAP.black;
  const base = path.join(process.cwd(), 'public', 'images', 'products', slug);
  fs.mkdirSync(base, { recursive: true });

  const files = [
    { name: 'front.svg', svg: SUIT_FRONT(c.color, c.accent, productLabel), label: 'نمای جلو' },
    { name: 'back.svg', svg: SUIT_BACK(c.color, c.accent, productLabel), label: 'نمای پشت' },
    { name: 'fabric.svg', svg: FABRIC_DETAIL(c.color, c.accent, productLabel), label: 'جزئیات پارچه' },
    { name: 'stitching.svg', svg: STITCHING_DETAIL(c.color, c.accent, productLabel), label: 'جزئیات دوخت' },
    { name: 'design.svg', svg: DESIGN_DETAIL(c.color, c.accent, productLabel), label: 'جزئیات طراحی' },
  ];

  return files.map((f, i) => {
    fs.writeFileSync(path.join(base, f.name), f.svg, 'utf8');
    const url = `/images/products/${slug}/${f.name}`;
    return { url, type: i === 0 ? ('main' as const) : ('gallery' as const), label: f.label };
  });
}

export function generateArticleCover(slug: string, accent: string): string {
  const dir = path.join(process.cwd(), 'public', 'images', 'articles', slug);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'cover.svg');
  fs.writeFileSync(file, ARTICLE_COVER(slug, accent), 'utf8');
  return `/images/articles/${slug}/cover.svg`;
}

export function generateHero(): string {
  const dir = path.join(process.cwd(), 'public', 'images');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'hero.svg');
  fs.writeFileSync(file, HERO_IMAGE, 'utf8');
  return '/images/hero.svg';
}