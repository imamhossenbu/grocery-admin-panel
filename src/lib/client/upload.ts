'use client';

import { redirectToLogin } from '@/lib/redirect-to-login';

export const ACCEPTED_IMAGE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/avif': ['.avif'],
  'image/gif': ['.gif'],
};
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** POST /api/upload with progress (XHR, since fetch has no upload progress). */
export function uploadImage(file: File, onProgress?: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');
    xhr.responseType = 'json';
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status === 401 || xhr.status === 403) {
        redirectToLogin();
        return reject(new Error('Your session expired. Please sign in again.'));
      }
      const body = xhr.response as { url?: string; message?: string } | null;
      if (xhr.status >= 200 && xhr.status < 300 && body?.url) resolve(body.url);
      else reject(new Error(body?.message || 'Image upload failed. Please try again.'));
    };
    xhr.onerror = () => reject(new Error('Could not reach the server to upload the image.'));
    const fd = new FormData();
    fd.append('file', file);
    xhr.send(fd);
  });
}
