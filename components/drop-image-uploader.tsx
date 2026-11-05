'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Loader2, Image as ImageIcon, X } from 'lucide-react';

const MAX_IMAGES = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

type Props = {
  designerId: string;
  images: string[];
  onChange: (images: string[]) => void;
  onError: (message: string) => void;
};

export function DropImageUploader({ designerId, images, onChange, onError }: Props) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    try {
      const newUrls: string[] = [];
      for (const file of Array.from(files)) {
        if (images.length + newUrls.length >= MAX_IMAGES) break;
        if (file.size > MAX_FILE_SIZE) {
          onError(`${file.name} is too large. Max 5MB per image.`);
          continue;
        }
        const ext = file.name.split('.').pop();
        const fileName = `${designerId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('drop-images').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('drop-images').getPublicUrl(fileName);
        newUrls.push(data.publicUrl);
      }
      onChange([...images, ...newUrls]);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="grid grid-cols-3 gap-3">
      {images.map((url, index) => (
        <div key={url} className="relative aspect-square rounded-2xl border border-white/15 overflow-hidden group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={`Drop image ${index + 1}`} className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(images.filter((_, i) => i !== index))}
            aria-label="Remove image"
            className="absolute top-2 right-2 rounded-full bg-black/70 p-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      {images.length < MAX_IMAGES && (
        <label className="flex aspect-square cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-white/15 bg-card transition-all hover:border-lime/40">
          <div className="text-center">
            {uploading ? (
              <Loader2 className="h-6 w-6 text-lime animate-spin mx-auto" />
            ) : (
              <>
                <ImageIcon className="h-6 w-6 text-white/30 mx-auto mb-1" />
                <span className="text-xs text-white/30">Upload</span>
              </>
            )}
          </div>
          <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" disabled={uploading} />
        </label>
      )}
    </div>
  );
}
