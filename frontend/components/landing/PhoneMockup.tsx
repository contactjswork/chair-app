import Image from 'next/image';

interface PhoneMockupProps {
  className?: string;
  gradient?: string;
  label?: string;
  imageSrc?: string;
  rotate?: 'left' | 'right' | 'none';
}

export default function PhoneMockup({
  className = '',
  gradient = 'from-neutral-800 to-neutral-900',
  label,
  imageSrc,
  rotate = 'none',
}: PhoneMockupProps) {
  const rotation =
    rotate === 'right' ? 'rotate-[8deg]' :
    rotate === 'left'  ? '-rotate-[8deg]' :
    '';

  return (
    <div className={`relative inline-block ${rotation} ${className}`}>
      {/* Phone outer frame */}
      <div className="w-[260px] h-[530px] bg-neutral-950 rounded-[44px] p-[10px] shadow-[0_32px_80px_-12px_rgba(0,0,0,0.35)]">
        {/* Screen */}
        <div className={`w-full h-full rounded-[36px] overflow-hidden bg-gradient-to-br ${gradient} relative`}>
          {imageSrc ? (
            <Image src={imageSrc} alt="CHAIR app" fill className="object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6">
              <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">
                <span className="text-white text-[15px] font-black">C</span>
              </div>
              {label && (
                <p className="text-white/40 text-[12px] font-medium text-center leading-snug">{label}</p>
              )}
            </div>
          )}
          {/* Status bar overlay */}
          <div className="absolute top-0 left-0 right-0 h-10 flex items-end justify-between px-5 pb-2">
            <span className="text-white/60 text-[11px] font-semibold">9:41</span>
            <div className="flex items-center gap-1">
              <div className="w-3.5 h-2 border border-white/40 rounded-sm relative">
                <div className="absolute inset-[1px] left-0 right-[30%] bg-white/60 rounded-sm" />
              </div>
            </div>
          </div>
          {/* Dynamic island */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full" />
          {/* Home indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-1 bg-white/30 rounded-full" />
        </div>
      </div>
    </div>
  );
}
