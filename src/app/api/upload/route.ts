import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || '';
const CLOUDINARY_CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'gki6moqt';
const CLOUDINARY_UPLOAD_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ecommerce';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// Allowed MIME type -> file extension used for the Supabase Storage fallback.
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
};

function badRequest(error: string, message: string) {
  return NextResponse.json({ error, message }, { status: 400 });
}

/** Detects the real image type from the first bytes, ignoring what the client claims. */
function sniffImageType(bytes: Uint8Array): string | null {
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.subarray(start, end));

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes[0] === 0x89 && ascii(1, 4) === 'PNG') return 'image/png';
  if (ascii(0, 4) === 'GIF8') return 'image/gif';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  if (ascii(4, 8) === 'ftyp' && /^(avif|avis)$/.test(ascii(8, 12))) return 'image/avif';
  return null;
}

export async function POST(req: NextRequest) {
  // Checked before the body is read, so non-admins can't even send a file.
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return badRequest('INVALID_UPLOAD', 'Send the image as multipart form data in a "file" field.');
    }

    const file = formData.get('file');
    if (!(file instanceof File)) {
      return badRequest('NO_FILE', 'No image file provided.');
    }
    if (file.size === 0) {
      return badRequest('EMPTY_FILE', 'The selected file is empty.');
    }
    if (file.size > MAX_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      return badRequest(
        'FILE_TOO_LARGE',
        `Image is ${sizeMb} MB. The maximum allowed size is 5 MB.`
      );
    }
    if (!(file.type in ALLOWED_TYPES)) {
      return badRequest(
        'UNSUPPORTED_TYPE',
        'Only JPEG, PNG, WebP, AVIF or GIF images can be uploaded.'
      );
    }

    const buffer = await file.arrayBuffer();
    const actualType = sniffImageType(new Uint8Array(buffer, 0, Math.min(16, buffer.byteLength)));
    if (!actualType) {
      return badRequest(
        'UNSUPPORTED_TYPE',
        'This file is not a valid JPEG, PNG, WebP, AVIF or GIF image.'
      );
    }
    // Trust the detected type, not the name/type the browser sent.
    const ext = ALLOWED_TYPES[actualType];
    const image = new Blob([buffer], { type: actualType });

    // 1. Try Cloudinary first (unsigned upload preset)
    try {
      const cloudForm = new FormData();
      cloudForm.append('file', image, `upload.${ext}`);
      cloudForm.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: cloudForm,
        }
      );

      if (cloudRes.ok) {
        const cloudJson = await cloudRes.json();
        if (cloudJson.secure_url) {
          return NextResponse.json({
            url: cloudJson.secure_url,
            provider: 'cloudinary',
          });
        }
      }
    } catch {
      // Proceed to Supabase Storage fallback
    }

    // 2. Fallback: Supabase public Storage bucket (`ecommerce-store/products/...`)
    const safeName = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const supaRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/ecommerce-store/${safeName}`,
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_SECRET_KEY,
          Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
          'Content-Type': actualType,
          'x-upsert': 'true',
        },
        body: buffer,
      }
    );

    if (supaRes.ok) {
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/ecommerce-store/${safeName}`;
      return NextResponse.json({
        url: publicUrl,
        provider: 'supabase-storage',
      });
    }

    return NextResponse.json(
      {
        error: 'UPLOAD_FAILED',
        message: 'Could not upload the image to Cloudinary or Supabase Storage. Please try again.',
      },
      { status: 502 }
    );
  } catch (err) {
    console.error('[api/upload] unexpected error:', err);
    return NextResponse.json(
      { error: 'UPLOAD_FAILED', message: 'Image upload failed. Please try again.' },
      { status: 500 }
    );
  }
}
