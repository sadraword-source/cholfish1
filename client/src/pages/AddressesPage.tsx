import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { api } from '../lib/api';
import { Address } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import { normalizePhone } from '../lib/constants';
import { InlineLoading } from '../components/ui/Loading';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { SITE_URL } from '../lib/seo';

const EMPTY_FORM = {
  fullName: '',
  phone: '',
  province: '',
  city: '',
  addressLine: '',
  postalCode: '',
};

export default function AddressesPage() {
  const { user, isLoading } = useAuth();
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState<Address | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const res = await api.get<Address[]>('/users/addresses');
      setAddresses(res.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  if (isLoading) {
    return (
      <div className="container-sadra py-16">
        <InlineLoading />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth?redirect=/account/addresses" replace />;
  }

  const startNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setMessage(null);
  };

  const startEdit = (address: Address) => {
    setEditing(address);
    setForm({
      fullName: address.full_name,
      phone: address.phone,
      province: address.province,
      city: address.city,
      addressLine: address.address_line,
      postalCode: address.postal_code,
    });
    setShowForm(true);
    setMessage(null);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/users/addresses/${id}`);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در حذف آدرس');
    }
  };

  const validate = () => {
    if (form.fullName.trim().length < 2) return 'نام گیرنده را کامل وارد کنید.';
    if (!/^09\d{9}$/.test(normalizePhone(form.phone))) return 'شماره موبایل نامعتبر است.';
    if (form.province.trim().length < 2) return 'استان را وارد کنید.';
    if (form.city.trim().length < 2) return 'شهر را وارد کنید.';
    if (form.addressLine.trim().length < 5) return 'آدرس کامل را وارد کنید.';
    if (form.postalCode.trim().length < 5) return 'کد پستی نامعتبر است.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        phone: normalizePhone(form.phone),
        province: form.province.trim(),
        city: form.city.trim(),
        addressLine: form.addressLine.trim(),
        postalCode: form.postalCode.trim(),
      };
      if (editing) {
        await api.put(`/users/addresses/${editing.id}`, payload);
        setMessage('آدرس ویرایش شد.');
      } else {
        await api.post('/users/addresses', payload);
        setMessage('آدرس جدید ذخیره شد.');
      }
      setShowForm(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ذخیره آدرس');
    } finally {
      setSubmitting(false);
    }
  };

  const updateForm = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [field]: e.target.value });

  return (
    <div className="container-sadra py-10">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href={`${SITE_URL}/account/addresses`} />

        <title>آدرس‌های من | CAVERO</title>
      </Helmet>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">آدرس‌های من</h1>
          <p className="mt-2 text-sm text-stone-500">آدرس‌های ذخیره‌شده برای ارسال سفارش</p>
        </div>
        <button onClick={startNew} className="btn-primary">
          + ثبت آدرس جدید
        </button>
      </div>

      {message && <p className="mb-4 bg-green-50 p-3 text-sm text-green-700">{message}</p>}
      {error && <p className="mb-4 bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      {loading ? (
        <InlineLoading />
      ) : showForm ? (
        <form onSubmit={handleSubmit} className="card mx-auto max-w-2xl p-6 sm:p-8">
          <h2 className="text-base font-bold">{editing ? 'ویرایش آدرس' : 'ثبت آدرس جدید'}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
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
              <input className="input" value={form.province} onChange={updateForm('province')} placeholder="تهران" />
            </div>
            <div>
              <label className="label">شهر *</label>
              <input className="input" value={form.city} onChange={updateForm('city')} placeholder="تهران" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">آدرس کامل *</label>
              <textarea className="input min-h-[80px] resize-y" value={form.addressLine} onChange={updateForm('addressLine')} placeholder="خیابان، کوچه، پلاک، واحد" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">کد پستی *</label>
              <input className="input" dir="ltr" value={form.postalCode} onChange={updateForm('postalCode')} placeholder="1234567890" />
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'در حال ذخیره...' : 'ذخیره آدرس'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-outline">
              انصراف
            </button>
          </div>
        </form>
      ) : addresses && addresses.length === 0 ? (
        <EmptyState
          title="آدرسی ثبت نشده است"
          description="برای ارسال سفارش‌ها، اولین آدرس خود را ثبت کنید."
          action={
            <button onClick={startNew} className="btn-primary">
              ثبت آدرس جدید
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(addresses ?? []).map((address) => (
            <div key={address.id} className="card p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold">{address.full_name}</h3>
                  {address.is_default === 1 && <span className="badge bg-black text-white">پیش‌فرض</span>}
                </div>
              </div>
              <div className="mt-3 text-sm leading-6 text-stone-600">
                <p dir="ltr" className="text-right">{address.phone}</p>
                <p>
                  {address.province}، {address.city}
                </p>
                <p>{address.address_line}</p>
                <p className="mt-1 text-xs text-stone-500">
                  کد پستی: <span dir="ltr">{address.postal_code}</span>
                </p>
              </div>
              <div className="mt-4 flex gap-2 border-t border-stone-100 pt-4 text-sm">
                <button onClick={() => startEdit(address)} className="flex-1 px-3 py-2 text-stone-700 hover:bg-stone-50">
                  ویرایش
                </button>
                <button onClick={() => handleDelete(address.id)} className="flex-1 px-3 py-2 text-red-600 hover:bg-red-50">
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}