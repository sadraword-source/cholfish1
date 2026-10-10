import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { api } from '../../lib/api';
import { AdminMeta, AdminArticleRecord } from '../../lib/types';
import { InlineLoading } from '../../components/ui/Loading';
import { ErrorState } from '../../components/ui/ErrorState';
import { ImageUpload } from '../../components/ui/ImageUpload';

const CATEGORIES = ['راهنما', 'پارچه', 'استایل', 'فنی', 'اخبار'];

export default function AdminArticleForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [meta, setMeta] = useState<AdminMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('راهنما');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [fabricId, setFabricId] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const metaRes = await api.get<AdminMeta>('/admin/meta');
        setMeta(metaRes.data ?? null);

        if (id) {
          const res = await api.get<{ article: AdminArticleRecord }>(`/admin/articles/${id}`);
          const a = res.data?.article;
          if (a) {
            setTitle(a.title);
            setSlug(a.slug);
            setCategory(a.category ?? 'راهنما');
            setExcerpt(a.excerpt ?? '');
            setContent(a.content ?? '');
            setCoverImage(a.cover_image ?? '');
            setFabricId(a.fabric_id != null ? String(a.fabric_id) : '');
            setIsPublished(Boolean(a.is_published));
            setMetaTitle(a.meta_title ?? '');
            setMetaDescription(a.meta_description ?? '');
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
    if (!title.trim()) {
      setError('عنوان الزامی است.');
      return;
    }

    const payload = {
      title: title.trim(),
      slug: slug.trim() || undefined,
      category,
      excerpt,
      content,
      coverImage: coverImage.trim() || null,
      fabricId: fabricId ? Number(fabricId) : null,
      isPublished,
      metaTitle: metaTitle.trim() || null,
      metaDescription: metaDescription.trim() || null,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/admin/articles/${id}`, payload);
      } else {
        await api.post('/admin/articles', payload);
      }
      navigate('/admin/articles');
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : 'خطا در ذخیره مقاله');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <InlineLoading text="در حال بارگذاری..." />;
  if (!meta) return <ErrorState message={error ?? 'اطلاعات فرم دریافت نشد.'} />;

  return (
    <div>
      <Helmet>
        <title>{isEdit ? 'ویرایش مقاله' : 'مقاله جدید'} | چولفیش کت</title>
      </Helmet>

      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-black">{isEdit ? 'ویرایش مقاله' : 'مقاله جدید'}</h1>
        <Link to="/admin/articles" className="text-sm text-stone-500 hover:text-black">← بازگشت</Link>
      </div>

      {error && <p className="mt-4 bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div className="card space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">عنوان *</label>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="label">اسلاگ (اختیاری)</label>
              <input className="input" dir="ltr" value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">دسته‌بندی</label>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">پارچه مرتبط (اختیاری)</label>
              <select className="input" value={fabricId} onChange={(e) => setFabricId(e.target.value)}>
                <option value="">هیچ‌کدام</option>
                {meta.fabrics.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          </div>

          <ImageUpload
            label="تصویر کاور"
            value={coverImage}
            onChange={setCoverImage}
            hint="میتوانید تصویر را بکشید و رها کنید یا از دستگاه خود انتخاب کنید."
          />

          <div>
            <label className="label">خلاصه</label>
            <textarea className="input min-h-[80px]" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
          </div>

          <div>
            <label className="label">متن کامل (HTML مجاز است)</label>
            <textarea className="input min-h-[260px]" dir="auto" value={content} onChange={(e) => setContent(e.target.value)} />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
            منتشر شود
          </label>
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
            {saving ? 'در حال ذخیره...' : 'ذخیره مقاله'}
          </button>
          <Link to="/admin/articles" className="btn-ghost">انصراف</Link>
        </div>
      </form>
    </div>
  );
}
