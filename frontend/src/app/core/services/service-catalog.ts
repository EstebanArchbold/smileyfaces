/**
 * The three services with their own page (/services/<slug>), their own gallery
 * tag, and their own editable copy (Admin → Services).
 *
 * Kept in code, not in the database: each slug is a real route, so this list and
 * the backend's SERVICE_SLUGS have to agree. The `defaults` are what the page
 * shows until the admin saves something of their own — same idea as the hero
 * fields in Settings, so the editor never starts from an empty box.
 */
export interface ServiceDef {
  slug: string;
  label: string;
  icon: string;
  defaults: {
    title: string;
    subtitle: string;
    cta: string;
    badge: string;
    gallery_title: string;
    gallery_description: string;
  };
}

export const SERVICES: ServiceDef[] = [
  {
    slug: 'face-painting',
    label: 'Face Painting',
    icon: 'face_retouching_natural',
    defaults: {
      // Like the hero, one line per row — the second line is shown in green.
      title: 'Face\nPainting',
      subtitle: 'From a delicate accent to a full-face transformation, painted with skin-safe colors that last the whole celebration.',
      cta: 'Book Face Painting',
      badge: 'Skin-safe, professional-grade paints',
      gallery_title: 'Face Painting Gallery',
      gallery_description: 'A look at some of our favorite faces.',
    },
  },
  {
    slug: 'body-art',
    label: 'Body Art',
    icon: 'brush',
    defaults: {
      title: 'Body\nArt',
      subtitle: 'Arms, hands and shoulders turned into canvases — bold statement pieces for festivals, photo shoots and parties.',
      cta: 'Book Body Art',
      badge: 'Custom designs for any occasion',
      gallery_title: 'Body Art Gallery',
      gallery_description: 'Designs that go far beyond the face.',
    },
  },
  {
    slug: 'glitter-tattoos',
    label: 'Glitter Tattoos',
    icon: 'auto_awesome',
    defaults: {
      title: 'Glitter\nTattoos',
      subtitle: 'Sparkling, water-resistant designs that go on in seconds and stay bright for days. A favorite with kids and grown-ups alike.',
      cta: 'Book Glitter Tattoos',
      badge: 'Water-resistant and long-lasting',
      gallery_title: 'Glitter Tattoos Gallery',
      gallery_description: 'Shimmer that lasts long after the party.',
    },
  },
];

export type ServiceContentField = keyof ServiceDef['defaults'];

export function findService(slug: string | null): ServiceDef | undefined {
  return SERVICES.find(s => s.slug === slug);
}

/** e.g. ('face-painting', 'title') -> 'service_face_painting_title' */
export function serviceSettingKey(slug: string, field: string): string {
  return `service_${slug.replace(/-/g, '_')}_${field}`;
}
