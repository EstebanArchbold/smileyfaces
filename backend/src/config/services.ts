/**
 * The three services that get their own public page (/services/<slug>) and their
 * own gallery tag. The list is fixed in code rather than stored in the database:
 * each one has a hand-built page, so adding a row would create a slug with
 * nothing behind it. Only the copy shown on those pages is editable, from
 * Admin → Services.
 */
export const SERVICE_SLUGS = ['face-painting', 'body-art', 'glitter-tattoos'] as const;

export type ServiceSlug = typeof SERVICE_SLUGS[number];

/** Per-service pieces of copy the admin can edit, stored as settings rows. */
export const SERVICE_CONTENT_FIELDS = [
  'title',
  'subtitle',
  'cta',
  'badge',
  'gallery_title',
  'gallery_description',
] as const;

export function isServiceSlug(value: unknown): value is ServiceSlug {
  return typeof value === 'string' && (SERVICE_SLUGS as readonly string[]).includes(value);
}

/** e.g. ('face-painting', 'title') -> 'service_face_painting_title' */
export function serviceSettingKey(slug: string, field: string): string {
  return `service_${slug.replace(/-/g, '_')}_${field}`;
}

export const SERVICE_CONTENT_KEYS = SERVICE_SLUGS.flatMap(slug =>
  SERVICE_CONTENT_FIELDS.map(field => serviceSettingKey(slug, field))
);
