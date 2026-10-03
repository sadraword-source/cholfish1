import { useLocation, useNavigate } from 'react-router-dom';

interface BackButtonProps {
  className?: string;
  label?: string;
}

export default function BackButton({ className = '', label = 'بازگشت' }: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const historyIndex = typeof window !== 'undefined' ? (window.history.state?.idx ?? 0) : 0;
  const canGoBack = historyIndex > 0;

  if (!canGoBack || location.pathname === '/') return null;

  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      aria-label={label}
      title={label}
      className={`flex h-10 w-10 items-center justify-center text-stone-700 transition-colors duration-300 hover:text-ink ${className}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </button>
  );
}
