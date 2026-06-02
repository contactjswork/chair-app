'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';

interface Props {
  images: string[];
  alt?: string;
  aspectClass?: string;
}

export default function PostCarousel({ images, alt = '', aspectClass = 'aspect-square' }: Props) {
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.offsetWidth);
    setCurrent(index);
  }

  function goTo(index: number) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: el.offsetWidth * index, behavior: 'smooth' });
    setCurrent(index);
  }

  if (images.length === 0) return null;

  if (images.length === 1) {
    return (
      <div className={`relative w-full ${aspectClass} bg-neutral-100`}>
        <Image src={images[0]} alt={alt} fill priority className="object-cover" sizes="(max-width: 672px) 100vw, 672px" />
      </div>
    );
  }

  return (
    <div className={`relative w-full ${aspectClass}`}>
      {/* Scrollable strip */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="absolute inset-0 flex overflow-x-auto no-scrollbar"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {images.map((src, i) => (
          <div
            key={i}
            className="relative flex-shrink-0 w-full h-full"
            style={{ scrollSnapAlign: 'start' }}
          >
            <Image
              src={src}
              alt={`${alt} ${i + 1}`}
              fill
              priority={i === 0}
              className="object-cover"
              sizes="(max-width: 672px) 100vw, 672px"
            />
          </div>
        ))}
      </div>

      {/* Counter badge */}
      <div className="absolute top-3 right-3 z-10 bg-black/50 backdrop-blur-sm text-white text-[11px] font-semibold px-2.5 py-1 rounded-full tabular-nums">
        {current + 1}/{images.length}
      </div>

      {/* Dot indicator */}
      <div className="absolute bottom-3 left-0 right-0 z-10 flex justify-center gap-1.5">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`w-1.5 h-1.5 rounded-full transition-all ${i === current ? 'bg-white scale-110' : 'bg-white/40'}`}
          />
        ))}
      </div>
    </div>
  );
}
