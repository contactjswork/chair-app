'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Camera, GripVertical, Star, Trash2, Upload, Check } from 'lucide-react';
import { resolveMediaUrl } from '@/lib/types';

const SHOT_CHECKLIST = [
  'Vue générale de l’espace',
  'Le fauteuil / poste de travail',
  'Le miroir',
  'Le bac à shampoing',
  'Un espace de rangement',
  'La zone d’attente',
  'La façade / entrée du salon',
];

interface Props {
  photos: string[];
  uploading: boolean;
  onUpload: (files: File[]) => void;
  onDelete: (url: string) => void;
  onReorder: (photos: string[]) => void;
}

/** Galerie style Airbnb : drop de fichiers, réorganisation par glisser-déposer (1re photo = couverture), checklist de prises de vue. */
export default function PhotoDropzone({ photos, uploading, onUpload, onDelete, onReorder }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    onUpload(Array.from(fileList));
  }

  function handleReorderDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const next = [...photos];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    onReorder(next);
    setDragIndex(null);
  }

  return (
    <div className="space-y-5">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
        onDragLeave={() => setIsDraggingFile(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingFile(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-10 px-4 text-center cursor-pointer transition-colors ${
          isDraggingFile ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-300 hover:border-neutral-400'
        }`}
      >
        {uploading ? (
          <div className="w-6 h-6 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
        ) : (
          <Upload size={22} className="text-neutral-400" />
        )}
        <p className="text-sm font-semibold text-neutral-700">Glissez vos photos ici</p>
        <p className="text-xs text-neutral-400">ou cliquez pour sélectionner — plusieurs à la fois</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
        />
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((url, i) => (
            <div
              key={url}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleReorderDrop(i)}
              className="relative aspect-square rounded-2xl overflow-hidden bg-neutral-100 ring-1 ring-neutral-100 group"
            >
              <Image src={resolveMediaUrl(url) ?? url} alt="" fill className="object-cover" sizes="200px" />
              {i === 0 && (
                <span className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-neutral-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <Star size={9} className="fill-white" />Couverture
                </span>
              )}
              <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => onDelete(url)}
                  className="w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-black/40 text-white flex items-center justify-center cursor-grab">
                <GripVertical size={12} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-neutral-50 rounded-2xl p-4">
        <p className="text-xs font-semibold text-neutral-700 mb-2 flex items-center gap-1.5">
          <Camera size={13} className="text-neutral-400" />
          Idées de photos pour une annonce complète
        </p>
        <div className="space-y-1.5">
          {SHOT_CHECKLIST.map((shot) => (
            <button
              key={shot}
              type="button"
              onClick={() => setChecked((p) => ({ ...p, [shot]: !p[shot] }))}
              className="w-full flex items-center gap-2 text-left"
            >
              <span className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                checked[shot] ? 'bg-neutral-900 border-neutral-900' : 'border-neutral-300'
              }`}>
                {checked[shot] && <Check size={10} className="text-white" strokeWidth={3} />}
              </span>
              <span className={`text-xs ${checked[shot] ? 'text-neutral-400 line-through' : 'text-neutral-600'}`}>{shot}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
