import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { api, toImageUrl } from '../lib/api';
import { OrderDetail } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import { formatPriceWithUnit } from '../lib/format';
import { InlineLoading } from '../components/ui/Loading';
import { ErrorState } from '../components/ui/ErrorState';
import BankCard from '../components/BankCard';
import { SITE_URL } from '../lib/seo';

export default function PaymentPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user || !orderNumber) return;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get<OrderDetail>(`/orders/${orderNumber}`);
        setOrder(res.data ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'خطا در دریافت سفارش');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, orderNumber]);

  if (isLoading) {
    return (
      <div className="container-sadra py-16">
        <InlineLoading />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/auth?redirect=/payment/${orderNumber}`} replace />;
  }

  if (loading) {
    return (
      <div className="container-sadra py-16">
        <InlineLoading />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container-sadra py-16">
        <ErrorState
          title="سفارش یافت نشد"
          message={error ?? 'چنین سفارشی وجود ندارد.'}
          action={
            <Link to="/account/orders" className="btn-outline">
              سفارش‌های من
            </Link>
          }
        />
      </div>
    );
  }

  const isPaid = order.paymentStatus === 'paid';
  const isRejected = order.paymentStatus === 'rejected';
  const isAwaiting = order.paymentStatus === 'receipt_uploaded';
  const hasReceipt = Boolean(order.receiptImageUrl);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(order.cardNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const selectFile = (selected: File | null) => {
    setUploadError(null);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return selected ? URL.createObjectURL(selected) : null;
    });
    setFile(selected);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    selectFile(e.target.files?.[0] ?? null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const selected = e.dataTransfer.files?.[0] ?? null;
    if (!selected) return;
    if (!selected.type.startsWith('image/')) {
      setUploadError('فقط فایل تصویری قابل بارگذاری است.');
      return;
    }
    selectFile(selected);
  };

  const handleUpload = async () => {
    if (!file || !orderNumber) {
      setUploadError('ابتدا تصویر رسید را انتخاب کنید.');
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('receipt', file);
      await api.upload<{ receiptImageUrl: string; paymentStatus: string }>(
        `/orders/${orderNumber}/receipt`,
        formData
      );
      // پس از ثبت موفق رسید، کاربر به صفحه سفارش منتقل می‌شود
      navigate(`/account/orders/${orderNumber}`);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'خطا در بارگذاری رسید');
      setUploading(false);
    }
  };

  const banner = isPaid
    ? {
        wrapper: 'border-green-100 bg-green-50/60',
        icon: 'bg-white text-green-600',
        title: 'سفارش شما با موفقیت ثبت شد',
        subtitle: 'پرداخت شما تایید شده است.',
      }
    : isRejected
      ? {
          wrapper: 'border-red-100 bg-red-50/60',
          icon: 'bg-white text-red-600',
          title: 'سفارش شما پذیرفته نشد',
          subtitle: 'رسید ارسالی شما تایید نشد. لطفاً رسید صحیح را دوباره بارگذاری کنید.',
        }
      : isAwaiting
        ? {
            wrapper: 'border-amber-100 bg-amber-50/60',
            icon: 'bg-white text-amber-500',
            title: 'رسید شما در انتظار تایید است',
            subtitle: 'پس از بررسی رسید توسط پشتیبانی، وضعیت سفارش به‌روزرسانی می‌شود.',
          }
        : {
            wrapper: 'border-stone-100 bg-ivory',
            icon: 'bg-white text-stone-500',
            title: 'پرداخت سفارش',
            subtitle: 'برای تکمیل سفارش، مبلغ را به شماره کارت زیر واریز و تصویر رسید را بارگذاری کنید.',
          };

  return (
    <div className="container-sadra py-10">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href={`${SITE_URL}/payment`} />
        <title>پرداخت سفارش {order.orderNumber} | CAVERO</title>
      </Helmet>

      <div className="mx-auto max-w-2xl">
        <div className={`rounded-2xl border p-6 text-center ${banner.wrapper}`}>
          <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full shadow-sm ${banner.icon}`}>
            {isPaid ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-7 w-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : isRejected ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-7 w-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : isAwaiting ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-7 w-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-7 w-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M3.6 19h16.8a2 2 0 001.7-3L13.7 4a2 2 0 00-3.4 0L1.9 16a2 2 0 001.7 3z" />
              </svg>
            )}
          </div>
          <h1 className="mt-4 text-2xl font-black">{banner.title}</h1>
          <p className="mt-2 text-sm text-stone-600">{banner.subtitle}</p>
          <p className="mt-3 text-xs text-stone-500">
            شماره سفارش: <strong dir="ltr">{order.orderNumber}</strong>
          </p>
        </div>

        {/* شماره کارت */}
        <div className="card mt-6 p-6">
          <h2 className="text-base font-bold">شماره کارت برای واریز</h2>
          <BankCard cardNumber={order.cardNumber} holderName={order.cardHolder} className="mt-4" />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-stone-500">لطفاً مبلغ سفارش را به شماره کارت بالا واریز کنید.</p>
            <button type="button" onClick={handleCopy} className="btn-outline !px-4 !py-2 text-xs">
              {copied ? 'کپی شد ✓' : 'کپی شماره کارت'}
            </button>
          </div>
        </div>

        {/* مبلغ قابل پرداخت */}
        <div className="card mt-4 p-6">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold">مبلغ قابل پرداخت</span>
            <span className="text-2xl font-black">{formatPriceWithUnit(order.total)}</span>
          </div>
        </div>

        {/* بارگذاری رسید */}
        <div className="card mt-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold">تصویر رسید پرداخت</h2>
            {!isPaid && (
              <span className="text-xs text-stone-400">JPG، PNG یا WEBP — حداکثر ۵ مگابایت</span>
            )}
          </div>

          {hasReceipt && (
            <div
              className={`mt-4 rounded-xl border p-4 ${
                isRejected ? 'border-red-100 bg-red-50' : 'border-green-100 bg-green-50'
              }`}
            >
              <p className={`text-sm font-medium ${isRejected ? 'text-red-700' : 'text-green-700'}`}>
                {isPaid
                  ? 'پرداخت شما تایید شده است.'
                  : isRejected
                    ? 'این رسید رد شده است؛ لطفاً رسید صحیح را دوباره ارسال کنید.'
                    : 'رسید شما ثبت شده و در انتظار تایید است.'}
              </p>
              {order.receiptImageUrl && (
                <a href={toImageUrl(order.receiptImageUrl)} target="_blank" rel="noreferrer" className="mt-3 inline-block">
                  <img
                    src={toImageUrl(order.receiptImageUrl)}
                    alt="رسید پرداخت"
                    className="max-h-56 border border-stone-200 object-contain"
                  />
                </a>
              )}
            </div>
          )}

          {!isPaid && (
            <>
              {/* ناحیه بزرگ انتخاب / کشیدن تصویر رسید */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={`mt-4 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors duration-300 ${
                  dragging ? 'border-ink bg-stone-50' : 'border-stone-300 hover:border-ink hover:bg-ivory'
                }`}
              >
                <span
                  className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors duration-300 ${
                    dragging ? 'bg-ink text-white' : 'bg-ivory text-stone-500'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="h-7 w-7">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </span>
                <span className="text-sm font-bold text-ink">
                  {hasReceipt ? 'انتخاب رسید جدید' : 'بارگذاری تصویر رسید'}
                </span>
                <span className="text-xs leading-6 text-stone-500">
                  برای رفتن به گالری کلیک کنید یا تصویر را بکشید و رها کنید
                </span>
                {file && (
                  <span className="mt-1 max-w-full truncate text-xs font-medium text-green-700" dir="ltr">
                    {file.name}
                  </span>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileChange}
                className="hidden"
              />

              {preview && (
                <div className="mt-4">
                  <p className="mb-2 text-xs text-stone-500">پیش‌نمایش رسید</p>
                  <div className="relative inline-block">
                    <img src={preview} alt="پیش‌نمایش رسید" className="max-h-64 border border-stone-200 object-contain" />
                    <button
                      type="button"
                      onClick={() => selectFile(null)}
                      className="absolute -left-2 -top-2 flex h-7 w-7 items-center justify-center border border-stone-300 bg-white text-stone-500 transition-colors hover:border-red-400 hover:text-red-600"
                      title="حذف تصویر"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {uploadError && <p className="mt-4 bg-red-50 p-3 text-sm text-red-600">{uploadError}</p>}

              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading || !file}
                className="btn-primary mt-5 w-full !py-4 text-base"
              >
                {uploading ? (
                  'در حال بارگذاری...'
                ) : (
                  <>
                    <span>{hasReceipt ? 'ثبت رسید جدید و ادامه' : 'ثبت رسید و ادامه'}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                  </>
                )}
              </button>
            </>
          )}
        </div>

        {isPaid && (
          <div className="mt-6">
            <Link to={`/account/orders/${order.orderNumber}`} className="btn-primary w-full text-center">
              مشاهده سفارش
            </Link>
          </div>
        )}

        {!isPaid && hasReceipt && (
          <p className="mt-5 text-center text-xs text-stone-500">
            <Link
              to={`/account/orders/${order.orderNumber}`}
              className="font-semibold text-ink underline-offset-4 hover:underline"
            >
              مشاهده وضعیت سفارش
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
