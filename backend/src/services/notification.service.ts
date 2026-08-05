import { Booking } from '../types';
import { sendPush } from './push.service';
import { sendEmail } from './email.service';

type NotificationKind = 'new_booking' | 'confirmation_submitted';

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m || 0).padStart(2, '0')} ${period}`;
}

function buildBody(booking: Booking): string {
  return `${booking.client_name} — ${booking.date}, ${formatTime(booking.start_time)} to ${formatTime(booking.end_time)}`;
}

function buildEmailBody(booking: Booking, kind: NotificationKind): string {
  const lines = [
    kind === 'new_booking' ? 'A new booking request came in.' : 'A client submitted their confirmation form.',
    '',
    `Client:  ${booking.client_name}`,
    `Email:   ${booking.client_email}`,
    `Phone:   ${booking.client_phone || 'N/A'}`,
    `Date:    ${booking.date}`,
    `Time:    ${formatTime(booking.start_time)} — ${formatTime(booking.end_time)}`,
    `Service: ${booking.service_type}`,
    `Address: ${booking.address || 'N/A'}`,
    `Kids:    ${booking.num_kids || 'N/A'}`,
    `Status:  ${booking.status}`,
  ];

  if (booking.notes) lines.push(`Notes:   ${booking.notes}`);
  if (booking.comments) lines.push(`Comments: ${booking.comments}`);
  if (booking.allergies) lines.push(`Allergies: ${booking.allergies}`);

  return lines.join('\n');
}

// Fire-and-forget: notifying the admin must never delay or fail the client's
// request, so callers don't await this and every channel swallows its errors.
export function notifyAdmin(booking: Booking, kind: NotificationKind): void {
  const title = kind === 'new_booking' ? 'New booking request' : 'Confirmation form submitted';
  const subject = `[Smiley Faces] ${title}: ${booking.client_name}`;

  void sendPush(title, buildBody(booking)).catch(err =>
    console.error('[Notify] Push failed:', err)
  );
  void sendEmail(subject, buildEmailBody(booking, kind)).catch(err =>
    console.error('[Notify] Email failed:', err)
  );
}

/**
 * A client submitted a review through the "leave a review" link. It sits in
 * pending until the admin approves it, so this is the only thing that tells
 * them there is something to look at.
 */
export function notifyNewReview(author: string, quote: string, imageCount: number): void {
  const title = 'New review awaiting approval';
  const photos = imageCount === 1 ? '1 photo' : `${imageCount} photos`;
  const body = `${author} left a review${imageCount > 0 ? ` (${photos})` : ''}`;

  const emailBody = [
    'A client submitted a review. It is pending approval and is not visible on the site yet.',
    '',
    `From:   ${author}`,
    `Photos: ${imageCount}`,
    '',
    'Review:',
    quote,
    '',
    'Approve or archive it from Admin → Settings → Testimonials.',
  ].join('\n');

  void sendPush(title, body).catch(err => console.error('[Notify] Push failed:', err));
  void sendEmail(`[Smiley Faces] ${title}: ${author}`, emailBody).catch(err =>
    console.error('[Notify] Email failed:', err)
  );
}
