'use client';

import React, { useId, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { ImagePlus, Link2, Trash2, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES, uploadImage } from '@/lib/client/upload';
import { Input } from './Input';

/** Single image: drag & drop / click to upload (with progress) or paste a URL. */
export function ImageUploadField({
  label,
  value,
  onChange,
  help = 'JPEG, PNG, WebP, AVIF or GIF up to 5 MB.',
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  help?: string;
}) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const urlId = useId();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPTED_IMAGE_TYPES,
    maxSize: MAX_IMAGE_BYTES,
    multiple: false,
    disabled: progress !== null,
    onDropRejected: (r) =>
      setError(r[0]?.errors[0]?.code === 'file-too-large' ? 'That image is larger than 5 MB.' : 'Only JPEG, PNG, WebP, AVIF or GIF images.'),
    onDropAccepted: async ([file]) => {
      setError(null);
      setProgress(0);
      try {
        onChange(await uploadImage(file, setProgress));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed.');
      } finally {
        setProgress(null);
      }
    },
  });

  return (
    <div className="space-y-2">
      <p className="text-[13px] font-semibold text-ink-2">{label}</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div
          {...getRootProps()}
          className={cn(
            'relative grid h-36 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-2xl border-2 border-dashed transition-colors sm:w-44',
            isDragActive ? 'border-primary bg-mint' : 'border-line-strong bg-mint-25 hover:border-primary/60 hover:bg-mint-50',
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15'
          )}
        >
          <input {...getInputProps()} aria-label={`Upload ${label}`} />
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-1.5 px-3 text-center text-[13px] text-muted">
              <ImagePlus className="h-6 w-6 text-primary" />
              {isDragActive ? 'Drop to upload' : 'Drop or click to upload'}
            </span>
          )}
          {value && progress === null && (
            <span className="absolute inset-x-2 bottom-2 flex items-center justify-center gap-1 rounded-lg bg-black/55 py-1 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100 [div:hover>&]:opacity-100">
              <UploadCloud className="h-3.5 w-3.5" /> Replace
            </span>
          )}
          {progress !== null && (
            <span className="absolute inset-0 grid place-items-center bg-white/80">
              <span className="w-24 space-y-1.5 text-center">
                <span className="tabular block text-[13px] font-semibold text-primary-600">{progress}%</span>
                <span className="block h-1.5 overflow-hidden rounded-full bg-[#e6efe9]">
                  <span className="block h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${progress}%` }} />
                </span>
              </span>
            </span>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <label htmlFor={urlId} className="text-[13px] text-muted">
            Or paste an image URL
          </label>
          <Input id={urlId} type="url" inputSize="sm" leading={<Link2 />} value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://…" />
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] font-semibold text-red-700 transition hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove image
            </button>
          )}
          {error ? (
            <p role="alert" className="text-[13px] font-medium text-red-700">
              {error}
            </p>
          ) : (
            <p className="text-[13px] text-subtle">{help}</p>
          )}
        </div>
      </div>
    </div>
  );
}
