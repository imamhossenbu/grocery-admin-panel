import 'server-only';
import { NextResponse } from 'next/server';
import { StoreError } from '@/lib/supabase-db';

export const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

export function apiError(err: unknown, where: string) {
  if (err instanceof StoreError) {
    return NextResponse.json({ error: err.code, message: err.message }, { status: err.status, headers: NO_STORE });
  }
  console.error(`[${where}] unexpected error:`, err);
  return NextResponse.json(
    { error: 'INTERNAL_ERROR', message: 'Something went wrong on the server. Please try again.' },
    { status: 500, headers: NO_STORE }
  );
}

/** URLSearchParams -> the plain record shape the filter parsers take. */
export function paramsRecord(url: string): Record<string, string> {
  return Object.fromEntries(new URL(url).searchParams.entries());
}
