'use client';

import React, { useId, useState } from 'react';
import { Image as ImageIcon, Loader2, UploadCloud } from 'lucide-react';
import { redirectToLogin } from '@/lib/redirect-to-login';

interface ImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
}

/** Image preview + Cloudinary upload (POST /api/upload) + manual URL input. */
export function ImageUploadField({ label, value, onChange }: ImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const urlInputId = useId();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch('/api/upload', { method: 'POST', body: fd });

      if (res.status === 401 || res.status === 403) {
        redirectToLogin();
        return;
      }
      const data = await res.json().catch(() => null);
      if (res.ok && data?.url) {
        onChange(data.url);
      } else {
        setError(data?.message || 'Image upload failed. Please try again.');
      }
    } catch (err) {
      console.error('Image upload failed:', err);
      setError('Could not reach the server to upload the image.');
    } finally {
      setUploading(false);
      // Allow picking the same file again after an error.
      e.target.value = '';
    }
  };

  return (
    <div className="rounded-2xl border border-[#dfece3] bg-[#f7faf8] p-4 space-y-3">
      <label htmlFor={urlInputId} className="block text-xs font-bold text-[#112a1d]">
        {label}
      </label>

      <div className="flex flex-wrap items-center gap-4">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt="Preview"
            className="w-20 h-20 rounded-xl object-cover border border-[#cfe3d6] bg-white"
          />
        ) : (
          <div className="grid place-items-center w-20 h-20 rounded-xl bg-white border border-dashed border-[#cfe3d6] text-[#7a9485]">
            <ImageIcon className="w-6 h-6" />
          </div>
        )}

        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-[#cfe3d6] px-3.5 py-2 text-xs font-bold text-[#14522f] hover:bg-[#e8f5ee] focus-within:ring-2 focus-within:ring-[#1a663b] transition cursor-pointer">
              {uploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <UploadCloud className="w-3.5 h-3.5 text-[#1a663b]" />
              )}
              <span>{uploading ? 'Uploading...' : 'Upload to Cloudinary'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                disabled={uploading}
                onChange={handleUpload}
                className="sr-only"
              />
            </label>
            <span className="text-[11px] text-[#5a7165]">or paste URL below</span>
          </div>
          {error && (
            <p role="alert" className="text-[11px] font-semibold text-red-700">
              {error}
            </p>
          )}

          <input
            id={urlInputId}
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://images.unsplash.com/... or Cloudinary URL"
            className="w-full rounded-xl border border-[#cfe3d6] bg-white px-3 py-1.5 text-xs focus:border-[#1a663b] focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
