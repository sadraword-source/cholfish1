import { useCallback, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { api } from '../../lib/api';
import { AdminLogFile, AdminLogContent } from '../../lib/types';
import { InlineLoading } from '../../components/ui/Loading';
import { ErrorState } from '../../components/ui/ErrorState';
import { faNum, formatDateTime } from '../../lib/format';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${faNum(bytes)} بایت`;
  if (bytes < 1024 * 1024) return `${faNum((bytes / 1024).toFixed(1))} کیلوبایت`;
  return `${faNum((bytes / (1024 * 1024)).toFixed(1))} مگابایت`;
}

function lineClass(line: string): string {
  if (line.includes('[ERROR]')) return 'text-red-400';
  if (line.includes('[WARN]')) return 'text-amber-300';
  return 'text-stone-300';
}

export default function AdminLogs() {
  const [files, setFiles] = useState<AdminLogFile[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState<AdminLogContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const logRef = useRef<HTMLDivElement>(null);

  const loadFiles = useCallback(async (): Promise<AdminLogFile[]> => {
    const res = await api.get<AdminLogFile[]>('/admin/logs');
    const list = res.data ?? [];
    setFiles(list);
    return list;
  }, []);

  const loadContent = useCallback(async (file: string, scroll = false) => {
    setLoadingContent(true);
    try {
      const res = await api.get<AdminLogContent>(`/admin/logs/${encodeURIComponent(file)}?lines=500`);
      setContent(res.data ?? null);
      if (scroll) {
        requestAnimationFrame(() => {
          const el = logRef.current;
          if (el) el.scrollTop = el.scrollHeight;
        });
      }
    } finally {
      setLoadingContent(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const list = await loadFiles();
        if (list[0]) {
          setSelected(list[0].name);
          await loadContent(list[0].name, true);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'خطا در دریافت لاگ‌ها');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadFiles, loadContent]);

  useEffect(() => {
    if (!autoRefresh || !selected) return;
    const id = setInterval(() => {
      loadFiles().catch(() => undefined);
      loadContent(selected).catch(() => undefined);
    }, 5000);
    return () => clearInterval(id);
  }, [autoRefresh, selected, loadFiles, loadContent]);

  const selectFile = (name: string) => {
    setSelected(name);
    loadContent(name, true).catch(() => undefined);
  };

  const refreshNow = () => {
    loadFiles().catch(() => undefined);
    if (selected) loadContent(selected, true).catch(() => undefined);
  };

  if (loading) return <InlineLoading text="در حال بارگذاری لاگ‌ها..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <Helmet>
        <title>لاگ‌های سرور | CAVERO</title>
      </Helmet>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">لاگ‌های سرور</h1>
          <p className="mt-1 text-sm text-stone-500">
            {files.length > 0 ? `${faNum(files.length)} فایل لاگ` : 'لاگی ثبت نشده است'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-stone-500">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            بروزرسانی خودکار
          </label>
          <button type="button" onClick={refreshNow} className="btn-outline !px-4 !py-2 text-xs">
            بروزرسانی
          </button>
        </div>
      </div>

      {files.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-stone-200 bg-white px-6 py-16 text-center text-sm text-stone-500">
          هنوز لاگی ثبت نشده است.
        </div>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-[240px_1fr]">
          {/* لیست فایل‌ها */}
          <div className="space-y-2">
            {files.map((f) => {
              const isActive = f.name === selected;
              const isError = f.name.startsWith('error-');
              return (
                <button
                  key={f.name}
                  type="button"
                  onClick={() => selectFile(f.name)}
                  className={`block w-full rounded-xl border p-3 text-right transition-colors ${
                    isActive ? 'border-ink bg-ink text-white' : 'border-stone-200 bg-white hover:border-ink'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        isError ? 'bg-red-400' : 'bg-green-400'
                      }`}
                    />
                    <span className="truncate text-xs font-semibold" dir="ltr">
                      {f.name}
                    </span>
                  </span>
                  <span className={`mt-1 block text-[10px] ${isActive ? 'text-white/60' : 'text-stone-400'}`}>
                    {formatBytes(f.size)} · {formatDateTime(f.modified)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* محتوای لاگ */}
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3 rounded-t-2xl border border-b-0 border-stone-200 bg-stone-50 px-4 py-2.5">
              <span className="text-xs font-semibold text-stone-600" dir="ltr">
                {content?.file ?? selected}
              </span>
              <span className="text-[11px] text-stone-400">
                {content ? `${faNum(content.totalLines)} خط` : ''}
                {content?.truncated ? ' — نمایش ۵۰۰ خط آخر' : ''}
              </span>
            </div>
            <div
              ref={logRef}
              dir="ltr"
              className="max-h-[62vh] overflow-auto rounded-b-2xl bg-ink p-4 text-left font-mono text-[11px] leading-6"
            >
              {loadingContent && !content ? (
                <span className="text-stone-400">در حال بارگذاری...</span>
              ) : content && content.lines.length > 0 ? (
                content.lines.map((line, i) => (
                  <div key={i} className={`whitespace-pre-wrap break-all ${lineClass(line)}`}>
                    {line}
                  </div>
                ))
              ) : (
                <span className="text-stone-400">این فایل خالی است.</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
