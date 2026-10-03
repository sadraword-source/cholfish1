const STAR_PATH =
  'M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.78L10 14.77 4.8 17.5l.99-5.78-4.21-4.1 5.82-.85L10 1.5z';

const DISPLAY_SIZES = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-6 w-6',
} as const;

interface StarsProps {
  value: number;
  size?: keyof typeof DISPLAY_SIZES;
  className?: string;
}

export function Stars({ value, size = 'md', className = '' }: StarsProps) {
  const cls = DISPLAY_SIZES[size];
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`امتیاز ${value} از ۵`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`${cls} ${i <= Math.round(value) ? 'text-gold' : 'text-stone-200'}`}
          aria-hidden="true"
        >
          <path d={STAR_PATH} />
        </svg>
      ))}
    </span>
  );
}

interface StarInputProps {
  value: number;
  onChange: (value: number) => void;
}

export function StarInput({ value, onChange }: StarInputProps) {
  return (
    <div className="inline-flex items-center gap-1" role="radiogroup" aria-label="انتخاب امتیاز">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} ستاره`}
          onClick={() => onChange(i)}
          className="transition-transform hover:scale-110"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className={`h-7 w-7 ${i <= value ? 'text-gold' : 'text-stone-300'}`} aria-hidden="true">
            <path d={STAR_PATH} />
          </svg>
        </button>
      ))}
    </div>
  );
}
