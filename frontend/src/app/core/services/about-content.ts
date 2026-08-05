/**
 * Every editable piece of the About page, with the wording the page shipped
 * with as the default. Shared by the public page and the admin editor so both
 * always agree on what "unedited" looks like — same idea as the service catalog.
 */
export interface AboutField {
  key: string;
  label: string;
  hint?: string;
  multiline?: boolean;
  default: string;
  /** Groups the fields into cards in the admin editor. */
  group: 'Header' | 'Story' | 'Values' | 'Call to Action';
}

export const ABOUT_FIELDS: AboutField[] = [
  { key: 'about_label', label: 'Small Label', default: 'Our Story', group: 'Header' },
  {
    key: 'about_title',
    label: 'Page Title',
    hint: 'One line per row.',
    multiline: true,
    default: 'Artistry That\nTells a Story',
    group: 'Header',
  },

  { key: 'about_story_title', label: 'Section Title', default: 'The Vision Behind Smiley Faces', group: 'Story' },
  {
    key: 'about_story_1',
    label: 'First Paragraph',
    multiline: true,
    default: "Born from a passion for transforming faces into living works of art, Smiley Faces is where editorial beauty meets celebration. We believe every face tells a story — and we're here to illustrate it with color, precision, and joy.",
    group: 'Story',
  },
  {
    key: 'about_story_2',
    label: 'Second Paragraph',
    multiline: true,
    default: "Our approach blends high-fashion face painting techniques with a deep understanding of each client's vision. Whether it's an intimate birthday celebration, a luxury brand launch, or an avant-garde editorial shoot, we bring the same level of artistry and dedication.",
    group: 'Story',
  },

  { key: 'about_value1_title', label: 'Card 1 Title', default: 'Curated Artistry', group: 'Values' },
  { key: 'about_value1_text', label: 'Card 1 Text', multiline: true, default: 'Every design is custom-crafted, never templated. Your face, your story, your masterpiece.', group: 'Values' },
  { key: 'about_value2_title', label: 'Card 2 Title', default: 'Premium Experience', group: 'Values' },
  { key: 'about_value2_text', label: 'Card 2 Text', multiline: true, default: 'From consultation to final reveal, every moment is designed to feel luxurious and personal.', group: 'Values' },
  { key: 'about_value3_title', label: 'Card 3 Title', default: 'Clean Products', group: 'Values' },
  { key: 'about_value3_text', label: 'Card 3 Text', multiline: true, default: 'We use only professional-grade, skin-safe products that are gentle on all skin types.', group: 'Values' },

  { key: 'about_cta_title', label: 'Title', default: 'Ready to Transform?', group: 'Call to Action' },
  { key: 'about_cta_text', label: 'Text', default: "Let's create something beautiful together.", group: 'Call to Action' },
  { key: 'about_cta_button', label: 'Button Text', default: 'Book Your Session', group: 'Call to Action' },
];

export const ABOUT_GROUPS: AboutField['group'][] = ['Header', 'Story', 'Values', 'Call to Action'];

/** The defaults as a plain lookup, for the public page's initial render. */
export function aboutDefaults(): Record<string, string> {
  const defaults: Record<string, string> = {};
  for (const field of ABOUT_FIELDS) {
    defaults[field.key] = field.default;
  }
  return defaults;
}
