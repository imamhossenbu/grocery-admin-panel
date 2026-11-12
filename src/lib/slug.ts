/**
 * Turns a product name into a URL slug: lowercase a-z, 0-9 and hyphens only.
 * Product ids are slugs because the storefront serves `/product/<id>`.
 * Returns '' when the name has no latin letters or digits at all.
 */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}
