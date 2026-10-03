export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-ink" />
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner />
    </div>
  );
}

export function InlineLoading({ text = 'در حال بارگذاری...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <Spinner />
      <p className="text-[12px] tracking-wide text-stone-400">{text}</p>
    </div>
  );
}
