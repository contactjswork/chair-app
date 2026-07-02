import Image from 'next/image';

interface PhoneProps {
  src?: string;
  alt?: string;
  bg?: string;
  style?: React.CSSProperties;
  className?: string;
}

function Phone({ src, alt = 'CHAIR', bg = '#1a1a1a', style, className = '' }: PhoneProps) {
  return (
    <div
      className={`absolute w-[220px] h-[440px] rounded-[36px] shadow-2xl ${className}`}
      style={{ background: '#111', ...style }}
    >
      {/* Frame border */}
      <div className="absolute inset-0 rounded-[36px] ring-1 ring-white/10" />
      {/* Screen */}
      <div
        className="absolute inset-[9px] rounded-[28px] overflow-hidden"
        style={{ background: bg }}
      >
        {/* Dynamic island */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[88px] h-[26px] bg-black rounded-full z-10" />
        {src ? (
          <Image src={src} alt={alt} fill className="object-cover object-top" sizes="220px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[11px] font-bold" style={{ color: 'rgba(255,255,255,0.15)' }}>
              {alt}
            </span>
          </div>
        )}
      </div>
      {/* Side button */}
      <div className="absolute right-[-2px] top-[88px] w-[3px] h-[48px] rounded-l-full bg-[#222]" />
      <div className="absolute left-[-2px] top-[72px] w-[3px] h-[36px] rounded-r-full bg-[#222]" />
      <div className="absolute left-[-2px] top-[120px] w-[3px] h-[36px] rounded-r-full bg-[#222]" />
      {/* Home indicator */}
      <div className="absolute bottom-[10px] left-1/2 -translate-x-1/2 w-[80px] h-[4px] rounded-full bg-white/20" />
    </div>
  );
}

export default function PhoneStack() {
  return (
    <div className="relative w-[420px] h-[560px] flex-shrink-0">

      {/* Back phone — left, tilted, slightly transparent */}
      <Phone
        src="/mockups/mockup-profil.png"
        alt="Feed CHAIR"
        bg="#111"
        className="drop-shadow-2xl"
        style={{
          left: '0px',
          top: '60px',
          transform: 'rotate(-8deg) scale(0.88)',
          opacity: 0.55,
          zIndex: 1,
          boxShadow: '-20px 40px 80px rgba(0,0,0,0.8)',
        }}
      />

      {/* Front phone — center, upright */}
      <Phone
        src="/mockups/mockup-profil.png"
        alt="Profil CHAIR"
        bg="#161616"
        style={{
          left: '100px',
          top: '20px',
          zIndex: 3,
          boxShadow: '0 60px 120px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.08)',
        }}
      />

      {/* Far right phone — tilted right, most faded */}
      <Phone
        src="/mockups/mockup-profil.png"
        alt="Réservation"
        bg="#0f0f0f"
        style={{
          left: '210px',
          top: '80px',
          transform: 'rotate(9deg) scale(0.84)',
          opacity: 0.4,
          zIndex: 2,
          boxShadow: '20px 40px 80px rgba(0,0,0,0.8)',
        }}
      />

      {/* Floating badge — note */}
      <div
        className="absolute z-10 bg-white rounded-2xl px-4 py-3 shadow-2xl"
        style={{ bottom: '60px', left: '10px', minWidth: '140px' }}
      >
        <p className="text-[10px] font-semibold text-neutral-400 mb-1 uppercase tracking-wide">Nouveau RDV</p>
        <p className="text-[14px] font-bold text-neutral-900">Lundi · 10h00</p>
        <div className="flex items-center gap-1 mt-1">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <p className="text-[11px] text-neutral-500">Confirmé</p>
        </div>
      </div>

      {/* Floating badge — avis */}
      <div
        className="absolute z-10 bg-neutral-900 rounded-2xl px-4 py-3 shadow-2xl border border-white/10"
        style={{ top: '30px', right: '10px', minWidth: '130px' }}
      >
        <p className="text-[10px] font-semibold text-white/40 mb-1.5 uppercase tracking-wide">Avis certifié</p>
        <div className="flex gap-0.5 mb-1">
          {[1,2,3,4,5].map(i => (
            <svg key={i} width="10" height="10" viewBox="0 0 24 24" fill="#FBBF24">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
            </svg>
          ))}
        </div>
        <p className="text-[12px] font-bold text-white">5.0</p>
      </div>

    </div>
  );
}
