import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { api } from '../lib/api';
import { User } from '../lib/types';
import { normalizePhone } from '../lib/constants';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { SITE_URL } from '../lib/seo';

type Step = 'phone' | 'otp';

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { refresh } = useCart();

  const redirect = searchParams.get('redirect') ?? '/account';

  const [step, setStep] = useState<Step>('phone');
  const [mode, setMode] = useState<'otp' | 'phone'>('otp');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ mode: 'otp' | 'phone' }>('/auth/mode')
      .then((res) => setMode(res.data?.mode ?? 'otp'))
      .catch(() => setMode('otp'));
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const normalized = normalizePhone(phone);
    if (!/^09\d{9}$/.test(normalized)) {
      setError('شماره موبایل نامعتبر است. مثال: ۰۹۱۲۳۴۵۶۷۸۹');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'phone') {
        const res = await api.post<{ token: string; user: User }>('/auth/login', {
          phone: normalized,
          fullName: fullName.trim() || undefined,
        });
        if (res.data) {
          login(res.data.token, res.data.user);
          await refresh();
          navigate(redirect, { replace: true });
        }
        return;
      }

      await api.post('/auth/request-otp', { phone: normalized, purpose: 'login' });
      setPhone(normalized);
      setStep('otp');
      setInfo('کد تأیید برای شما ارسال شد. (در حالت توسعه، کد در کنسول سرور نمایش داده می‌شود)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ورود');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (code.trim().length < 4) {
      setError('کد تأیید نامعتبر است.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{ token: string; user: User }>('/auth/verify-otp', {
        phone,
        code: code.trim(),
        fullName: fullName.trim() || undefined,
      });
      if (res.data) {
        login(res.data.token, res.data.user);
        await refresh();
        navigate(redirect, { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'کد تأیید نامعتبر است.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center py-16">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href={`${SITE_URL}/auth`} />

        <title>ورود / ثبت‌نام | CAVERO</title>
        <meta name="description" content="ورود و ثبت‌نام در فروشگاه CAVERO با شماره موبایل." />
      </Helmet>

      <div className="w-full max-w-md px-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-8 sm:p-10">
          <div className="text-center">
            <img
              src="/logo-mark.png"
              alt="CAVERO"
              className="mx-auto h-14 w-14 object-cover"
            />
            <p className="eyebrow mt-6">CAVERO</p>
            <h1 className="mt-3 text-xl font-black">
              {step === 'phone' ? 'ورود / ثبت‌نام' : 'کد تأیید'}
            </h1>
            <p className="mt-2 text-sm leading-7 text-stone-500">
              {step === 'phone'
                ? mode === 'phone'
                  ? 'با شماره موبایل خود بدون نیاز به کد وارد شوید'
                  : 'با شماره موبایل خود وارد فروشگاه CAVERO شوید'
                : `کد ۶ رقمی ارسال‌شده به ${phone.replace(/^(\d{4})(\d+)/, '$1***')}`}
            </p>
          </div>

          {error && <p className="mt-5 rounded-xl border border-stone-200 bg-ivory p-3 text-sm text-red-600">{error}</p>}
          {info && <p className="mt-5 rounded-xl border border-stone-200 bg-ivory p-3 text-sm text-stone-600">{info}</p>}

          {step === 'phone' ? (
            <form onSubmit={handleSendOtp} className="mt-6 space-y-4">
              <div>
                <label className="label">شماره موبایل</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  dir="ltr"
                  placeholder="09123456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input text-right"
                />
              </div>
              {mode === 'phone' && (
                <div>
                  <label className="label">نام و نام خانوادگی (اختیاری)</label>
                  <input
                    type="text"
                    placeholder="مثال: علی رضایی"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input"
                  />
                </div>
              )}
              <button type="submit" disabled={loading} className="btn-primary w-full !py-3.5">
                {loading
                  ? mode === 'phone'
                    ? 'در حال ورود...'
                    : 'در حال ارسال...'
                  : mode === 'phone'
                    ? 'ورود به فروشگاه'
                    : 'دریافت کد تأیید'}
              </button>
              <p className="text-center text-xs text-stone-500">
                با ورود به CAVERO، <Link to="/about" className="underline">قوانین فروشگاه</Link> را می‌پذیرید.
              </p>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="mt-6 space-y-4">
              {!localStorage.getItem('sadra_token') && (
                <div>
                  <label className="label">نام و نام خانوادگی (اختیاری)</label>
                  <input
                    type="text"
                    placeholder="مثال: علی رضایی"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input"
                  />
                </div>
              )}
              <div>
                <label className="label">کد تأیید</label>
                <input
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="input text-center tracking-[0.5em]"
                  maxLength={6}
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full !py-3.5">
                {loading ? 'در حال بررسی...' : 'ورود به فروشگاه'}
              </button>
              <button
                type="button"
                onClick={() => setStep('phone')}
                className="btn-ghost w-full text-sm !py-2"
              >
                ویرایش شماره موبایل
              </button>
            </form>
          )}

          <div className="mt-7 border-t border-stone-200 pt-5 text-center">
            <Link to="/shop" className="text-sm text-stone-500 transition-colors duration-300 hover:text-ink">
              ← بازگشت به فروشگاه
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}