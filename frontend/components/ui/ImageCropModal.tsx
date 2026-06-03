'use client';

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, ZoomIn, ZoomOut, Check } from 'lucide-react';
import { getCroppedImageBlob, type PixelCrop } from '@/lib/cropImage';

interface Props {
  imageSrc: string;
  aspect: number;           // 1 pour carré/avatar, 3 pour bannière
  shape?: 'round' | 'rect';
  onConfirm: (blob: Blob, previewUrl: string) => void;
  onCancel: () => void;
}

export default function ImageCropModal({
  imageSrc,
  aspect,
  shape = 'rect',
  onConfirm,
  onCancel,
}: Props) {
  const [crop,       setCrop]       = useState({ x: 0, y: 0 });
  const [zoom,       setZoom]       = useState(1);
  const [croppedPx,  setCroppedPx]  = useState<PixelCrop | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_: unknown, croppedAreaPixels: PixelCrop) => {
    setCroppedPx(croppedAreaPixels);
  }, []);

  async function handleConfirm() {
    if (!croppedPx) return;
    setProcessing(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedPx, 0, 'image/jpeg', 0.92);
      const previewUrl = URL.createObjectURL(blob);
      onConfirm(blob, previewUrl);
    } catch {
      // fallback: upload l'image originale
      const res  = await fetch(imageSrc);
      const blob = await res.blob();
      onConfirm(blob, imageSrc);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-black">

      {/* Barre supérieure */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-4 bg-black/80 backdrop-blur-sm">
        <button
          onClick={onCancel}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm font-medium"
        >
          <X size={18} />
          Annuler
        </button>
        <p className="text-white text-sm font-semibold">
          {shape === 'round' ? 'Recadrer la photo' : 'Recadrer l\'image'}
        </p>
        <button
          onClick={handleConfirm}
          disabled={processing}
          className="flex items-center gap-2 bg-white text-neutral-900 font-semibold text-sm px-4 py-2 rounded-full hover:bg-neutral-100 disabled:opacity-50 transition-all"
        >
          {processing ? (
            <span className="w-4 h-4 border-2 border-neutral-400 border-t-neutral-900 rounded-full animate-spin" />
          ) : (
            <Check size={15} />
          )}
          Confirmer
        </button>
      </div>

      {/* Zone de recadrage */}
      <div className="flex-1 relative">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          cropShape={shape}
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          style={{
            containerStyle: { background: '#111' },
            cropAreaStyle:  {
              border: '2px solid rgba(255,255,255,0.8)',
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
            },
          }}
        />
      </div>

      {/* Barre de zoom */}
      <div className="flex-shrink-0 bg-black/80 backdrop-blur-sm px-6 py-5 flex items-center gap-4">
        <button
          onClick={() => setZoom((z) => Math.max(1, z - 0.1))}
          className="text-white/70 hover:text-white transition-colors"
        >
          <ZoomOut size={20} />
        </button>
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="flex-1 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-white"
        />
        <button
          onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
          className="text-white/70 hover:text-white transition-colors"
        >
          <ZoomIn size={20} />
        </button>
        <p className="text-white/40 text-[11px] w-8 text-right">{Math.round(zoom * 100)}%</p>
      </div>

      {/* Aide tactile */}
      <p className="flex-shrink-0 text-center text-white/30 text-[11px] pb-4 bg-black/80">
        Pincez pour zoomer · Glissez pour repositionner
      </p>

    </div>
  );
}
