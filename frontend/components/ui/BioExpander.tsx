'use client';

import { useState } from 'react';

export default function BioExpander({ bio }: { bio: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = bio.length > 200;

  return (
    <div>
      <p
        className={`text-[14px] text-neutral-600 leading-relaxed whitespace-pre-line ${
          !expanded && isLong ? 'line-clamp-4' : ''
        }`}
      >
        {bio}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-1.5 text-[12px] font-semibold text-neutral-900 hover:underline"
        >
          {expanded ? 'Voir moins' : 'Voir plus'}
        </button>
      )}
    </div>
  );
}
