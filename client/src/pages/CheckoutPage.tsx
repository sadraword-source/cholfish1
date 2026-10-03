import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { api, toImageUrl } from '../lib/api';
import { Address, Cart } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatPriceWithUnit, faNum } from '../lib/format';
import { SHIPPING_COST } from '../lib/constants';
import { normalizePhone } from '../lib/constants';
import { InlineLoading } from '../components/ui/Loading';
import { EmptyState } from '../components/ui/EmptyState';
import { SITE_URL } from '../lib/seo';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cart, refresh } = useCart();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [showNewAddress, setShowNewAddress] = useState(false);

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    province: '',
    city: '',
    addressLine: '',
    postalCode: '',
  });
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth?redirect=/checkout', { replace: true });
      return;
    }
    (async () => {
      try {
        const res = await api.get<Address[]>('/users/addresses');
        setAddresses(res.data ?? []);
        if (res.data && res.data.length > 0) {
          const def = res.data.find((a) => a.is_default === 1) ?? res.data[0];
          setSelectedAddressId(def.id);
        }
      } catch {
        // بدون آدرس ادامه می‌دهیم
      } finally {
        setLoadingAddresses(false);
      }
    })();
  }, [user, navigate]);

  if (!user) return null;

  if (loadingAddresses) {
    return (
      <div className="container-sadra py-16">
        <InlineLoading text="در حال بارگذاری..." />
      </div>
    );
  }

  const items = cart?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="container-sadra py-16">
        <EmptyState
          title="سبد خرید خالی است"
          description="برای ثبت سفارش ابتدا محصولی به سبد اضافه کنید."
          action={
            <Link to="/shop" className="btn-primary">
              مشاهده محصولات
            </Link>
          }
        />
      </div>
    );
  }

  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);

  const validate = (): string | null => {
    if (!/^09\d{9}$/.test(normalizePhone(form.phone))) return 'شماره موبایل گیرنده نامعتبر است.';
    if (form.fullName.trim().length < 2) return 'نام گیرنده را کامل وارد کنید.';
    if (form.province.trim().length < 2) return 'استان را وارد کنید.';
    if (form.city.trim().length < 2) return 'شهر را وارد کنید.';
    if (form.addressLine.trim().length < 5) return 'آدرس کامل را وارد کنید.';
    if (form.postalCode.trim().length < 5) return 'کد پستی نامعتبر است.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let addressId: number | null = selectedAddressId ?? null;
    if (showNewAddress || !selectedAddressId) {
      const validationError = validate();
      if (validationError) {
        setError(validationError);
        return;
      }
      try {
        const res = await api.post<Address>('/users/addresses', {
          fullName: form.fullName.trim(),
          phone: normalizePhone(form.phone),
          province: form.province.trim(),
          city: form.city.trim(),
          addressLine: form.addressLine.trim(),
          postalCode: form.postalCode.trim(),
        });
        addressId = res.data?.id ?? null;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'خطا در ذخیره آدرس');
        return;
      }
    }

    if (!addressId) {
      setError('یک آدرس انتخاب کنید یا آدرس جدید ثبت کنید.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post<{ orderNumber: string; total: number }>('/orders', {
        addressId,
        note: note.trim() || undefined,
      });
      await refresh();
      if (res.data) {
        navigate(`/payment/${res.data.orderNumber}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ثبت سفارش');
    } finally {
      setSubmitting(false);
    }
  };

  const updateForm = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [field]: e.target.value });

  return (
    <div className="pb-20">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href={`${SITE_URL}/checkout`} />

        <title>ثبت سفارش | چولفیش کت</title>
        <meta name="description" content="ثبت سفارش در فروشگاه چولفیش کت" />
      </Helmet>

      <div className="border-b border-stone-100 bg-ivory py-14">
        <div className="container-sadra">
          <h1 className="text-3xl font-black">ثبت سفارش</h1>
          <p className="mt-2 text-sm text-stone-500">بررسی سبد، آدرس، و ثبت نهایی</p>
        </div>
      </div>

      <div className="container-sadra mt-8">
        <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* آدرس */}
            <div className="card p-6">
              <h2 className="text-base font-bold">آدرس تحویل</h2>

              {addresses.length > 0 && !showNewAddress && (
                <div className="mt-4 space-y-3">
                  {addresses.map((addr) => (
                    <label
                      key={addr.id}
                      className={`flex cursor-pointer gap-3 border-2 p-4 transition-colors ${
                        selectedAddressId === addr.id ? 'border-black bg-black/5' : 'border-stone-100 hover:border-stone-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="address"
                        checked={selectedAddressId === addr.id}
                        onChange={() => setSelectedAddressId(addr.id)}
                        className="mt-1 h-4 w-4 accent-black"
                      />
                      <span className="flex-1">
                        <span className="block text-sm font-bold">
                          {addr.full_name} — {addr.city}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-stone-500">
                          {addr.address_line} · کد پستی: <span dir="ltr">{addr.postal_code}</span>
                        </span>
                      </span>
                    </label>
                  ))}
                  <button type="button" onClick={() => setShowNewAddress(true)} className="btn-outline w-full !py-2.5 text-sm">
                    + ثبت آدرس جدید
                  </button>
                </div>
              )}

              {addresses.length === 0 || showNewAddress ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label">نام گیرنده *</label>
                    <input className="input" value={form.fullName} onChange={updateForm('fullName')} placeholder="نام و نام خانوادگی" />
                  </div>
                  <div>
                    <label className="label">شماره موبایل *</label>
                    <input className="input" dir="ltr" value={form.phone} onChange={updateForm('phone')} placeholder="09123456789" />
                  </div>
                  <div>
                    <label className="label">استان *</label>
                    <input className="input" value={form.province} onChange={updateForm('province')} placeholder="مثال: تهران" />
                  </div>
                  <div>
                    <label className="label">شهر *</label>
                    <input className="input" value={form.city} onChange={updateForm('city')} placeholder="مثال: تهران" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">آدرس کامل *</label>
                    <textarea
                      className="input min-h-[90px] resize-y"
                      value={form.addressLine}
                      onChange={updateForm('addressLine')}
                      placeholder="خیابان، کوچه، پلاک، واحد"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">کد پستی *</label>
                    <input className="input" dir="ltr" value={form.postalCode} onChange={updateForm('postalCode')} placeholder="1234567890" />
                  </div>
                  {showNewAddress && (
                    <button type="button" onClick={() => setShowNewAddress(false)} className="text-sm text-stone-400 underline underline-offset-4 hover:text-black">
                      انتخاب از آدرس‌های قبلی
                    </button>
                  )}
                </div>
              ) : null}
            </div>

            {/* یادداشت */}
            <div className="card p-6">
              <h2 className="text-base font-bold">یادداشت سفارش</h2>
              <textarea
                className="input mt-4 min-h-[80px] resize-y"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="توضیحات دلخواه برای سفارش (اختیاری)"
              />
            </div>
          </div>

          {/* خلاصه */}
          <div>
            <div className="card sticky top-24 p-6">
              <h2 className="text-base font-bold">خلاصه سفارش</h2>
              <div className="mt-4 max-h-56 space-y-2 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 text-sm">
                    <div className="relative">
                      <img src={toImageUrl(item.imageUrl)} alt={item.productName} className="h-14 w-12 object-cover" />
                      <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white">
                        {faNum(item.quantity)}
                      </span>
                    </div>
                    <span className="flex-1 text-xs font-medium text-stone-700">{item.productName} · سایز {item.sizeLabel}</span>
                    <span className="text-xs font-bold">{formatPriceWithUnit(item.lineTotal)}</span>
                  </div>
                ))}
              </div>

              <dl className="mt-5 space-y-2.5 border-t border-stone-100 pt-5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-stone-500">جمع کالاها</dt>
                  <dd className="font-semibold">{formatPriceWithUnit(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-500">هزینه ارسال</dt>
                  <dd className="font-semibold">{formatPriceWithUnit(SHIPPING_COST)}</dd>
                </div>
                <div className="flex justify-between border-t border-stone-100 pt-3 text-base">
                  <dt className="font-bold">قابل پرداخت</dt>
                  <dd className="font-extrabold">{formatPriceWithUnit(subtotal + SHIPPING_COST)}</dd>
                </div>
              </dl>

              {error && <p className="mt-4 bg-red-50 p-3 text-sm text-red-600">{error}</p>}

              <button type="submit" disabled={submitting} className="btn-primary mt-5 w-full !py-3.5">
                {submitting ? 'در حال ثبت سفارش...' : 'تأیید و ثبت سفارش'}
              </button>
              <p className="mt-3 text-center text-xs text-stone-500">
                با ثبت سفارش، هیچ مبلغی از حساب شما کسر نمی‌شود (پرداخت در نسخه بعدی).
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}