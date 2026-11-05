import bcrypt from 'bcryptjs';
import { runMigrations } from './schema.js';
import {
  db,
  withTransaction,
  ensureDatabase,
  closePool,
  DATABASE_INFO,
} from './connection.js';
import {
  generateProductImages,
  generateArticleCover,
  generateHero,
} from './placeholders.js';

interface SeedImage {
  url: string;
  type: 'main' | 'gallery';
  label: string;
}

interface SeedProduct {
  name: string;
  slug: string;
  description: string;
  price: number;
  oldPrice?: number;
  fabric: string;
  fit: string;
  stitching: string;
  colorKey: string;
  colorLabel: string;
  featured?: boolean;
  sizes: Record<string, number>; // sizeCode -> stock
}

interface SeedArticle {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  fabric?: string;
  category: string;
}

async function findId(tx: typeof db, table: string, value: string): Promise<number> {
  const isSizes = table === 'sizes';
  const keyColumn = isSizes ? 'code' : 'slug';
  const row = (await tx.prepare(`SELECT id FROM ${table} WHERE ${keyColumn} = ?`).get(value)) as
    | { id: number }
    | undefined;
  if (!row) throw new Error(`not found: ${table}.${value}`);
  return row.id;
}

async function seedFabricsAndFits(tx: typeof db): Promise<void> {
  const fabrics = [
    {
      name: 'ویسکوز',
      slug: 'viscose',
      image_url: '/images/fabrics/viscose.svg',
      description:
        'پارچه ویسکوز یکی از محبوب‌ترین انتخاب‌ها برای کت‌وشلوار مردانه است. نرم، سبک، لطیف و با درخشش ملایم؛ برای فصل‌های گرم و استایل‌های رسمی روزمره انتخابی ایده‌آل است. این پارچه با ترکیبی از الیاف طبیعی تهیه شده و به سادگی چروک نمی‌خورد.',
    },
    {
      name: 'ویسکوز-پلی‌استر',
      slug: 'viscose-polyester',
      image_url: '/images/fabrics/viscose-polyester.svg',
      description:
        'ترکیب ویسکوز با پلی‌استر، پارچه‌ای مقاوم، ماندگار و با فرم‌پذیری عالی می‌سازد. این جنس برای کت‌وشلوارهایی که پوشیدن روزانه دارند بسیار مناسب است و درخشش و لطافت ویسکوز را با استحکام پلی‌استر ترکیب می‌کند.',
    },
    {
      name: 'پشم-ویسکوز',
      slug: 'wool-viscose',
      image_url: '/images/fabrics/wool-viscose.svg',
      description:
        'ترکیب پشم و ویسکوز، تعادلی بین گرمای پشم طبیعی و لطافت ویسکوز است. این پارچه برای فصل‌های سرد، جلسات رسمی و مجالس انتخاب درجه‌یک محسوب می‌شود و ظاهری لوکس به استایل شما می‌بخشد.',
    },
  ];

  const fits = [
    { name: 'اسلیم‌فیت', slug: 'slim-fit', description: 'برش چسبان و مدرن، مناسب اندام‌های متناسب' },
    { name: 'کلاسیک', slug: 'classic', description: 'برش آزاد و کلاسیک با راحتی بیشتر' },
  ];

  for (const f of fabrics) {
    await tx
      .prepare('INSERT INTO fabrics (name, slug, description, image_url) VALUES (?, ?, ?, ?)')
      .run(f.name, f.slug, f.description, f.image_url);
  }
  for (const f of fits) {
    await tx.prepare('INSERT INTO fits (name, slug, description) VALUES (?, ?, ?)').run(f.name, f.slug, f.description);
  }
}

async function seedSizes(tx: typeof db): Promise<void> {
  const sizes = [
    { code: '44', label: '44', chest: [84, 90], waist: [70, 78] },
    { code: '46', label: '46', chest: [90, 94], waist: [76, 84] },
    { code: '48', label: '48', chest: [94, 98], waist: [80, 88] },
    { code: '50', label: '50', chest: [98, 102], waist: [84, 92] },
    { code: '52', label: '52', chest: [102, 106], waist: [88, 96] },
    { code: '54', label: '54', chest: [106, 110], waist: [92, 100] },
    { code: '56', label: '56', chest: [110, 114], waist: [96, 104] },
    { code: '58', label: '58', chest: [114, 118], waist: [100, 108] },
  ];
  for (const s of sizes) {
    await tx
      .prepare(
        'INSERT INTO sizes (code, label, min_chest_cm, max_chest_cm, min_waist_cm, max_waist_cm, min_height_cm, max_height_cm) VALUES (?, ?, ?, ?, ?, ?, 165, 200)'
      )
      .run(s.code, s.label, s.chest[0], s.chest[1], s.waist[0], s.waist[1]);
  }
}

