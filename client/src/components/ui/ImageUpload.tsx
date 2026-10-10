import { useRef, useState } from 'react';
import { api, toImageUrl } from '../../lib/api';

interface UploadResult {
  url: string;
}

async function uploadFile(file: File): Promise<string> {
  const form = new FormData();
  form.append('image', file);
  const res = await api.upload<UploadResult>('/admin/upload', form);
  const url = res.data?.url;
  if (!url) throw new Error('آدرس تصویر دریافت نشد.');
  return url;
}

function isImage(file: File): boolean {
  return file.type.startsWith('image/');
}

interface SingleProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  hint?: string;
}

export function ImageUpload({ value, onChange, label, hint }: SingleProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrl, setShowUrl] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!isImage(file)) {
      setError('فقط فایل تصویری قابل انتخاب است.');
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const url = await uploadFile(file);
      onChange(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در بارگذاری تصویر');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      {label && <label className="label">{label}</label>}

      {value ? (
        <div className="relative inline-block">
          <img
            src={toImageUrl(value)}
            alt=""
            className="h-40 w-full max-w-xs border border-stone-200 object-cover"
          />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute -left-2 -top-2 flex h-7 w-7 items-center justify-center border border-stone-300 bg-white text-stone-500 hover:border-red-400 hover:text-red-600"
            title="حذف تصویر"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          disabled={uploading}
          className={`flex h-40 w-full max-w-xs flex-col items-center justify-center gap-2 border border-dashed text-sm transition-colors ${
            dragging ? 'border-ink bg-stone-50' : 'border-stone-300 text-stone-500 hover:border-ink'
          }`}
        >
          {uploading ? (
            <span>در حال بارگذاری...</span>
          ) : (
            <>
              <span className="text-2xl">＋</span>
              <span>انتخاب یا کشیدن تصویر</span>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
        {value && (
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="text-stone-500 hover:text-ink">
            تغییر تصویر
          </button>
        )}
        <button type="button" onClick={() => setShowUrl((s) => !s)} className="text-stone-400 hover:text-ink">
          {showUrl ? 'بستن ورود آدرس' : 'یا وارد کردن آدرس دستی'}
        </button>
      </div>

      {showUrl && (
        <input
          className="input mt-2"
          dir="ltr"
          placeholder="/static/images/... یا https://..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {hint && <p className="mt-1 text-xs text-stone-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

interface MultiProps {
  values: string[];
  onChange: (urls: string[]) => void;
  label?: string;
  hint?: string;
}

export function MultiImageUpload({ values, onChange, label, hint }: MultiProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    const invalid = list.some((f) => !isImage(f));
    if (invalid) {
      setError('فقط فایل تصویری قابل انتخاب است.');
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of list) {
        urls.push(await uploadFile(file));
      }
      onChange([...values, ...urls]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در بارگذاری تصویر');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeAt = (index: number) => onChange(values.filter((_, i) => i !== index));

  return (
    <div>
      {label && <label className="label">{label}</label>}

      <div className="flex flex-wrap gap-3">
        {values.map((url, i) => (
          <div key={`${url}-${i}`} className="relative">
            <img src={toImageUrl(url)} alt="" className="h-28 w-28 border border-stone-200 object-cover" />
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center border border-stone-300 bg-white text-xs text-stone-500 hover:border-red-400 hover:text-red-600"
              title="حذف تصویر"
            >
              ✕
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          disabled={uploading}
          className={`flex h-28 w-28 flex-col items-center justify-center gap-1 border border-dashed text-xs transition-colors ${
            dragging ? 'border-ink bg-stone-50' : 'border-stone-300 text-stone-500 hover:border-ink'
          }`}
        >
          {uploading ? (
            <span>...</span>
          ) : (
            <>
              <span className="text-xl">＋</span>
              <span>افزودن</span>
            </>
          )}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {hint && <p className="mt-1 text-xs text-stone-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
