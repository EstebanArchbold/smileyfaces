import { getCalendarClient, isConfigured } from '../config/google-calendar';
import { getDatabase } from '../config/database';
import { Booking } from '../types';

// Bookings store wall-clock times ("17:00") with no offset, so Google needs to be
// told which zone they belong to. This must be the business's zone, never the
// server's: the API container runs in UTC, which shifted every event by hours.
const BUSINESS_TIMEZONE = process.env.BUSINESS_TIMEZONE || 'America/Toronto';

async function getServiceLabel(serviceType: string): Promise<string> {
  try {
    const result = await getDatabase().query('SELECT label FROM event_types WHERE value = $1', [serviceType]);
    return result.rows[0]?.label || 'Session';
  } catch {
    return 'Session';
  }
}

export async function createCalendarEvent(booking: Booking): Promise<string | null> {
  if (!isConfigured()) {
    console.log('[Google Calendar] Not configured — skipping event creation.');
    return null;
  }

  const calendar = getCalendarClient();
  if (!calendar) return null;

  try {
    const serviceLabel = await getServiceLabel(booking.service_type);
    const startDateTime = `${booking.date}T${booking.start_time}:00`;
    const endDateTime = `${booking.date}T${booking.end_time}:00`;

    const event = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      requestBody: {
        summary: `Smiley Faces - ${serviceLabel} - ${booking.client_name}`,
        description: `Client: ${booking.client_name}\nEmail: ${booking.client_email}\nPhone: ${booking.client_phone || 'N/A'}\nAddress: ${booking.address || 'N/A'}\nService: ${serviceLabel}\nNotes: ${booking.notes || 'None'}`,
        location: booking.address || undefined,
        start: {
          dateTime: startDateTime,
          timeZone: BUSINESS_TIMEZONE,
        },
        end: {
          dateTime: endDateTime,
          timeZone: BUSINESS_TIMEZONE,
        },
        colorId: '10', // Basil color
      },
    });

    console.log(`[Google Calendar] Event created: ${event.data.id}`);
    return event.data.id || null;
  } catch (error) {
    console.error('[Google Calendar] Failed to create event:', error);
    return null;
  }
}

export async function updateCalendarEvent(booking: Booking): Promise<boolean> {
  if (!isConfigured() || !booking.google_event_id) return false;

  const calendar = getCalendarClient();
  if (!calendar) return false;

  try {
    const timeZone = BUSINESS_TIMEZONE;
    await calendar.events.patch({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      eventId: booking.google_event_id,
      requestBody: {
        start: { dateTime: `${booking.date}T${booking.start_time}:00`, timeZone },
        end: { dateTime: `${booking.date}T${booking.end_time}:00`, timeZone },
        location: booking.address || undefined,
      },
    });
    console.log(`[Google Calendar] Event updated: ${booking.google_event_id}`);
    return true;
  } catch (error) {
    console.error('[Google Calendar] Failed to update event:', error);
    return false;
  }
}
