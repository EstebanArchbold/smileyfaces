/**
 * Every editable piece of the Policies page, with the wording the page shipped
 * with as the default. Shared by the public page and the admin editor so both
 * always agree on what "unedited" looks like — same idea as the About page.
 */
export interface PolicyField {
  key: string;
  label: string;
  hint?: string;
  multiline?: boolean;
  /** Word ceiling for this field; defaults to POLICY_MAX_WORDS. Must match the
   *  per-key override in the backend's settings controller. */
  maxWords?: number;
  default: string;
  /** Groups the fields into cards in the admin editor. */
  group: 'Header' | 'Booking & Deposits' | 'Cancellations & Rescheduling' | 'Health & Safety' | 'Privacy' | 'Photography' | 'Contact Line' | 'Call to Action';
}

export const POLICY_MAX_WORDS = 50;

export const POLICY_FIELDS: PolicyField[] = [
  { key: 'policy_title', label: 'Page Title', default: 'Policies', group: 'Header' },

  { key: 'policy_block1_title', label: 'Section Title', default: 'Booking & Deposits', group: 'Booking & Deposits' },
  {
    key: 'policy_block1_text',
    label: 'Section Text',
    hint: 'Line breaks are kept, so you can write bullet points.',
    multiline: true,
    // Deposit terms carry the most detail of any section, so it gets more room.
    maxWords: 120,
    default: 'A deposit of 50% will be required to secure your date and time. Deposits go toward your final balance and confirm your reservation. Your booking is not considered confirmed until you receive a confirmation from us.',
    group: 'Booking & Deposits',
  },

  { key: 'policy_block2_title', label: 'Section Title', default: 'Cancellations & Rescheduling', group: 'Cancellations & Rescheduling' },
  {
    key: 'policy_block2_text',
    label: 'Section Text',
    hint: 'Line breaks are kept, so you can write bullet points.',
    multiline: true,
    default: 'Life happens. If you need to reschedule or cancel, please reach out as early as possible. Deposits may be transferable to a new date within a reasonable window, subject to availability. Cancellations made 14 or fewer days before the event may result in forfeiture of the deposit.',
    group: 'Cancellations & Rescheduling',
  },

  { key: 'policy_block3_title', label: 'Section Title', default: 'Health & Safety', group: 'Health & Safety' },
  {
    key: 'policy_block3_text',
    label: 'Section Text',
    hint: 'Line breaks are kept, so you can write bullet points.',
    multiline: true,
    default: 'We use only professional-grade, skin-safe products. To protect everyone, we cannot paint over broken skin, active rashes, cold sores, or eye infections. If you have known allergies or sensitive skin, let us know in advance so we can plan accordingly. A patch test is available on request.',
    group: 'Health & Safety',
  },

  { key: 'policy_block4_title', label: 'Section Title', default: 'Privacy', group: 'Privacy' },
  {
    key: 'policy_block4_text',
    label: 'Section Text',
    hint: 'Line breaks are kept, so you can write bullet points.',
    multiline: true,
    default: 'Any information you share when booking — such as your name, contact details, and event details — is used solely to coordinate and deliver your service. We never sell or share your information with third parties for marketing.',
    group: 'Privacy',
  },

  { key: 'policy_block5_title', label: 'Section Title', default: 'Photography', group: 'Photography' },
  {
    key: 'policy_block5_text',
    label: 'Section Text',
    hint: 'Line breaks are kept, so you can write bullet points.',
    multiline: true,
    default: "We love sharing our work. From time to time we may photograph completed designs for our portfolio and social media. If you'd prefer your photos not be shared publicly, just let us know and we'll keep them private.",
    group: 'Photography',
  },

  { key: 'policy_contact_before', label: 'Before the Link', default: 'Questions about any of this?', group: 'Contact Line' },
  { key: 'policy_contact_link', label: 'Link Text', hint: 'Opens the email app.', default: 'Get in touch', group: 'Contact Line' },
  { key: 'policy_contact_after', label: 'After the Link', default: "— we're happy to help.", group: 'Contact Line' },

  { key: 'policy_cta_title', label: 'Title', default: 'Ready to Book?', group: 'Call to Action' },
  { key: 'policy_cta_text', label: 'Text', default: "Let's create something beautiful together.", group: 'Call to Action' },
  { key: 'policy_cta_button', label: 'Button Text', default: 'Book Your Session', group: 'Call to Action' },
];

export const POLICY_GROUPS: PolicyField['group'][] = [
  'Header',
  'Booking & Deposits',
  'Cancellations & Rescheduling',
  'Health & Safety',
  'Privacy',
  'Photography',
  'Contact Line',
  'Call to Action',
];

/** The defaults as a plain lookup, for the public page's initial render. */
export function policyDefaults(): Record<string, string> {
  const defaults: Record<string, string> = {};
  for (const field of POLICY_FIELDS) {
    defaults[field.key] = field.default;
  }
  return defaults;
}
