'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Upload, Loader } from 'lucide-react';
import { getStoredToken } from '@/lib/auth';
import ImageCropModal from './ImageCropModal';

interface Props {
  currentUrl: string | null;
  endpoint: string;
  onSuccess: (url: string) => void;
  label: string;
  aspectClass?: string;
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
  const inputRef   = useRef<HTMLInputElement>(null);
  const [preview,  setPreview]  = useState<string | null>(null);
  const [cropSrc,  setCropSrc]  = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error,    setError]    = useState('');

  const displayUrl = preview ?? currentUrl;
  const rounded    = shape === 'circle' ? 'rounded-full' : 'rounded-xl';
  const cropAspect = shape === 'circle' ? 1 : endpoint.includes('banner') ? 3 : 1;

  function handleFileSelect(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Fichier image requis (JPG, PNG, WebP)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image trop lourde (max 10 Mo)');
      return;
    }
    setError('');
    setCropSrc(URL.createObjectURL(file));
  }

  async function handleCropConfirm(blob: Blob, previewUrl: string) {
    setCropSrc(null);
    setPreview(previewUrl);
    setUploading(true);

    const formData = new FormData();
    const fieldName = endpoint.includes('avatar') ? 'avatar' : 'banner';
    formData.append(fieldName, blob, `${fieldName}.jpg`);

    try {
      const token = getStoredToken();
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
      const path = endpoint.startsWith('/api/') ? endpoint.slice(4) : endpoint;
      const res = await fetch(`${apiBase}${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Erreur ${res.status}`);
      }
      const data = await res.json();
      const url: string = data.avatar ?? data.banner_image ?? data.url ?? previewUrl;
      onSuccess(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'upload");
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <div className="flex flex-col items-start gap-2">
        <span className="text-xs font-semibold text-neutral-600">{label}</span>

        <div
          className={`relative ${aspectClass} w-full max-w-[200px] ${rounded} overflow-hidden bg-neutral-100 border border-neutral-200 cursor-pointer group`}
          onClick={() => inputRef.current?.click()}
        >
          {displayUrl ? (
            <Image
              src={displayUrl.startsWith('/storage/')
                ? `${(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api').replace(/\/api$/, '')}${displayUrl}`
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
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = ''; }}
        />

        {error && <p className="text-xs text-red-500">{error}</p>}
        {!error && <p className="text-[11px] text-neutral-400">JPG, PNG ou WebP — max 10 Mo</p>}
      </div>

      {/* Modal de recadrage */}
      {cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          aspect={cropAspect}
          shape={shape === 'circle' ? 'round' : 'rect'}
          onConfirm={handleCropConfirm}
          onCancel={() => { setCropSrc(null); }}
        />
      )}
    </>
  );
}
