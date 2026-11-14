'use client';

import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowLeft, ArrowRight, GripVertical, ImagePlus, Link2, Plus, Star, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES, uploadImage } from '@/lib/client/upload';
import { Input } from './Input';
import { Button } from './Button';
import { Tooltip } from './Tooltip';

interface Uploading {
  id: string;
  name: string;
  progress: number;
  preview: string;
}

function Tile({
  url,
  index,
  count,
  onMove,
  onRemove,
}: {
  url: string;
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: url });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group relative aspect-square overflow-hidden rounded-2xl border bg-mint-25 shadow-soft',
        index === 0 ? 'border-primary ring-2 ring-primary/20' : 'border-line',
        isDragging && 'z-10 scale-[1.03] shadow-pop'
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={`Image ${index + 1}`} className="h-full w-full object-cover" draggable={false} />
      {index === 0 && (
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">
          <Star className="h-3 w-3 fill-current" /> Main
        </span>
      )}
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Reorder image ${index + 1} of ${count}. Use space then arrow keys.`}
        className="absolute right-2 top-2 grid h-8 w-8 cursor-grab touch-none place-items-center rounded-lg bg-white/90 text-muted shadow-sm transition hover:text-ink active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        <div className="flex gap-1">
          <Tooltip content="Move left">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => onMove(index, index - 1)}
              aria-label="Move image left"
              className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg bg-white/90 text-ink shadow-sm disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Tooltip>
          <Tooltip content="Move right">
            <button
              type="button"
              disabled={index === count - 1}
              onClick={() => onMove(index, index + 1)}
              aria-label="Move image right"
              className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg bg-white/90 text-ink shadow-sm disabled:opacity-40"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </Tooltip>
        </div>
        <Tooltip content="Remove image">
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove image"
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg bg-white/90 text-red-600 shadow-sm"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </Tooltip>
      </div>
    </li>
  );
}

/**
 * Multi-image gallery: drop/click to upload several (with per-file progress),
 * paste URLs, drag (or keyboard) to reorder. The first image is the main one.
 */
export function ImageGallery({ value, onChange, max = 8, error }: { value: string[]; onChange: (urls: string[]) => void; max?: number; error?: string | null }) {
  const [uploads, setUploads] = useState<Uploading[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const room = max - value.length - uploads.length;

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: ACCEPTED_IMAGE_TYPES,
    maxSize: MAX_IMAGE_BYTES,
    multiple: true,
    noClick: true,
    disabled: room <= 0,
    onDropRejected: (r) =>
      setProblem(r.some((x) => x.errors[0]?.code === 'file-too-large') ? 'Some images are larger than 5 MB.' : 'Only JPEG, PNG, WebP, AVIF or GIF images.'),
    onDropAccepted: async (files) => {
      setProblem(null);
      const batch = files.slice(0, Math.max(0, room)).map((f) => ({
        file: f,
        item: { id: `${f.name}-${f.size}-${Math.random()}`, name: f.name, progress: 0, preview: URL.createObjectURL(f) },
      }));
      if (files.length > batch.length) setProblem(`Only ${max} images are allowed.`);
      setUploads((u) => [...u, ...batch.map((b) => b.item)]);
      const done: string[] = [];
      await Promise.all(
        batch.map(async ({ file, item }) => {
          try {
            const uploaded = await uploadImage(file, (p) => setUploads((u) => u.map((x) => (x.id === item.id ? { ...x, progress: p } : x))));
            done.push(uploaded);
          } catch (e) {
            setProblem(e instanceof Error ? e.message : 'Upload failed.');
          } finally {
            URL.revokeObjectURL(item.preview);
            setUploads((u) => u.filter((x) => x.id !== item.id));
          }
        })
      );
      if (done.length) onChange([...value, ...done]);
    },
  });

  const move = (from: number, to: number) => onChange(arrayMove(value, from, to));
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    move(value.indexOf(String(e.active.id)), value.indexOf(String(e.over.id)));
  };

  const addUrl = () => {
    const u = url.trim();
    if (!/^https?:\/\/\S+$/i.test(u)) return setProblem('Enter a full image URL starting with https://');
    if (value.includes(u)) return setProblem('That image is already in the gallery.');
    if (room <= 0) return setProblem(`Only ${max} images are allowed.`);
    setProblem(null);
    onChange([...value, u]);
    setUrl('');
  };

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn('rounded-2xl border-2 border-dashed p-3 transition-colors', isDragActive ? 'border-primary bg-mint' : 'border-transparent')}
      >
        <input {...getInputProps()} aria-label="Upload product images" />
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={value} strategy={rectSortingStrategy}>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-label="Product images">
              {value.map((u, i) => (
                <Tile key={`${i}-${u}`} url={u} index={i} count={value.length} onMove={move} onRemove={() => onChange(value.filter((_, j) => j !== i))} />
              ))}
              {uploads.map((u) => (
                <li key={u.id} className="relative aspect-square overflow-hidden rounded-2xl border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u.preview} alt="" className="h-full w-full object-cover opacity-50" />
                  <span className="absolute inset-x-3 bottom-3 space-y-1">
                    <span className="tabular block text-xs font-semibold text-ink">{u.progress}%</span>
                    <span className="block h-1.5 overflow-hidden rounded-full bg-white/80">
                      <span className="block h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${u.progress}%` }} />
                    </span>
                  </span>
                </li>
              ))}
              {room > 0 && (
                <li>
                  <button
                    type="button"
                    onClick={open}
                    className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-strong bg-mint-25 text-[13px] font-medium text-muted transition hover:border-primary/60 hover:bg-mint-50 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                  >
                    <ImagePlus className="h-6 w-6 text-primary" />
                    {isDragActive ? 'Drop images' : 'Add images'}
                    <span className="text-[13px] text-subtle">or drop files here</span>
                  </button>
                </li>
              )}
            </ul>
          </SortableContext>
        </DndContext>
      </div>
      <div className="flex gap-2">
        <Input
          inputSize="sm"
          type="url"
          leading={<Link2 />}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addUrl();
            }
          }}
          placeholder="Paste an image URL"
          aria-label="Image URL"
          className="flex-1"
        />
        <Button variant="outline" size="sm" className="h-9" onClick={addUrl} disabled={!url.trim() || room <= 0}>
          <Plus className="h-4 w-4" /> Add URL
        </Button>
      </div>
      {(problem || error) && (
        <p role="alert" className="text-[13px] font-medium text-red-700">
          {problem ?? error}
        </p>
      )}
      <p className="text-[13px] text-subtle">Drag to reorder. The first image is the main photo on the storefront. Up to {max} images, 5 MB each.</p>
    </div>
  );
}
