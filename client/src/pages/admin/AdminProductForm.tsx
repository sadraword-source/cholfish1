import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { api } from '../../lib/api';
import { AdminMeta, AdminProductDetail } from '../../lib/types';
import { InlineLoading } from '../../components/ui/Loading';
import { ErrorState } from '../../components/ui/ErrorState';
import { ImageUpload, MultiImageUpload } from '../../components/ui/ImageUpload';

export default function AdminProductForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [meta, setMeta] = useState<AdminMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [oldPrice, setOldPrice] = useState('');
  const [fabricId, setFabricId] = useState('');
  const [fitId, setFitId] = useState('');
  const [stitchingType, setStitchingType] = useState('فارسی');
  const [color, setColor] = useState('مشکی');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [mainImage, setMainImage] = useState('');
  const [gallery, setGallery] = useState<string[]>([]);
  const [stock, setStock] = useState<Record<number, string>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const metaRes = await api.get<AdminMeta>('/admin/meta');
        setMeta(metaRes.data ?? null);

        if (id) {
          const res = await api.get<AdminProductDetail>(`/admin/products/${id}`);
          const d = res.data;
          if (d) {
            const p = d.product;
            setName(p.name);
            setSlug(p.slug);
            setDescription(p.description ?? '');
            setPrice(String(p.price));
            setOldPrice(p.old_price != null ? String(p.old_price) : '');
            setFabricId(String(p.fabric_id));
            setFitId(String(p.fit_id));
            setStitchingType(p.stitching_type ?? 'فارسی');
            setColor(p.color ?? 'مشکی');
            setIsFeatured(Boolean(p.is_featured));
            setIsActive(Boolean(p.is_active));
            setMetaTitle(p.meta_title ?? '');
            setMetaDescription(p.meta_description ?? '');

            const main = d.images.find((img) => img.image_type === 'main');
            setMainImage(main?.url ?? '');
            setGallery(
              d.images
                .filter((img) => img.image_type !== 'main')
                .map((img) => img.url)
            );

            const s: Record<number, string> = {};
            d.sizes.forEach((sz) => {
              s[sz.sizeId] = String(sz.stock);
            });
            setStock(s);
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'خطا در دریافت اطلاعات');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !price || !fabricId || !fitId) {
      setError('نام، قیمت، پارچه و مدل الزامی هستند.');
      return;
    }

    const images = [
      ...(mainImage.trim() ? [{ url: mainImage.trim(), alt: name, imageType: 'main' as const }] : []),
      ...gallery
        .map((u) => u.trim())
        .filter(Boolean)
        .map((url) => ({ url, alt: name, imageType: 'gallery' as const })),
    ];
    const sizes = Object.entries(stock).map(([sizeId, value]) => ({
      sizeId: Number(sizeId),
      stock: Number(value) || 0,
    }));

    const payload = {
      name: name.trim(),
      slug: slug.trim() || undefined,
      description,
      price: Number(price),
      oldPrice: oldPrice ? Number(oldPrice) : null,
      fabricId: Number(fabricId),
      fitId: Number(fitId),
      stitchingType,
      color,
      isFeatured,
      isActive,
      metaTitle: metaTitle.trim() || null,
      metaDescription: metaDescription.trim() || null,
      images,
      sizes,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/admin/products/${id}`, payload);
      } else {
        await api.post('/admin/products', payload);
      }
      navigate('/admin/products');
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : 'خطا در ذخیره محصول');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <InlineLoading text="در حال بارگذاری..." />;
  if (!meta) return <ErrorState message={error ?? 'اطلاعات فرم دریافت نشد.'} />;

  return (
    <div>
      <Helmet>
        <title>{isEdit ? 'ویرایش محصول' : 'محصول جدید'} | چولفیش کت</title>
      </Helmet>

      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-black">{isEdit ? 'ویرایش محصول' : 'محصول جدید'}</h1>
        <Link to="/admin/products" className="text-sm text-stone-500 hover:text-black">
          ← بازگشت
        </Link>
      </div>

      {error && <p className="mt-4 bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div className="card space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">نام محصول *</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="label">اسلاگ (اختیاری - خودکار ساخته می‌شود)</label>
              <input className="input" dir="ltr" value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">توضیحات</label>
            <textarea className="input min-h-[110px]" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">قیمت (تومان) *</label>
              <input className="input" dir="ltr" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div>
              <label className="label">قیمت قبل از تخفیف</label>
              <input className="input" dir="ltr" inputMode="numeric" value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} />
            </div>
            <div>
              <label className="label">رنگ</label>
              <input className="input" value={color} onChange={(e) => setColor(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">پارچه *</label>
              <select className="input" value={fabricId} onChange={(e) => setFabricId(e.target.value)}>
                <option value="">انتخاب کنید…</option>
                {meta.fabrics.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">مدل *</label>
              <select className="input" value={fitId} onChange={(e) => setFitId(e.target.value)}>
                <option value="">انتخاب کنید…</option>
                {meta.fits.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">نوع دوخت</label>
              <input className="input" value={stitchingType} onChange={(e) => setStitchingType(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              فعال (نمایش در فروشگاه)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
              محصول ویژه
            </label>
          </div>
        </div>

        <div className="card space-y-4 p-5">
          <h2 className="font-bold">تصاویر</h2>
          <ImageUpload
            label="تصویر اصلی"
            value={mainImage}
            onChange={setMainImage}
            hint="میتوانید تصویر را بکشید و رها کنید یا از دستگاه خود انتخاب کنید."
          />
          <MultiImageUpload
            label="گالری تصاویر"
            values={gallery}
            onChange={setGallery}
            hint="میتوانید چند تصویر را همزمان انتخاب یا کشیده و رها کنید."
          />
        </div>

        <div className="card space-y-4 p-5">
          <h2 className="font-bold">موجودی سایزها</h2>
          <div className="grid gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {meta.sizes.map((s) => (
              <div key={s.id}>
                <label className="label">سایز {s.label}</label>
                <input
                  className="input text-center"
                  dir="ltr"
                  inputMode="numeric"
                  value={stock[s.id] ?? '0'}
                  onChange={(e) => setStock({ ...stock, [s.id]: e.target.value })}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="card space-y-4 p-5">
          <h2 className="font-bold">تنظیمات SEO</h2>
          <div>
            <label className="label">عنوان متا</label>
            <input className="input" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} />
          </div>
          <div>
            <label className="label">توضیح متا</label>
            <textarea className="input min-h-[70px]" value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'در حال ذخیره...' : 'ذخیره محصول'}
          </button>
          <Link to="/admin/products" className="btn-ghost">انصراف</Link>
        </div>
      </form>
    </div>
  );
}
