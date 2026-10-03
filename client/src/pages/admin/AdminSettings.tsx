import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { api } from '../../lib/api';
import { AdminSettings as AdminSettingsData } from '../../lib/types';
import { InlineLoading } from '../../components/ui/Loading';
import BankCard from '../../components/BankCard';

export default function AdminSettings() {
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<AdminSettingsData>('/admin/settings');
        setCardNumber(res.data?.cardNumber ?? '');
        setCardHolder(res.data?.cardHolder ?? '');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'خطا در دریافت تنظیمات');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 16);
    setCardNumber(digits);
    setSaved(false);
  };

  const handleHolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCardHolder(e.target.value);
    setSaved(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await api.put<AdminSettingsData>('/admin/settings', { cardNumber, cardHolder });
      if (res.data) {
        setCardNumber(res.data.cardNumber);
        setCardHolder(res.data.cardHolder);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ذخیره تنظیمات');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <InlineLoading text="در حال بارگذاری تنظیمات..." />;

  return (
    <div>
      <Helmet>
        <title>تنظیمات | چولفیش کت</title>
      </Helmet>

      <h1 className="text-2xl font-black">تنظیمات</h1>
      <p className="mt-1 text-sm text-stone-500">اطلاعات پرداخت نمایش‌داده‌شده به مشتری</p>

      <form onSubmit={handleSubmit} className="card mt-6 max-w-xl p-6">
        <h2 className="font-bold">شماره کارت برای واریز</h2>
        <p className="mt-1 text-xs text-stone-500">
          این شماره کارت به مشتری در صفحه پرداخت نشان داده می‌شود. (باید ۱۶ رقم باشد)
        </p>

        <div className="mt-4">
          <label className="label">شماره کارت</label>
          <input
            className="input text-center tracking-[0.25em]"
            dir="ltr"
            inputMode="numeric"
            value={cardNumber}
            onChange={handleCardChange}
            placeholder="1111111111111111"
          />
        </div>

        <div className="mt-4">
          <label className="label">نام صاحب کارت</label>
          <input
            className="input"
            value={cardHolder}
            onChange={handleHolderChange}
            placeholder="صدرا خادمی"
          />
        </div>

        <div className="mt-5">
          <p className="label">پیش‌نمایش کارت</p>
          <BankCard cardNumber={cardNumber} holderName={cardHolder} />
        </div>

        {error && <p className="mt-4 bg-red-50 p-3 text-sm text-red-600">{error}</p>}
        {saved && <p className="mt-4 bg-green-50 p-3 text-sm text-green-700">تنظیمات با موفقیت ذخیره شد.</p>}

        <button type="submit" disabled={saving} className="btn-primary mt-5 w-full !py-3">
          {saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
        </button>
      </form>
    </div>
  );
}
