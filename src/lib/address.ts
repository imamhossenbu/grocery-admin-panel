/**
 * "House 12, Road 5, Union, Upazila, District" — skips blanks and repeats.
 * Falls back to the older area/city fields for orders placed before the
 * structured Bangladesh address existed.
 */
export function formatAddress(a: {
  address?: string | null;
  landmark?: string | null;
  union?: string | null;
  upazila?: string | null;
  district?: string | null;
  division?: string | null;
  area?: string | null;
  city?: string | null;
  postcode?: string | null;
}): string {
  const structured = !!(a.district || a.upazila || a.union);
  const parts = structured
    ? [a.address, a.landmark ? `near ${a.landmark}` : null, a.union, a.upazila, a.district]
    : [a.address, a.area, a.city];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const v = (p ?? '').trim();
    if (!v || seen.has(v.toLowerCase())) continue;
    seen.add(v.toLowerCase());
    out.push(v);
  }
  let text = out.join(', ');
  if (a.postcode) text += ` ${a.postcode}`;
  return text;
}

/** Short locality for tables: Upazila, District (or Area, City), without repeats. */
export function formatLocality(a: { upazila?: string | null; district?: string | null; area?: string | null; city?: string | null }): string {
  if (a.district) {
    const up = (a.upazila ?? '').trim();
    return up && up.toLowerCase() !== a.district.toLowerCase() ? `${up}, ${a.district}` : a.district;
  }
  const area = (a.area ?? '').trim();
  const city = (a.city ?? '').trim();
  const other = area.match(/^other areas?(?: in| of)? (.+)$/i);
  if (other) return `${other[1]} (other area)`;
  if (!area) return city;
  if (!city || area.toLowerCase().includes(city.toLowerCase())) return area;
  return `${area}, ${city}`;
}
