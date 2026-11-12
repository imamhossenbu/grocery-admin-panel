import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || '';
const CLOUDINARY_CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'gki6moqt';
const CLOUDINARY_UPLOAD_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ecommerce';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    // 1. Try uploading directly to Cloudinary first (gki6moqt / preset: ecommerce)
    try {
      const cloudForm = new FormData();
      cloudForm.append('file', file);
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

    // 2. Reliable Fallback: Upload to Supabase Public Storage Bucket (`ecommerce-store/uploads/...`)
    const ext = file.name.split('.').pop() || 'jpg';
    const safeName = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buffer = await file.arrayBuffer();

    const supaRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/ecommerce-store/${safeName}`,
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_SECRET_KEY,
          Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
          'Content-Type': file.type || 'image/jpeg',
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
      { error: 'Failed to upload image to cloud storage' },
      { status: 500 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: 'Image upload failed', details: String(err) },
      { status: 500 }
    );
  }
}

