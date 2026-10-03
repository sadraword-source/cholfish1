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
  ${inner}
</svg>`;

// شِلایه کت‌وشلوار به‌صورت خطی (fashion sketch)
const suitGroup = (x: number, y: number, s: number, color: string, accent: string): string => `
<g transform="translate(${x},${y}) scale(${s})">
  <ellipse cx="0" cy="20" rx="150" ry="205" fill="${accent}" opacity="0.05"/>
  <path d="M-76 -148 L-34 -184 L0 -150 L34 -184 L76 -148 L84 44 L44 58 L40 -18 L-40 -18 L-44 58 L-84 44 Z" fill="${color}" opacity="0.9"/>
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
  <path d="M-30 -66 L0 -18 L30 -66 L30 12 L0 58 L-30 12 Z" fill="${ARTICLE_INK}" opacity="0.95"/>
  <path d="M-7 8 L7 8 L7 96 L0 112 L-7 96 Z" fill="${accent}"/>
</g>`;

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

// کراوات + ساعت (اکسسوری)
const accessoriesArt = (x: number, y: number, s: number, accent: string): string => `
<g transform="translate(${x},${y}) scale(${s})">
  <g transform="translate(-150,-20)">
    <path d="M-34 -150 L34 -150 L20 -96 L-20 -96 Z" fill="${accent}" opacity="0.9"/>
    <path d="M-20 -96 L20 -96 L34 150 L0 196 L-34 150 Z" fill="none" stroke="${ARTICLE_INK}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M-20 -96 L20 -96" stroke="${ARTICLE_INK}" stroke-width="4"/>
  </g>
  <g transform="translate(180,0)" fill="none" stroke="${ARTICLE_INK}" stroke-width="4">
    <circle cx="0" cy="0" r="66"/>
    <path d="M-34 -60 L-40 -150 L40 -150 L34 -60"/>
    <path d="M-34 60 L-40 150 L40 150 L34 60"/>
    <path d="M0 0 L0 -40 M0 0 L30 18" stroke="${accent}" stroke-width="5" stroke-linecap="round"/>
  </g>
</g>`;

const ARTICLE_ART: Record<string, (accent: string) => string> = {
  'viscose-fabric': () => `
    <g transform="translate(600,400)" fill="none" stroke="${ARTICLE_INK}" stroke-width="3" stroke-linecap="round">
      <rect x="-240" y="-150" width="480" height="300" rx="8"/>
      <path d="M-240 -60 C -140 -120, -40 0, 60 -60 C 150 -112, 200 -70, 240 -40"/>
      <path d="M-240 20 C -140 -40, -40 80, 60 20 C 150 -32, 200 10, 240 40"/>
      <path d="M-240 100 C -140 40, -40 160, 60 100 C 150 48, 200 90, 240 120"/>
      <g stroke="#c9a24a" stroke-opacity="0.55" stroke-width="2">
        <line x1="-200" y1="-130" x2="-200" y2="130"/><line x1="-120" y1="-138" x2="-120" y2="138"/>
        <line x1="-40" y1="-144" x2="-40" y2="144"/><line x1="40" y1="-144" x2="40" y2="144"/>
        <line x1="120" y1="-138" x2="120" y2="138"/><line x1="200" y1="-130" x2="200" y2="130"/>
      </g>
    </g>`,
  'how-to-choose-suit': () => `
    ${suitGroup(420, 400, 0.72, '#161616', '#c9a24a')}
    ${suitGroup(600, 380, 0.92, '#1a1a1a', '#c9a24a')}
    ${suitGroup(780, 400, 0.72, '#161616', '#c9a24a')}`,
  'fabric-types-difference': () => `
    <g transform="translate(600,400)" fill="none" stroke="${ARTICLE_INK}" stroke-width="3">
      <rect x="-330" y="-140" width="200" height="280" rx="6"/>
      <rect x="-100" y="-170" width="200" height="340" rx="6" transform="translate(0,-6)"/>
      <rect x="130" y="-140" width="200" height="280" rx="6"/>
      <g stroke="#c9a24a" stroke-opacity="0.45" stroke-width="2">
        <line x1="-310" y1="-120" x2="-150" y2="-120"/><line x1="-310" y1="-100" x2="-150" y2="-100"/>
        <line x1="-310" y1="-80" x2="-150" y2="-80"/><line x1="-310" y1="-60" x2="-150" y2="-60"/>
        <line x1="-80" y1="-140" x2="80" y2="-140"/><line x1="-80" y1="-120" x2="80" y2="-120"/>
        <line x1="-80" y1="-100" x2="80" y2="-100"/><line x1="-80" y1="-80" x2="80" y2="-80"/>
        <line x1="150" y1="-120" x2="310" y2="-120"/><line x1="150" y1="-100" x2="310" y2="-100"/>
        <line x1="150" y1="-80" x2="310" y2="-80"/><line x1="150" y1="-60" x2="310" y2="-60"/>
      </g>
    </g>`,
  'suit-size-guide': () => `
    ${suitGroup(660, 380, 0.95, '#161616', '#c9a24a')}
    ${tapeArt(590, 560, 0.72, '#c9a24a')}`,
  'suit-care-guide': () => `
    ${hangerArt(560, 360, 1.0, '#c9a24a', true)}
    ${brushArt(600, 660, 0.66)}`,
  'black-suit-guide': () => `${suitGroup(600, 390, 1.05, '#141414', '#c9a24a')}`,
  'slim-versus-classic-fit': () => `
    <g transform="translate(600,400)" stroke="#ffffff" stroke-opacity="0.12" stroke-width="1">
      <line x1="0" y1="-260" x2="0" y2="260"/>
    </g>
    ${suitGroup(430, 390, 0.9, '#161616', '#c9a24a')}
    <g transform="translate(770,390) scale(1.12,0.9)">${suitGroup(0, 0, 0.9, '#161616', '#c9a24a')}</g>`,
  'italian-versus-english-tailoring': () => `
    ${scissorsArt(470, 380, 1.0, '#c9a24a')}
    ${needleArt(760, 380, 0.9, '#c9a24a')}`,
  'navy-suit-guide': () => `${suitGroup(600, 390, 1.05, '#172034', '#c9a24a')}`,
  'shirt-accessories-guide': () => `${accessoriesArt(600, 400, 0.92, '#c9a24a')}`,
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
  <text x="60" y="920" fill="#3d3d3d" font-family="Vazirmatn, sans-serif" font-size="20" letter-spacing="8">SADRA</text>
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