async function seedProducts(tx: typeof db, products: SeedProduct[]): Promise<void> {
  for (const p of products) {
    const fabricId = await findId(tx, 'fabrics', p.fabric);
    const fitId = await findId(tx, 'fits', p.fit);

    const result = await tx
      .prepare(
        `INSERT INTO products (name, slug, description, price, old_price, fabric_id, fit_id, stitching_type, color, is_featured, meta_title, meta_description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        p.name,
        p.slug,
        p.description,
        p.price,
        p.oldPrice ?? null,
        fabricId,
        fitId,
        p.stitching,
        p.colorLabel,
        p.featured ? 1 : 0,
        `${p.name} | CAVERO استایل`,
        `${p.name} با برش ${p.fit === 'slim-fit' ? 'اسلیم‌فیت' : 'کلاسیک'} و جنس ${p.colorLabel}. خرید با کیفیت بالا و قیمت مناسب از CAVERO.`
      );

    const productId = Number(result.lastInsertRowid);

    const images: SeedImage[] = generateProductImages(p.slug, p.colorKey, p.name);
    for (let idx = 0; idx < images.length; idx += 1) {
      const img = images[idx];
      await tx
        .prepare(
          'INSERT INTO product_images (product_id, url, alt, image_type, sort_order) VALUES (?, ?, ?, ?, ?)'
        )
        .run(productId, img.url, img.label, img.type, idx);
    }

    const defaultSizes: Record<string, number> = {
      '44': 0,
      '46': 0,
      '48': 0,
      '50': 0,
      '52': 0,
      '54': 0,
      '56': 0,
      '58': 0,
      ...p.sizes,
    };
    for (const [code, stock] of Object.entries(defaultSizes)) {
      const sizeId = await findId(tx, 'sizes', code);
      const available = Math.max(Math.min(stock ?? 0, 20), 0);
      await tx
        .prepare('INSERT INTO product_sizes (product_id, size_id, stock) VALUES (?, ?, ?)')
        .run(productId, sizeId, available);
    }
  }
}

async function seedUsers(tx: typeof db): Promise<void> {
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminHash = bcrypt.hashSync(adminPassword, 10);
  const demoHash = bcrypt.hashSync('Demo@1234', 10);

  await tx
    .prepare('INSERT INTO users (phone, username, full_name, password_hash, role) VALUES (?, ?, ?, ?, ?)')
    .run('09120000000', adminUsername, 'مدیر CAVERO', adminHash, 'admin');
  await tx.prepare('INSERT INTO carts (user_id) VALUES (?)').run(
    (await tx.prepare('SELECT id FROM users WHERE phone = ?').get('09120000000') as { id: number }).id
  );

  await tx.prepare('INSERT INTO users (phone, full_name, password_hash, role) VALUES (?, ?, ?, ?)').run(
    '09123456789',
    'کاربر نمونه',
    demoHash,
    'user'
  );
  const demo = (await tx.prepare('SELECT id FROM users WHERE phone = ?').get('09123456789')) as { id: number };
  await tx.prepare('INSERT INTO carts (user_id) VALUES (?)').run(demo.id);

  await tx
    .prepare(
      `INSERT INTO user_measurements (user_id, height_cm, weight_kg, chest_cm, waist_cm, suggested_size)
       VALUES (?, 178, 75, 98, 84, '50')`
    )
    .run(demo.id);
}

async function seedArticles(tx: typeof db, articles: SeedArticle[]): Promise<void> {
  const catalog: Record<string, { accent: string }> = {
    viscose: { accent: '#c9a24a' },
    'viscose-polyester': { accent: '#c9a24a' },
    'wool-viscose': { accent: '#c9a24a' },
    default: { accent: '#c9a24a' },
  };

  for (const a of articles) {
    const fabricId = a.fabric ? await findId(tx, 'fabrics', a.fabric) : null;
    const cover = generateArticleCover(a.slug, catalog[a.fabric ?? 'default']?.accent ?? '#c9a24a');

    await tx
      .prepare(
        `INSERT INTO articles (title, slug, excerpt, content, cover_image, fabric_id, category, published_at, meta_title, meta_description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        a.title,
        a.slug,
        a.excerpt,
        a.content,
        cover,
        fabricId,
        a.category,
        new Date(),
        `${a.title} | بلاگ CAVERO`,
        a.excerpt
      );
  }
}

const PRODUCTS: SeedProduct[] = [
  {
    name: 'کت‌وشلوار مشکی اسلیم‌فیت',
    slug: 'black-slim-fit-suit',
    description:
      'کت‌وشلوار مشکی اسلیم‌فیت، ستون اصلی استایل رسمی یک مرد شیک است. این محصول با پارچه ویسکوز درجه‌یک، دوخت ایتالیایی و برش اسلیم طراحی شده تا سیلوئتی کشیده و مدرن روی اندام شما بسازد. برای جلسات کاری، مراسم رسمی و هر موقعیت مهمی که می‌خواهید بی‌نقص دیده شوید.',
    price: 4850000,
    oldPrice: 5900000,
    fabric: 'viscose',
    fit: 'slim-fit',
    stitching: 'دوخت ایتالیایی',
    colorKey: 'black',
    colorLabel: 'مشکی',
    featured: true,
    sizes: { '48': 6, '50': 8, '52': 5, '54': 3 },
  },
  {
    name: 'کت‌وشلوار سرمه‌ای اسلیم‌فیت',
    slug: 'navy-slim-fit-suit',
    description:
      'سرمه‌ای رنگی رایج و درعین‌حال شیک برای کت‌وشلوارهای رسمی است. این مدل اسلیم‌فیت از پارچه ویسکوز با بافتی مات و ظریف تولید شده که هم در جلسات روزانه و هم در مراسم شب درخشش مناسبی دارد. انتخابی هوشمندانه برای مردانی که به جزئیات اهمیت می‌دهند.',
    price: 4750000,
    fabric: 'viscose',
    fit: 'slim-fit',
    stitching: 'دوخت ایتالیایی',
    colorKey: 'navy',
    colorLabel: 'سرمه‌ای',
    featured: true,
    sizes: { '46': 4, '48': 7, '50': 9, '52': 4 },
  },
  {
    name: 'کت‌وشلوار طوسی ذغالی اسلیم‌فیت',
    slug: 'charcoal-slim-fit-suit',
    description:
      'طوسی ذغالی، جایگزین لوکس و مدرن مشکی است. با پارچه ویسکوز نرم و برش اسلیم، این کت‌وشلوار ظاهری متفاوت و خاص به شما می‌دهد و با هر رنگ پیراهن و کراواتی هماهنگ می‌شود.',
    price: 4650000,
    oldPrice: 5400000,
    fabric: 'viscose',
    fit: 'slim-fit',
    stitching: 'دوخت فارسی',
    colorKey: 'charcoal',
    colorLabel: 'طوسی ذغالی',
    sizes: { '48': 5, '50': 7, '52': 6, '54': 2 },
  },
  {
    name: 'کت‌وشلوار خاکستری روشن اسلیم‌فیت',
    slug: 'light-grey-slim-fit-suit',
    description:
      'خاکستری روشن، انتخابی جوان‌پسند برای اسفند و بهار است. این مدل با پارچه ویسکوز و دوخت دقیق، استایلی مدرن و مینیمال می‌سازد که هم در دفتر کار و هم در مهمانی‌ها دیده می‌شود.',
    price: 4500000,
    fabric: 'viscose',
    fit: 'slim-fit',
    stitching: 'دوخت فارسی',
    colorKey: 'grey',
    colorLabel: 'خاکستری روشن',
    sizes: { '46': 5, '48': 6, '50': 4 },
  },
  {
    name: 'کت‌وشلوار عاجی کلاسیک',
    slug: 'ivory-classic-suit',
    description:
      'کت‌وشلوار عاجی با برش کلاسیک، انتخابی چشمگیر برای مجالس و جشن‌هاست. پارچه ویسکوز-پلی‌استر این مدل، هم لطافت ویسکوز را دارد هم ماندگاری پلی‌استر را، و استایلی روشن و لوکس برای شما می‌سازد.',
    price: 5200000,
    oldPrice: 6100000,
    fabric: 'viscose-polyester',
    fit: 'classic',
    stitching: 'دوخت انگلیسی',
    colorKey: 'ivory',
    colorLabel: 'عاجی',
    featured: true,
    sizes: { '48': 4, '50': 6, '52': 5, '54': 3 },
  },
  {
    name: 'کت‌وشلوار اسپرسو اسلیم‌فیت',
    slug: 'espresso-slim-fit-suit',
    description:
      'قهوه‌ای اسپرسو، رنگی گرم، مردانه و خاص برای فصل‌های سرد. این مدل اسلیم‌فیت با پارچه پشم-ویسکوز تولید شده تا علاوه بر ظاهر مجلل، گرمای مناسبی هم داشته باشد.',
    price: 5450000,
    fabric: 'wool-viscose',
    fit: 'slim-fit',
    stitching: 'دوخت ایتالیایی',
    colorKey: 'espresso',
    colorLabel: 'قهوه‌ای اسپرسو',
    sizes: { '48': 3, '50': 5, '52': 6, '54': 4, '56': 2 },
  },
  {
    name: 'کت‌وشلوار سبز یشمی اسلیم‌فیت',
    slug: 'emerald-slim-fit-suit',
    description:
      'سبز یشمی، رنگی لوکس و متفاوت از پالت کلاسیک است. برش اسلیم، پارچه ویسکوز با درخشش ملایم و دوخت ایتالیایی، این کت‌وشلوار را به انتخابی خاص برای شب‌های مهم تبدیل کرده است.',
    price: 5600000,
    oldPrice: 6400000,
    fabric: 'viscose',
    fit: 'slim-fit',
    stitching: 'دوخت ایتالیایی',
    colorKey: 'emerald',
    colorLabel: 'سبز یشمی',
    sizes: { '48': 3, '50': 4, '52': 4 },
  },
  {
    name: 'کت‌وشلوار بورگوندی اسلیم‌فیت',
    slug: 'burgundy-slim-fit-suit',
    description:
      'بورگوندی یا قرمز شرابی، استایلی جسورانه با ظرافت کامل می‌سازد. این مدل از پارچه ویسکوز-پلی‌استر با برش اسلیم و دوخت دقیق تولید شده و در نور طبیعی درخشش عمیق و جذابی دارد.',
    price: 5100000,
    fabric: 'viscose-polyester',
    fit: 'slim-fit',
    stitching: 'دوخت فارسی',
    colorKey: 'burgundy',
    colorLabel: 'بورگوندی',
    sizes: { '46': 4, '48': 5, '50': 5, '52': 2 },
  },
  {
    name: 'کت‌وشلوار مشکی چهل‌تیکه کلاسیک',
    slug: 'black-classic-40suit',
    description:
      'مدل کلاسیک چهل‌تیکه با پارچه ویسکوز-پلی‌استر، پوشیدنی‌ترین و بادوام‌ترین انتخاب برای استفاده روزمره است. برش کلاسیک آن کمی آزادتر است و برای اندام‌هایی که راحتی را در اولویت می‌گذارند عالی است.',
    price: 4300000,
    oldPrice: 5000000,
    fabric: 'viscose-polyester',
    fit: 'classic',
    stitching: 'دوخت فارسی',
    colorKey: 'black',
    colorLabel: 'مشکی',
    sizes: { '48': 8, '50': 10, '52': 8, '54': 5, '56': 2 },
  },
  {
    name: 'کت‌وشلوار مشکی پشمی اسلیم‌فیت',
    slug: 'black-wool-slim-fit-suit',
    description:
      'ترکیب پشم و ویسکوز، گران‌بهاترین جنس کت‌وشلوار در کلکسیون CAVERO است. این مدل مشکی اسلیم‌فیت برای فصل زمستان، جلسات مهم و مراسم رسمی طراحی شده و حس حضور لوکس و حرفه‌ای را منتقل می‌کند.',
    price: 6800000,
    fabric: 'wool-viscose',
    fit: 'slim-fit',
    stitching: 'دوخت ایتالیایی',
    colorKey: 'black',
    colorLabel: 'مشکی',
    featured: true,
    sizes: { '48': 3, '50': 4, '52': 5, '54': 2 },
  },
];

const ARTICLES: SeedArticle[] = [
  {
    title: 'شناخت پارچه ویسکوز؛ انتخابی نرم و مدرن برای کت‌وشلوار',
    slug: 'viscose-fabric',
    category: 'پارچه',
    fabric: 'viscose',
    excerpt:
      'ویسکوز چیست و چرا به انتخاب اول کت‌وشلوارهای مدرن تبدیل شده است؟ در این مقاله با خواص ویسکوز و نکات نگهداری آن آشنا شوید.',
    content: `<p>ویسکوز یک پارچه نیمه‌مصنوعی است که از الیاف طبیعی سلولز (چوب درخت) ساخته می‌شود. این ترکیب باعث شده ویسکوز هم نرمی پارچه‌های طبیعی را داشته باشد و هم قابلیت‌های صنعتی پارچه‌های مصنوعی.</p>
    <h2>چرا ویسکوز برای کت‌وشلوار؟</h2>
    <p>ویسکوز بسیار لطیف و سبک است؛ به همین دلیل برای فصل‌های گرم و محیط‌های رسمی که ساعت‌های طولانی لباس می‌پوشید، انتخابی عالی است. این پارچه درخشش ملایمی دارد که به رنگ مشکی و رنگ‌های تیره عمق می‌دهد.</p>
    <h2>نکات نگهداری</h2>
    <ul><li>کتروشلوار ویسکوز را روی چوب‌لباسی با عرض مناسب نگهداری کنید.</li><li>از اتوی داغ و بخار مستقیم طولانی خودداری کنید.</li><li>خشکشویی دوره‌ای توصیه می‌شود.</li></ul>
    <p>در فروشگاه CAVERO، محصولات ویسکوز با دوخت ایتالیایی و برش اسلیم‌فیت تولید می‌شوند تا هم راحتی داشته باشید و هم شیک بپوشید.</p>`,
  },
  {
    title: 'راهنمای کامل انتخاب کت‌وشلوار مردانه',
    slug: 'how-to-choose-suit',
    category: 'راهنما',
    excerpt:
      'از انتخاب جنس و رنگ تا برش و دوخت؛ همه چیز را که باید قبل از خرید کت‌وشلوار بدانید، در یک مقاله بخوانید.',
    content: `<p>خرید کت‌وشلوار یک سرمایه‌گذاری در استایل شماست. در این راهنما قدم‌به‌قدم با معیارهای انتخاب بهترین کت‌وشلوار آشنا می‌شوید.</p>
    <h2>۱. جنس پارچه</h2>
    <p>برای استفاده روزمره و آب‌وهوای معتدل، ویسکوز و ترکیب ویسکوز-پلی‌استر بهترین انتخاب هستند. برای فصل سرد، ترکیب پشم-ویسکوز گرمای بیشتری فراهم می‌کند.</p>
    <h2>۲. برش و مدل</h2>
    <p>اسلیم‌فیت برای اندام‌های متناسب و استایل مدرن، و مدل کلاسیک برای راحتی بیشتر پیشنهاد می‌شود. برش باید روی شانه‌ها کاملاً اندازه باشد.</p>
    <h2>۳. رنگ</h2>
    <p>مشکی و سرمه‌ای ضروری‌ترین رنگ‌ها هستند. طوسی و قهوه‌ای برای تنوع و رنگ‌های خاص مانند یشمی برای مجالس انتخاب کنید.</p>
    <p>همیشه قبل از خرید، جدول سایزبندی CAVERO را بررسی کنید یا از ابزار «پیشنهاد سایز» استفاده کنید.</p>`,
  },
  {
    title: 'تفاوت انواع پارچه کت‌وشلوار؛ ویسکوز، پلی‌استر و پشم',
    slug: 'fabric-types-difference',
    category: 'پارچه',
    fabric: 'viscose',
    excerpt:
      'کدام پارچه برای کت‌وشلوار بهتر است؟ مقایسه کامل ویژگی‌های ویسکوز، پلی‌استر و پشم برای انتخاب هوشمندانه.',
    content: `<p>انتخاب پارچه، مهم‌ترین تصمیم در خرید کت‌وشلوار است. در این مقاله سه نوع پرکاربرد را مقایسه می‌کنیم.</p>
    <h2>ویسکوز</h2>
    <p>نرم، سبک و براق با ظرافت بالا. بهترین گزینه برای فصل‌های گرم و استایل رسمی مدرن. نیاز به مراقبت ویژه دارد.</p>
    <h2>ویسکوز-پلی‌استر</h2>
    <p>ترکیبی متعادل که ماندگاری و فرم‌پذیری پلی‌استر را با لطافت ویسکوز ترکیب می‌کند. مناسب استفاده روزمره و سفر.</p>
    <h2>پشم-ویسکوز</h2>
    <p>گرم‌ترین و لوکس‌ترین گزینه. پشم تنفس‌پذیری طبیعی دارد و برای جلسات سردسیر و مراسم رسمی ایده‌آل است.</p>
    <p><strong>جمع‌بندی:</strong> اگر یک کت‌وشلوار همه‌فن‌حریف می‌خواهید، ترکیب ویسکوز-پلی‌استر را انتخاب کنید.</p>`,
  },
  {
    title: 'راهنمای انتخاب سایز کت‌وشلوار',
    slug: 'suit-size-guide',
    category: 'راهنما',
    excerpt:
      'چطور سایز مناسب کت‌وشلوار را پیدا کنیم؟ راهنمای کامل اندازه‌گیری بدن و استفاده از جدول سایزبندی.',
    content: `<p>انتخاب سایز درست، نیمی از زیبایی استایل شماست. کت‌وشلوار باید روی شانه‌ها دقیق بنشیند، آستین‌ها تا مچ دست برسد و قد کت با هماهنگی شلوار باشد.</p>
    <h2>اندازه‌گیری</h2>
    <p><strong>دور سینه:</strong> متر را دور پهن‌ترین بخش سینه بیندازید و کاملاً افقی نگه دارید. این مهم‌ترین عدد برای انتخاب سایز است.</p>
    <p><strong>دور کمر:</strong> روی ناف اندازه بگیرید و یک انگشت فاصله بگذارید تا راحت باشد.</p>
    <h2>جدول سایزبندی</h2>
    <p>سایزهای اروپایی (۴۴ تا ۵۸) رایج‌ترین استاندارد برای کت‌وشلوار مردانه هستند. در اپلیکیشن CAVERO، از بخش «پیشنهاد سایز» استفاده کنید تا بر اساس اندازه‌های بدن، سایز دقیق پیشنهاد بگیرید.</p>
    <h2>نکته طلایی</h2>
    <p>همیشه برای تایید نهایی، دور سینه را معیار قرار دهید؛ دور کمر فقط برای تنظیم شلوار اهمیت دارد.</p>`,
  },
  {
    title: 'نحوه نگهداری و مراقبت از کت‌وشلوار',
    slug: 'suit-care-guide',
    category: 'راهنما',
    excerpt:
      'با رعایت چند نکته ساده، کت‌وشلوار خود را تا سال‌ها نو نگه دارید. راهنمای کامل مراقبت از کت‌وشلوار.',
    content: `<p>کت‌وشلوار باکیفیت، سال‌ها همراه شماست اگر درست از آن مراقبت کنید.</p>
    <h2>روزانه</h2>
    <ul><li>بعد از هر پوشیدن، کت‌وشلوار را حداقل یک روز استراحت دهید.</li><li>از چوب‌لباسی پهن مخصوص کت استفاده کنید.</li><li>برای حذف گرد و خاک از برس مخصوص لباس استفاده کنید.</li></ul>
    <h2>دوره‌ای</h2>
    <ul><li>خشکشویی را به افراد متخصص بسپارید و حداکثر دو بار در فصل انجام دهید.</li><li>اتو کردن بیش از حد به الیاف آسیب می‌زند؛ از بخار ملایم استفاده کنید.</li></ul>
    <h2>فصل به فصل</h2>
    <p>برای نگهداری بلندمدت، کت‌وشلوار را در رول‌های مخصوص لباس و دور از نور مستقیم نگهداری کنید و برای جلوگیری از بید از قرص‌های ضد بید استفاده کنید.</p>`,
  },
  {
    title: 'کت‌وشلوار مشکی؛ انتخاب همیشگی استایل رسمی',
    slug: 'black-suit-guide',
    category: 'استایل',
    fabric: 'viscose',
    excerpt:
      'چرا هر مردی به یک کت‌وشلوار مشکی نیاز دارد؟ اصول ست کردن مشکی با پیراهن و اکسسوری.',
    content: `<p>مشکی، امن‌ترین و درعین‌حال شیک‌ترین رنگ برای کت‌وشلوار است. این رنگ با هر نوع پیراهن، کراوات، کفش و ساعت ست می‌شود و در هر مناسبت رسمی، انتخاب درستی است.</p>
    <h2>با مشکی چه بپوشیم؟</h2>
    <p><strong>پیراهن سفید:</strong> کلاسیک‌ترین ترکیب دنیای رسمی.</p>
    <p><strong>پیراهن آبی روشن:</strong> ترکیبی مدرن و جذاب برای جلسات کاری.</p>
    <p><strong>کراوات:</strong> برای مراسم رسمی کراوات ساده مشکی یا طوسی؛ برای کار می‌توانید بدون کراوات بپوشید.</p>
    <h2>چرا ویسکوز مشکی؟</h2>
    <p>پارچه ویسکوز در رنگ مشکی، عمق و درخشش ملایمی دارد که در نور اتاق یا زیر نور شب، ظاهری لوکس ایجاد می‌کند.</p>`,
  },
  {
    title: 'اسلیم‌فیت یا کلاسیک؛ کدام برش برای شما مناسب است؟',
    slug: 'slim-versus-classic-fit',
    category: 'استایل',
    excerpt:
      'تفاوت برش اسلیم‌فیت و کلاسیک چیست و چطور بر اساس اندام خود بهترین گزینه را انتخاب کنیم؟',
    content: `<p>برش کت‌وشلوار، بخش بزرگی از شخصیت استایل شما را می‌سازد. انتخاب بین اسلیم‌فیت و کلاسیک باید بر اساس فرم بدن و سبک زندگی شما باشد.</p>
    <h2>اسلیم‌فیت</h2>
    <p>قفسه سینه چسبان‌تر، آستین‌های باریک و دور کمر متناسب با بدن. این برش ظاهری کشیده و مدرن می‌سازد و برای مردانی با بدنی متناسب یا لاغر بهترین گزینه است.</p>
    <h2>کلاسیک</h2>
    <p>برش راحت و آزاد که حرکت آسان را ممکن می‌کند. برای مردانی با شانه‌های پهن یا کسانی که ساعت‌های طولانی از لباس استفاده می‌کنند، انتخاب ایده‌آلی است.</p>
    <h3>جمع‌بندی</h3>
    <p>اگر شک دارید، مدل اسلیم‌فیت را در سایز یک بزرگ‌تر امتحان کنید. همیشه اولویت با راحتی و آزادی حرکت است.</p>`,
  },
  {
    title: 'دوخت ایتالیایی در برابر دوخت انگلیسی',
    slug: 'italian-versus-english-tailoring',
    category: 'فنی',
    excerpt:
      'با دو سبک معروف خیاطی کت‌وشلوار آشنا شوید و بدانید کدام یک برای استایل شما مناسب‌تر است.',
    content: `<p>دوخت کت‌وشلوار، هنری است که قرن‌ها تکامل یافته است. دو سبک ایتالیایی و انگلیسی، شناخته‌شده‌ترین مکاتب این هنر هستند.</p>
    <h2>دوخت ایتالیایی</h2>
    <p>شانه‌های نرم، قالب‌گیری بدن و ظرافت بالا. مناسب اندام‌های متناسب و استایل‌های اسلیم. دوخت ایتالیایی به شما آزادی حرکت بیشتری می‌دهد و ظاهری جوان‌پسند دارد.</p>
    <h2>دوخت انگلیسی</h2>
    <p>شانه‌های ساختارمند و خطوط مشخص، الهام‌گرفته از خیاطان لندن. این سبک حالت ایستاده‌تری به بدن می‌دهد و برای جلسات بسیار رسمی مناسب است.</p>
    <h3>کدام را انتخاب کنیم؟</h3>
    <p>برای استایل مدرن و روزمره، دوخت ایتالیایی، و برای مراسم و کارهای تشریفاتی، دوخت انگلیسی انتخاب کنید.</p>`,
  },
  {
    title: 'کت‌وشلوار سرمه‌ای؛ جادوی آرام ناوال‌بلو',
    slug: 'navy-suit-guide',
    category: 'استایل',
    fabric: 'viscose-polyester',
    excerpt:
      'سرمه‌ای، رنگی که هیچ‌وقت نمی‌می‌رد. چگونه بهترین ست‌ها را با کت‌وشلوار سرمه‌ای بسازیم؟',
    content: `<p>سرمه‌ای (ناوال‌بلو) رنگی است که از دهه ۱۹۳۰ تا امروز، همیشه در دنیای مد رسمی حضور داشته است. این رنگ به‌خوبی با رنگ‌های گرم و سرد همه ست می‌شود.</p>
    <h2>ست‌های پیشنهادی</h2>
    <p><strong>پیراهن سفید و کفش قهوه‌ای:</strong> ترکیب کلاسیک ایتالیایی.</p>
    <p><strong>پیراهن یشمی و کراوات تیره:</strong> استایل شیک برای عصر.</p>
    <p><strong>بدون کراوات با پیراهن روشن:</strong> استایل نیمه‌رسمی جوان‌پسند.</p>
    <h2>جنس مناسب</h2>
    <p>ترکیب ویسکوز-پلی‌استر برای رنگ سرمه‌ای عالی است؛ دوام بالا و رنگ ثابت، این پارچه را گزینه روزمره ایده‌آلی می‌کند.</p>`,
  },
  {
    title: 'هنر ترکیب پیراهن و اکسسوری با کت‌وشلوار',
    slug: 'shirt-accessories-guide',
    category: 'استایل',
    fabric: 'viscose',
    excerpt:
      'با انتخاب درست پیراهن، کراوات، کفش و ساعت، استایل رسمی خود را به سطحی حرفه‌ای ارتقا دهید.',
    content: `<p>جزئیات، یک استایل عادی را متمایز می‌کنند. در این مقاله اصول انتخاب اکسسوری با کت‌وشلوار را یاد می‌گیرید.</p>
    <h2>پیراهن</h2>
    <p>پیراهن سفید و آبی روشن ضروری‌ها هستند. یقه‌ای کت‌وشلوار باید چند میلی‌متر بالاتر از پشت چاک قرار گیرد.</p>
    <h2>کفش</h2>
    <p>کفش‌های مجلسی (چرمی) با کت‌وشلوار مشکی، مشکی؛ و با سرمه‌ای، قهوه‌ای روشن هماهنگ می‌شوند. جوراب باید هم‌رنگ شلوار باشد نه کفش.</p>
    <h2>ساعت و جزئیات</h2>
    <p>ساعت با بند چرمی و صفحه مینیمال، انتخاب مطمئنی است. از زیورآلات طلا در محیط‌های کاری خودداری کنید.</p>`,
  },
];

async function resetDatabase(tx: typeof db): Promise<void> {
  // حذف به ترتیب وابستگی‌ها (کودک قبل از والد)
  const tables = [
    'cart_items',
    'carts',
    'order_items',
    'orders',
    'addresses',
    'user_measurements',
    'otp_codes',
    'product_sizes',
    'product_images',
    'products',
    'articles',
    'fabrics',
    'fits',
    'sizes',
    'users',
  ];
  for (const table of tables) {
    await tx.prepare(`DELETE FROM ${table}`).run();
  }
}

async function countOf(table: string): Promise<number> {
  const row = (await db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get()) as { c: number | string };
  return Number(row.c);
}

async function seed(): Promise<void> {
  await ensureDatabase();
  await runMigrations();

  generateHero();

  await withTransaction(async (tx) => {
    await resetDatabase(tx);
    await seedFabricsAndFits(tx);
    await seedSizes(tx);
    await seedProducts(tx, PRODUCTS);
    await seedUsers(tx);
    await seedArticles(tx, ARTICLES);
  });

  const productCount = await countOf('products');
  const articleCount = await countOf('articles');
  const fabricCount = await countOf('fabrics');

  console.log('========================================');
  console.log('[seed] فروشگاه CAVERO با موفقیت Seed شد.');
  console.log(`[seed] Database : ${DATABASE_INFO}`);
  console.log(`[seed] محصولات  : ${productCount}`);
  console.log(`[seed] مقالات   : ${articleCount}`);
  console.log(`[seed] پارچه‌ها : ${fabricCount}`);
  console.log('----------------------------------------');
  console.log('[seed] پنل مدیریت → /admin');
  console.log(`[seed] نام کاربری: ${process.env.ADMIN_USERNAME || 'admin'}`);
  console.log(`[seed] رمز عبور  : ${process.env.ADMIN_PASSWORD || 'admin123'}`);
  console.log(`[seed] کاربر مدیر (موبایل) : 09120000000`);
  console.log('[seed] کاربر نمونه (موبایل): 09123456789');
  console.log('========================================');
}

seed()
  .then(() => closePool())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('[seed] خطا:', err);
    await closePool().catch(() => undefined);
    process.exit(1);
  });
