import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { api } from '../lib/api';
import { StylistResult } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatPriceWithUnit, faNum } from '../lib/format';
import { toEnDigits } from '../lib/constants';
import StylistProductCard from '../components/StylistProductCard';
import { SITE_URL } from '../lib/seo';

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  result?: StylistResult;
}

const QUICK_PROMPTS = [
  'استایل رسمی برای عروسی',
  'استایل کاری',
  'کت و شلوار نیمه‌رسمی',
  'استایل کاملاً مشکی',
];

const WELCOME: ChatMessage = {
  id: 1,
  role: 'assistant',
  text: 'سلام! من استایلیست هوشمند CAVERO هستم. مناسبت، رنگ، فیت و بودجه‌ی خود را بنویسید تا از میان کت‌وشلوارهای موجود فروشگاه، بهترین استایل را برایتان انتخاب کنم.',
};

const FORMALITY_LABELS: Record<string, string> = {
  formal: 'رسمی',
  semi: 'کاری / نیمه‌رسمی',
  casual: 'روزمره',
};

export default function StylistPage() {
  const { user } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [budget, setBudget] = useState('');
  const [priceRange, setPriceRange] = useState<{ minPrice: number; maxPrice: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const [addingAllFor, setAddingAllFor] = useState<number | null>(null);
  const [addedAllMessages, setAddedAllMessages] = useState<Set<number>>(new Set());

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const latestMessageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // هنگام انتظار، انتهای گفتگو برای دیدن حالت فکر کردن نمایش داده می‌شود.
    if (loading) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      return;
    }

    // پس از رسیدن پاسخ، ابتدای آخرین پیام در بالای ناحیه‌ی گفتگو قرار می‌گیرد
    // تا متن پاسخ و ابتدای محصولات با هم دیده شوند.
    const latest = latestMessageRef.current;
    if (!latest) return;
    el.scrollTo({ top: Math.max(0, latest.offsetTop - 8), behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [input]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ minPrice: number; maxPrice: number }>('/stylist/price-range');
        if (res.data && res.data.maxPrice > 0) setPriceRange(res.data);
      } catch {
        // نادیده گرفتن خطا؛ ورودی عددی همچنان در دسترس است
      }
    })();
  }, []);

  const parsedBudget = (): number | null => {
    const digits = toEnDigits(budget).replace(/[^0-9]/g, '');
    const value = Number(digits);
    return Number.isFinite(value) && value > 0 ? value : null;
  };

  const maxPrice = priceRange?.maxPrice ?? 0;
  const minPrice = priceRange?.minPrice ?? 0;
  const budgetNumber = parsedBudget();
  const sliderValue = budgetNumber != null && maxPrice > 0
    ? Math.max(minPrice, Math.min(budgetNumber, maxPrice))
    : maxPrice;
  const isUnlimited = budgetNumber == null || (maxPrice > 0 && budgetNumber >= maxPrice);

  const handleSlider = (value: number) => {
    if (maxPrice > 0 && value >= maxPrice) {
      setBudget('');
      return;
    }
    setBudget(String(value));
  };

  const send = async (raw: string) => {
    const message = raw.trim();
    if (!message || loading) return;

    setMessages((prev) => [...prev, { id: Date.now(), role: 'user', text: message }]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post<StylistResult>('/stylist', {
        message,
        budget: parsedBudget(),
      });
      const data = res.data;
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'assistant', text: data?.message ?? 'پیشنهادی یافت نشد.', result: data },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          role: 'assistant',
          text: e instanceof Error ? e.message : 'خطا در پردازش درخواست. دوباره تلاش کنید.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const requireAuth = (): boolean => {
    if (!user) {
      navigate('/auth?redirect=/stylist');
      return false;
    }
    return true;
  };

  const handleAdd = async (productId: number, sizeId: number) => {
    if (!requireAuth()) return;
    setAddingId(productId);
    try {
      await addItem(productId, sizeId, 1);
      setAddedIds((prev) => new Set(prev).add(productId));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'خطا در افزودن به سبد خرید');
    } finally {
      setAddingId(null);
    }
  };

  const handleAddAll = async (messageId: number, result: StylistResult) => {
    if (!requireAuth()) return;
    setAddingAllFor(messageId);
    try {
      for (const rec of result.recommendations) {
        const size = rec.sizes[0];
        if (!size) continue;
        await addItem(rec.productId, size.id, 1);
      }
      setAddedIds((prev) => {
        const next = new Set(prev);
        result.recommendations.forEach((r) => next.add(r.productId));
        return next;
      });
      setAddedAllMessages((prev) => new Set(prev).add(messageId));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'خطا در افزودن استایل به سبد خرید');
    } finally {
      setAddingAllFor(null);
    }
  };

  const renderFilters = (result: StylistResult) => {
    const chips: string[] = [];
    if (result.filters.formality) chips.push(`مناسبت: ${FORMALITY_LABELS[result.filters.formality] ?? result.filters.formality}`);
    if (result.filters.colors.length > 0) chips.push(`رنگ: ${result.filters.colors.join('، ')}`);
    if (result.filters.fit) chips.push(`فیت: ${result.filters.fit}`);
    if (result.budget) chips.push(`بودجه: ${formatPriceWithUnit(result.budget)}`);
    if (chips.length === 0) return null;

    return (
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] tracking-wide text-stone-400">
        {chips.map((chip, index) => (
          <span key={chip} className="inline-flex items-center gap-3">
            {index > 0 && <span className="h-0.5 w-0.5 rounded-full bg-stone-300" />}
            {chip}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="stylist-page overflow-hidden pb-24">
      <Helmet>
        <meta name="robots" content="noindex, follow" />
        <link rel="canonical" href={`${SITE_URL}/stylist`} />
        <title>استایلیست هوشمند | انتخاب استایل با هوش مصنوعی — CAVERO</title>
        <meta
          name="description"
          content="استایلیست هوشمند CAVERO: مناسبت، رنگ، فیت و بودجه‌ی خود را بگویید تا بهترین کت‌وشلوار موجود فروشگاه را برایتان پیشنهاد دهد."
        />
      </Helmet>

      <h1 className="sr-only">استایلیست هوشمند CAVERO</h1>

      <div className="container-sadra pt-12 sm:pt-16 lg:pt-20">
        <div className="mx-auto max-w-6xl">
          <header className="flex flex-col gap-7 border-b border-stone-200 pb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-10">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                <span className="h-px w-10 bg-ink/30" />
                <span className="text-[9px] font-medium uppercase tracking-[0.34em] text-stone-400">
                  AI Stylist / Personal Fitting
                </span>
              </div>
              <h2 className="mt-5 text-3xl font-black leading-[1.15] tracking-tight text-ink sm:text-[2.7rem]">
                استایلیست شخصی
              </h2>
              <p className="mt-4 max-w-xl text-[13px] leading-8 text-stone-500 sm:text-sm">
                مناسبت، رنگ و بودجه‌ی خود را بگویید. از میان محصولات واقعی و موجود کالکشن،
                گزینه‌هایی را انتخاب می‌کنم که دقیقاً با سلیقه‌ی شما هماهنگ باشند.
              </p>
            </div>

            <Link
              to="/shop"
              className="group inline-flex w-fit items-center gap-3 text-[11px] font-medium tracking-wide text-stone-500 transition-colors hover:text-ink"
            >
              <span>مشاهده کالکشن</span>
              <span className="h-px w-8 bg-stone-300 transition-all duration-300 group-hover:w-12 group-hover:bg-ink" />
            </Link>
          </header>

          <div className="mt-10 grid grid-cols-1 gap-y-10 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-x-16 lg:gap-y-6">
            {/* گفتگو */}
            <section className="min-w-0 lg:col-start-1 lg:row-start-1">
              <div
                ref={scrollRef}
                className="stylist-flow relative max-h-[38vh] min-h-[230px] overflow-y-auto overscroll-contain sm:max-h-[52vh] lg:max-h-[60vh]"
                role="log"
                aria-live="polite"
              >
                <div className="space-y-10 pb-2">
                  {messages.map((msg, index) => (
                    <div
                      key={msg.id}
                      ref={index === messages.length - 1 ? latestMessageRef : undefined}
                      className="animate-fade-up"
                    >
                      {msg.role === 'user' ? (
                        <div className="flex justify-end">
                          <div className="max-w-[86%] rounded-2xl bg-ivory px-4 py-3 text-sm leading-7 text-ink sm:max-w-[72%]">
                            {msg.text}
                          </div>
                        </div>
                      ) : (
                        <div className="min-w-0">
                          <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.3em] text-stone-400">
                            AI Stylist
                          </p>
                          <div
                            className={`max-w-2xl whitespace-pre-line break-words ${
                              msg.id === WELCOME.id
                                ? 'text-[17px] leading-9 text-stone-700 sm:text-[19px] sm:leading-10'
                                : 'text-[15px] leading-8 text-stone-700'
                            }`}
                          >
                            {msg.text}
                          </div>

                          {msg.result && renderFilters(msg.result)}

                          {msg.result && msg.result.missingCategories.length > 0 && (
                            <p className="mt-4 max-w-2xl border-r border-stone-300 pr-3 text-[11px] leading-6 text-stone-400">
                              <span className="font-medium text-stone-500">توجه:</span>{' '}
                              {msg.result.missingCategories.join('، ')} در فروشگاه موجود نیست؛ برای
                              جلوگیری از پیشنهاد نامرتبط، این بخش در نتایج لحاظ نشده است.
                            </p>
                          )}

                          {msg.result && msg.result.recommendations.length > 0 && (
                            <>
                              <div className="mt-7 grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2">
                                {msg.result.recommendations.map((rec, index) => (
                                  <div key={rec.productId} className="animate-fade-up" style={{ animationDelay: `${index * 70}ms` }}>
                                    <StylistProductCard
                                      recommendation={rec}
                                      onAdd={handleAdd}
                                      added={addedIds.has(rec.productId)}
                                      adding={addingId === rec.productId}
                                    />
                                  </div>
                                ))}
                              </div>

                              {msg.result.recommendations.length > 1 && (
                                <div className="mt-8 flex flex-col gap-3 border-t border-stone-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                                  <p className="text-[10px] tracking-wide text-stone-400">
                                    مجموع تقریبی استایل
                                    <span className="mr-2 font-medium text-stone-700">
                                      {formatPriceWithUnit(
                                        msg.result.recommendations.reduce((sum, r) => sum + r.product.price, 0)
                                      )}
                                    </span>
                                  </p>
                                  <button
                                    type="button"
                                    disabled={addingAllFor === msg.id}
                                    onClick={() => handleAddAll(msg.id, msg.result as StylistResult)}
                                    className="w-fit text-[11px] font-medium text-ink underline decoration-stone-300 underline-offset-4 transition-colors hover:decoration-ink disabled:text-stone-300"
                                  >
                                    {addedAllMessages.has(msg.id)
                                      ? 'کل استایل در سبد ✓'
                                      : addingAllFor === msg.id
                                        ? 'در حال افزودن...'
                                        : 'افزودن همه به سبد'}
                                  </button>
                                </div>
                              )}
                            </>
                          )}

                          {msg.result &&
                            msg.result.recommendations.length === 0 &&
                            (msg.result.budget !== null ||
                              msg.result.filters.colors.length > 0 ||
                              msg.result.filters.fit !== null ||
                              msg.result.filters.formality !== null ||
                              msg.result.missingCategories.length > 0) && (
                              <div className="mt-6 flex max-w-2xl items-center justify-between gap-4 border-t border-stone-200 pt-5">
                                <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-stone-300">
                                  No exact match
                                </p>
                                <p className="text-[10px] text-stone-400">فیلترها را تغییر دهید</p>
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  ))}

                  {loading && (
                    <div className="animate-fade-up" aria-live="polite">
                      <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.3em] text-stone-400">
                        AI Stylist
                      </p>
                      <div className="flex items-center gap-3 text-[12px] text-stone-400">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-stone-300" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-stone-500" />
                        </span>
                        <span>در حال بررسی درخواست و انتخاب از کالکشن</span>
                      </div>
                      <div className="mt-4 space-y-2" aria-hidden="true">
                        <span className="block h-px w-48 max-w-full animate-pulse bg-stone-200" />
                        <span className="block h-px w-64 max-w-full animate-pulse bg-stone-200 [animation-delay:150ms]" />
                        <span className="block h-px w-36 max-w-full animate-pulse bg-stone-200 [animation-delay:300ms]" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ورودی پیام */}
            <div className="min-w-0 lg:col-start-1 lg:row-start-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="border-t border-stone-200 pt-5"
              >
                <div className="flex items-end gap-3">
                  <textarea
                    ref={inputRef}
                    id="stylist-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        send(input);
                      }
                    }}
                    rows={1}
                    placeholder="مثلاً: برای عروسی یک استایل رسمی مشکی می‌خوام، بودجه حدود ۵ میلیون تومان."
                    className="max-h-32 min-h-[44px] w-full min-w-0 flex-1 resize-none rounded-none border-0 border-b border-stone-300 bg-transparent px-0 py-3 text-[15px] leading-7 text-ink outline-none placeholder:text-stone-400 focus:border-ink"
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    aria-label={loading ? 'در حال ارسال' : 'ارسال درخواست'}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-white transition-colors duration-300 hover:bg-stone-700 disabled:bg-stone-200 disabled:text-stone-400"
                  >
                    {loading ? (
                      <span className="h-4 w-4 animate-spin rounded-full border border-white/40 border-t-white" />
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="h-4 w-4"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                      </svg>
                    )}
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[10px] text-stone-400">
                  <span className="hidden sm:inline">Enter برای ارسال · Shift + Enter برای خط جدید</span>
                  <span>پاسخ فقط از کالکشن واقعی فروشگاه</span>
                </div>
              </form>
            </div>

            {/* ستون کنار */}
            <aside className="min-w-0 space-y-10 lg:col-start-2 lg:row-span-2 lg:row-start-1">
              <section>
                <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                  <h3 className="text-[9px] font-semibold uppercase tracking-[0.3em] text-stone-400">
                    پیشنهادهای آماده
                  </h3>
                  <span className="text-[9px] text-stone-300">۰۱</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-1">
                  {QUICK_PROMPTS.map((prompt, index) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => send(prompt)}
                      disabled={loading}
                      className="group flex items-baseline justify-between gap-4 border-b border-stone-100 py-3 text-right text-[13px] leading-6 text-stone-600 transition-colors duration-300 hover:text-ink disabled:opacity-40"
                    >
                      <span>{prompt}</span>
                      <span className="shrink-0 text-[9px] tabular-nums tracking-widest text-stone-300 transition-colors group-hover:text-stone-500">
                        {faNum(String(index + 1).padStart(2, '0'))}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                  <label
                    htmlFor="stylist-budget-range"
                    className="text-[9px] font-semibold uppercase tracking-[0.3em] text-stone-400"
                  >
                    بودجه
                  </label>
                  <span className="text-[11px] text-stone-500">
                    {isUnlimited ? 'بدون محدودیت' : formatPriceWithUnit(sliderValue)}
                  </span>
                </div>

                {maxPrice > minPrice && (
                  <input
                    id="stylist-budget-range"
                    type="range"
                    min={minPrice}
                    max={maxPrice}
                    step={100000}
                    value={sliderValue}
                    onChange={(e) => handleSlider(Number(e.target.value))}
                    dir="ltr"
                    aria-label="حداکثر بودجه"
                    className="stylist-range mt-6 w-full cursor-pointer"
                  />
                )}

                <div className="mt-5 flex items-center gap-3">
                  <input
                    id="stylist-budget"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder={maxPrice > 0 ? String(maxPrice) : 'مثلاً ۵۰۰۰۰۰۰'}
                    inputMode="numeric"
                    dir="ltr"
                    aria-label="مبلغ دقیق بودجه به تومان"
                    className="min-w-0 flex-1 rounded-none border-0 border-b border-stone-300 bg-transparent px-0 py-2 text-sm text-ink outline-none placeholder:text-stone-300 focus:border-ink"
                  />
                  {budget && (
                    <button
                      type="button"
                      onClick={() => setBudget('')}
                      className="shrink-0 text-[10px] text-stone-400 transition-colors hover:text-ink"
                    >
                      پاک کردن
                    </button>
                  )}
                </div>
                <p className="mt-2 text-[10px] text-stone-400">مبلغ دقیق به تومان</p>
              </section>

              <p className="border-t border-stone-200 pt-5 text-[10px] leading-6 text-stone-400">
                استایلیست فقط از میان محصولات موجود فروشگاه پیشنهاد می‌دهد و محصولی از خود نمی‌سازد.
              </p>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
