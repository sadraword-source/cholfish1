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

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

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
      <div className="mt-3 flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <span key={chip} className="badge bg-white text-stone-600 ring-1 ring-stone-200">
            {chip}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="pb-20">
      <Helmet>
        <meta name="robots" content="noindex, follow" />
        <link rel="canonical" href={`${SITE_URL}/stylist`} />
        <title>استایلیست هوشمند | انتخاب استایل با هوش مصنوعی — CAVERO</title>
        <meta
          name="description"
          content="استایلیست هوشمند CAVERO: مناسبت، رنگ، فیت و بودجه‌ی خود را بگویید تا بهترین کت‌وشلوار موجود فروشگاه را برایتان پیشنهاد دهد."
        />
      </Helmet>

      <div className="bg-ink py-16 text-white">
        <div className="container-sadra">
          <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/50">AI Stylist</span>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">استایلیست هوشمند CAVERO</h1>
          <p className="mt-4 max-w-2xl text-sm leading-8 text-white/70">
            استایل موردنظرتان را به زبان خودتان توضیح دهید؛ هوش مصنوعی از میان محصولات واقعی و موجود فروشگاه،
            بهترین ترکیب را با توجه به مناسبت، رنگ، فیت و بودجه‌ی شما انتخاب می‌کند.
          </p>
        </div>
      </div>

      <div className="container-sadra mt-12">
        <div className="mx-auto max-w-3xl">
          <div className="overflow-hidden border border-stone-200 bg-white">
            {/* ناحیه پیام‌ها */}
            <div ref={scrollRef} className="max-h-[62vh] space-y-5 overflow-y-auto p-4 sm:p-6">
              {messages.map((msg) => (
                <div key={msg.id}>
                  {msg.role === 'user' ? (
                    <div className="flex justify-end">
                      <div className="max-w-[85%] rounded-bl-md bg-ink px-4 py-3 text-sm leading-7 text-white">
                        {msg.text}
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-black text-white">
                        AI
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="inline-block max-w-full rounded-br-md bg-ivory px-4 py-3 text-sm leading-7 text-stone-700">
                          {msg.text}
                        </div>

                        {msg.result && renderFilters(msg.result)}

                        {msg.result && msg.result.missingCategories.length > 0 && (
                          <p className="mt-3 border border-amber-100 bg-amber-50 p-3 text-xs leading-6 text-amber-700">
                            در حال حاضر {msg.result.missingCategories.join('، ')} در فروشگاه موجود نیست؛
                            نزدیک‌ترین گزینه‌های موجود پیشنهاد شده‌اند.
                          </p>
                        )}

                        {msg.result && msg.result.recommendations.length > 0 && (
                          <>
                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                              {msg.result.recommendations.map((rec) => (
                                <StylistProductCard
                                  key={rec.productId}
                                  recommendation={rec}
                                  onAdd={handleAdd}
                                  added={addedIds.has(rec.productId)}
                                  adding={addingId === rec.productId}
                                />
                              ))}
                            </div>

                            {msg.result.recommendations.length > 1 && (
                              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-xs text-stone-500">
                                  جمع تقریبی کل استایل:{' '}
                                  <strong className="text-stone-800">
                                    {formatPriceWithUnit(
                                      msg.result.recommendations.reduce((sum, r) => sum + r.product.price, 0)
                                    )}
                                  </strong>
                                </p>
                                <button
                                  type="button"
                                  disabled={addingAllFor === msg.id}
                                  onClick={() => handleAddAll(msg.id, msg.result as StylistResult)}
                                  className="btn-primary !py-3 text-sm"
                                >
                                  {addedAllMessages.has(msg.id)
                                    ? 'کل استایل به سبد اضافه شد ✓'
                                    : addingAllFor === msg.id
                                      ? 'در حال افزودن...'
                                      : 'افزودن کل استایل به سبد خرید'}
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-black text-white">
                    AI
                  </div>
                  <div className="flex items-center gap-1.5 rounded-br-md bg-ivory px-5 py-4">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-stone-400" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-stone-400" style={{ animationDelay: '150ms' }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-stone-400" style={{ animationDelay: '300ms' }} />
                    <span className="mr-2 text-xs text-stone-500">استایلیست در حال بررسی درخواست شماست...</span>
                  </div>
                </div>
              )}
            </div>

            {/* پیشنهادهای آماده */}
            <div className="border-t border-stone-100 px-4 pt-4 sm:px-6">
              <p className="mb-2 text-xs text-stone-400">پیشنهادهای آماده:</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => send(prompt)}
                    disabled={loading}
                    className="badge transition-colors duration-300 hover:border-ink hover:text-ink disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* ورودی بودجه و پیام */}
            <div className="p-4 sm:p-6">
              <div className="mb-4 border border-stone-200 bg-ivory/60 p-4">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="stylist-budget-range" className="text-xs font-medium text-stone-600">
                    حداکثر بودجه
                  </label>
                  <span className="text-sm font-bold text-ink">
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
                    className="mt-3 h-2 w-full cursor-pointer accent-ink"
                  />
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-stone-400">یا مبلغ دقیق (تومان):</span>
                  <input
                    id="stylist-budget"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder={maxPrice > 0 ? String(maxPrice) : 'مثلاً ۵۰۰۰۰۰۰'}
                    inputMode="numeric"
                    dir="ltr"
                    className="input !w-40 !py-2 text-sm"
                  />
                  {budget && (
                    <button
                      type="button"
                      onClick={() => setBudget('')}
                      className="text-[11px] text-stone-400 hover:text-ink"
                    >
                      حذف محدودیت
                    </button>
                  )}
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="flex items-end gap-2"
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  rows={2}
                  placeholder="مثلاً: برای عروسی یک استایل رسمی مشکی می‌خوام، بودجه حدود ۵ میلیون تومان."
                  className="input min-h-[56px] flex-1 resize-none"
                />
                <button type="submit" disabled={loading || !input.trim()} className="btn-primary !px-5 !py-3.5">
                  {loading ? '...' : 'ارسال'}
                </button>
              </form>

              <p className="mt-3 text-center text-[11px] text-stone-400">
                استایلیست فقط از میان محصولات موجود فروشگاه پیشنهاد می‌دهد و محصولی از خود نمی‌سازد.
              </p>
            </div>
          </div>

          <div className="mt-4 text-center">
            <Link to="/shop" className="text-sm text-stone-500 hover:text-black">
              مشاهده‌ی همه‌ی محصولات فروشگاه
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
