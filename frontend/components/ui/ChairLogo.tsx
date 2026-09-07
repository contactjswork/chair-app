import Link from 'next/link';

interface ChairLogoProps {
  href?: string;
  dark?: boolean;
  size?: 'sm' | 'md' | 'lg';
  pro?: boolean;
  /** Wordmark « CHAIR BUSINESS » (app gérant) — même famille, même style. */
  business?: boolean;
  asSpan?: boolean;
}

export default function ChairLogo({
  href = '/',
  dark = false,
  size = 'md',
  pro = false,
  business = false,
  asSpan = false,
}: ChairLogoProps) {
  // Classes plutôt qu'une couleur inline : text-neutral-900 suit le remap
  // du mode sombre (globals.css), un style inline le battrait toujours.
  const colorCls = dark ? 'text-white' : 'text-neutral-900';
  const textCls  = size === 'sm' ? 'text-[15px]' : size === 'lg' ? 'text-[22px]' : 'text-[18px]';
  const wordmark = business ? 'CHAIR BUSINESS' : pro ? 'CHAIR PRO' : 'CHAIR';

  const inner = (
    <span className={`${textCls} ${colorCls} font-bold tracking-tight leading-none flex-shrink-0`}>
      {wordmark}
    </span>
  );

  if (asSpan) return inner;

  return (
    <Link href={href} className="flex-shrink-0">
      <span className={`${textCls} ${colorCls} font-bold tracking-tight leading-none`}>
        {wordmark}
      </span>
    </Link>
  );
}
