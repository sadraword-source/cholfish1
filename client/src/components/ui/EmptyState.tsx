import { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-stone-200 bg-white px-6 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center border border-stone-200 text-stone-400">
        {icon ?? (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="h-7 w-7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 016.5 7.5h11a1.125 1.125 0 011.11 1.007z" />
          </svg>
        )}
      </div>
      <h3 className="mt-6 text-lg font-bold text-ink">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm leading-7 text-stone-500">{description}</p>}
      {action && <div className="mt-7">{action}</div>}
    </div>
  );
}
