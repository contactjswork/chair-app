'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

export default function HeroSearch() {
  const router = useRouter();
  const [value, setValue] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const path = value.trim()
      ? `/rechercher?q=${encodeURIComponent(value.trim())}`
      : '/rechercher';
    router.push(path);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl mx-auto">
      <div className="flex items-center bg-white rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/20">
        <Search size={17} className="ml-4 text-neutral-400 flex-shrink-0" />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Balayage, Barber, Lyon..."
          className="flex-1 pl-3 pr-2 py-4 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none bg-transparent"
        />
        <button
          type="submit"
          className="m-2 bg-neutral-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-neutral-700 transition-colors flex-shrink-0"
        >
          Rechercher
        </button>
      </div>
    </form>
  );
}
