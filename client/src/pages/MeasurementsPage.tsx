import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { api } from '../lib/api';
import { Measurements } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import { faNum } from '../lib/format';
import { InlineLoading } from '../components/ui/Loading';
import { SITE_URL } from '../lib/seo';

interface MeasurementInput {
  label: string;
  key: keyof Pick<
    Measurements,
    'height_cm' | 'weight_kg' | 'chest_cm' | 'waist_cm' | 'hip_cm' | 'shoulder_cm' | 'arm_length_cm'
  >;
  placeholder: string;
  unit: string;
}

const MEASUREMENT_FIELDS: MeasurementInput[] = [
  { label: 'قد', key: 'height_cm', placeholder: 'مثال: 180', unit: 'سانتی‌متر' },
  { label: 'وزن', key: 'weight_kg', placeholder: 'مثال: 75', unit: 'کیلوگرم' },
  { label: 'دور سینه', key: 'chest_cm', placeholder: 'مثال: 98', unit: 'سانتی‌متر' },
  { label: 'دور کمر', key: 'waist_cm', placeholder: 'مثال: 84', unit: 'سانتی‌متر' },
  { label: 'دور باسن', key: 'hip_cm', placeholder: 'مثال: 98', unit: 'سانتی‌متر' },
  { label: 'عرض شانه', key: 'shoulder_cm', placeholder: 'مثال: 45', unit: 'سانتی‌متر' },
  { label: 'قد آستین', key: 'arm_length_cm', placeholder: 'مثال: 62', unit: 'سانتی‌متر' },
];

export default function MeasurementsPage() {
  const { user, isLoading } = useAuth();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Measurements | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [suggested, setSuggested] = useState<{ suggestedSize: string; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await api.get<Measurements>('/users/measurements');
        if (res.data) {
          setSaved(res.data);
          const initial: Record<string, string> = {};
          for (const field of MEASUREMENT_FIELDS) {
            const value = res.data[field.key];
            initial[field.key] = value != null ? String(value) : '';
          }
          setValues(initial);
          setSuggested(
            res.data.suggested_size
              ? { suggestedSize: res.data.suggested_size, message: 'اندازه‌های ذخیره‌شده قبلی.' }
              : null
          );
        }
      } catch {
        // اندازه‌ای ثبت نشده است
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (isLoading || loading) {
    return (
      <div className="container-sadra py-16">
        <InlineLoading />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth?redirect=/account/measurements" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const payload: Record<string, number | null> = {};
    for (const field of MEASUREMENT_FIELDS) {
      const raw = values[field.key];
      if (raw && raw.trim()) {
        const num = Number(raw);
        if (!Number.isFinite(num) || num <= 0) {
          setError(`مقدار «${field.label}» نامعتبر است.`);
          return;
        }
        payload[field.key] = num;
      } else {
        payload[field.key] = null;
      }
    }

    if (!payload.chest_cm && !payload.waist_cm && (!payload.height_cm || !payload.weight_kg)) {
      setError('حداقل دور سینه یا دور کمر را وارد کنید (یا قد و وزن).');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post<{ suggestedSize: string; message: string }>('/users/measurements', {
        heightCm: payload.height_cm,
        weightKg: payload.weight_kg,
        chestCm: payload.chest_cm,
        waistCm: payload.waist_cm,
        hipCm: payload.hip_cm,
        shoulderCm: payload.shoulder_cm,
        armLengthCm: payload.arm_length_cm,
      });
      setMessage(res.message ?? 'اندازه‌ها ذخیره شد.');
      setSuggested(res.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ذخیره اندازه‌ها');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-sadra py-10">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href={`${SITE_URL}/account/measurements`} />

        <title>اندازه‌ها و پیشنهاد سایز | CAVERO</title>
        <meta name="description" content="پیشنهاد سایز کت و شلوار بر اساس اندازه بدن شما" />
      </Helmet>

      <div className="mb-8">
        <h1 className="text-3xl font-black">اندازه‌ها و پیشنهاد سایز</h1>
        <p className="mt-2 text-sm text-stone-500">اندازه‌های بدن خود را ثبت کنید تا سایز پیشنهادی دریافت کنید</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="card p-6 sm:p-8">
            <h2 className="text-base font-bold">اندازه‌های بدن (سانتی‌متر)</h2>
            <p className="mt-1 text-xs text-stone-500">دور سینه مهم‌ترین معیار انتخاب سایز کت‌وشلوار است.</p>

            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {MEASUREMENT_FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="label">{field.label}</label>
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={values[field.key] ?? ''}
                      onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
                      placeholder={field.placeholder}
                      className="input pl-12"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-500">{field.unit}</span>
                  </div>
                </div>
              ))}
            </div>

            {error && <p className="mt-4 bg-red-50 p-3 text-sm text-red-600">{error}</p>}
            {message && <p className="mt-4 bg-green-50 p-3 text-sm text-green-700">{message}</p>}

            <div className="mt-6">
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? 'در حال محاسبه...' : 'ذخیره و محاسبه سایز'}
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-5">
          <div className="card border-black/10 bg-black p-6 text-center text-white">
            <p className="text-sm text-stone-300">سایز پیشنهادی شما</p>
            <p className="mt-3 text-5xl font-black tracking-tight text-white">
              {suggested ? faNum(suggested.suggestedSize) : '—'}
            </p>
            {suggested && <p className="mt-4 text-xs leading-5 text-stone-300">{suggested.message}</p>}
            {!suggested && (
              <p className="mt-4 text-xs leading-5 text-stone-400">
                پس از ثبت اندازه‌ها، سایز پیشنهادی شما اینجا نمایش داده می‌شود.
              </p>
            )}
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-bold">راهنمای سریع اندازه‌گیری</h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-600">
              <li>• <strong>دور سینه:</strong> از پهن‌ترین بخش سینه، متر کاملاً افقی.</li>
              <li>• <strong>دور کمر:</strong> روی ناف، با یک انگشت فاصله.</li>
              <li>• <strong>قد:</strong> بدون کفش از کف پا تا بالای سر.</li>
              <li>• <strong>قد آستین:</strong> از مرکز پشت گردن تا مچ دست.</li>
            </ul>
            <Link to="/size-guide" className="mt-4 inline-block text-sm font-semibold text-black underline underline-offset-4 hover:text-stone-600">
              مشاهده جدول کامل سایز
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}