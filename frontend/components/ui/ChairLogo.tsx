import Link from 'next/link';

interface ChairLogoProps {
  href?: string;
  dark?: boolean;
  size?: 'sm' | 'md' | 'lg';
  pro?: boolean;
  asSpan?: boolean;
}

export default function ChairLogo({
  href = '/',
  dark = false,
  size = 'md',
  pro = false,
  asSpan = false,
}: ChairLogoProps) {
  const color    = dark ? '#ffffff' : '#111111';
  const textCls  = size === 'sm' ? 'text-[15px]' : size === 'lg' ? 'text-[22px]' : 'text-[18px]';

  const inner = (
    <span className={`${textCls} font-bold tracking-tight leading-none flex-shrink-0`} style={{ color }}>
      {pro ? 'CHAIR PRO' : 'CHAIR'}
    </span>
  );

  if (asSpan) return inner;

  return (
    <Link href={href} className="flex-shrink-0">
      <span className={`${textCls} font-bold tracking-tight leading-none`} style={{ color }}>
        {pro ? 'CHAIR PRO' : 'CHAIR'}
      </span>
    </Link>
  );
}
