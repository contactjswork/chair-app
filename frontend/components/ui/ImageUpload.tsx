'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Upload, X, Loader } from 'lucide-react';
import { getStoredToken } from '@/lib/auth';

interface Props {
  currentUrl: string | null;
  endpoint: string;           // ex: '/api/profile/avatar'
  onSuccess: (url: string) => void;
  label: string;
  aspectClass?: string;       // ex: 'aspect-square' | 'aspect-[3/1]'
  shape?: 'circle' | 'rect';
}

export default function ImageUpload({
  currentUrl,
  endpoint,
  onSuccess,
  label,
  aspectClass = 'aspect-square',
  shape = 'rect',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const displayUrl = preview ?? currentUrl;
  const rounded = shape === 'circle' ? 'rounded-full' : 'rounded-xl';

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Fichier image requis (JPG, PNG, WebP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image trop lourde (max 5 Mo)');
      return;
    }

    setError('');
    setPreview(URL.createObjectURL(file));
    setUploading(true);

    const formData = new FormData();
    const fieldName = endpoint.includes('avatar') ? 'avatar' : 'banner';
    formData.append(fieldName, file);

    try {
      const token = getStoredToken();
      const res = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Erreur ${res.status}`);
      }

      const data = await res.json();
      const url: string = data.avatar ?? data.banner_image;
      onSuccess(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'upload");
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <span className="text-xs font-semibold text-neutral-600">{label}</span>

      <div
        className={`relative ${aspectClass} w-full max-w-[200px] ${rounded} overflow-hidden bg-neutral-100 border border-neutral-200 cursor-pointer group`}
        onClick={() => inputRef.current?.click()}
      >
        {displayUrl ? (
          <Image
            src={displayUrl.startsWith('/storage/')
              ? `http://localhost:8000${displayUrl}`
              : displayUrl}
            alt={label}
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-300">
            <Upload size={24} />
          </div>
        )}

        {/* Overlay au hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {uploading ? (
            <Loader size={20} className="text-white animate-spin" />
          ) : (
            <Upload size={20} className="text-white" />
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />

      {error && <p className="text-xs text-red-500">{error}</p>}
      {!error && (
        <p className="text-[11px] text-neutral-400">JPG, PNG ou WebP — max 5 Mo</p>
      )}
    </div>
  );
}
