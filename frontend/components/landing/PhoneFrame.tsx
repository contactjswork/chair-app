import Image from 'next/image';

interface PhoneFrameProps {
  src?: string;
  alt?: string;
  label?: string;
  className?: string;
  bg?: string;
}

export default function PhoneFrame({
  src,
  alt = 'Capture CHAIR',
  label,
  className = '',
  bg = 'bg-neutral-100',
}: PhoneFrameProps) {
  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      {/* Phone shell */}
      <div className="relative w-[220px] h-[440px] rounded-[36px] bg-neutral-900 p-[10px] shadow-2xl shadow-black/30">
        {/* Screen */}
        <div className={`w-full h-full rounded-[28px] overflow-hidden ${bg} relative`}>
          {/* Notch */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-14 h-4 bg-neutral-900 rounded-full z-10" />
          {src ? (
            <Image src={src} alt={alt} fill className="object-cover object-top" sizes="220px" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <div className="w-8 h-8 bg-neutral-200 rounded-xl flex items-center justify-center">
                <span className="text-neutral-400 text-[11px] font-black">C</span>
              </div>
              {label && <p className="text-[10px] text-neutral-400 font-medium">{label}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
