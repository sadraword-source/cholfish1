import { ReactNode } from 'react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  children?: ReactNode;
  action?: ReactNode;
}

export function ErrorState({ title = 'خطایی رخ داد', message, onRetry, children, action }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-stone-200 bg-ivory px-6 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-stone-200 bg-white text-red-500">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-7 w-7">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <h3 className="mt-6 text-lg font-bold text-ink">{title}</h3>
      {message && <p className="mt-2 max-w-sm text-sm leading-7 text-stone-500">{message}</p>}
      {children}
      {action}
      {onRetry && (
        <button onClick={onRetry} className="btn-outline mt-7">
          تلاش مجدد
        </button>
      )}
    </div>
  );
}
