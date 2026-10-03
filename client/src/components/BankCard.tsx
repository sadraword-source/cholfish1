import { faNum } from '../lib/format';

interface BankCardProps {
  cardNumber: string;
  holderName?: string;
  className?: string;
}

function groupCardNumber(value: string): string {
  return value.replace(/(\d{4})(?=\d)/g, '$1 ');
}

export default function BankCard({ cardNumber, holderName, className = '' }: BankCardProps) {
  const display = cardNumber || '1111111111111111';
  const holder = holderName?.trim();

  return (
    <div
      className={`relative overflow-hidden border border-white/10 bg-ink p-6 text-white sm:p-8 ${className}`}
    >
      {/* عناصر تزئینی مینیمال */}
      <div className="pointer-events-none absolute -top-16 -left-10 h-44 w-44 rounded-full bg-white/[0.03]" />
      <div className="pointer-events-none absolute -right-12 -bottom-20 h-56 w-56 rounded-full bg-white/[0.03]" />

      <div className="relative flex items-start justify-between">
        {/* تراشه کارت */}
        <div className="flex h-9 w-12 items-center justify-center bg-gold">
          <svg width="22" height="18" viewBox="0 0 22 18" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="1">
            <rect x="0.5" y="0.5" width="21" height="17" rx="3" />
            <path d="M0 6h7M0 12h7M15 6h7M15 12h7M7 0v18M15 0v18" />
          </svg>
        </div>
        <span className="text-sm font-extrabold tracking-[0.2em] text-white">چولفیش کت</span>
      </div>

      <p className="relative mt-8 text-[11px] tracking-widest text-white/45">شماره کارت</p>
      <p
        dir="ltr"
        className="relative mt-2 text-center text-lg font-bold tracking-[0.18em] text-white sm:text-2xl sm:tracking-[0.22em]"
      >
        {faNum(groupCardNumber(display))}
      </p>

      {holder && (
        <div className="relative mt-3 flex items-center justify-center gap-2">
          <span className="text-[11px] text-white/45">به نام</span>
          <span className="text-sm font-bold text-white">{holder}</span>
        </div>
      )}

      <div className="relative mt-8 flex items-center justify-between">
        <span className="text-[11px] tracking-wide text-white/45">واریز وجه سفارش</span>
        {/* نماد بی‌تماس */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="text-white/35">
          <path d="M6.5 8.5a8 8 0 010 7M9.5 7a11 11 0 010 10M12.5 5.5a14 14 0 010 13" />
        </svg>
      </div>
    </div>
  );
}
