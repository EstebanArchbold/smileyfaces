import { getCalendarClient, isConfigured } from '../config/google-calendar';
import { getDatabase } from '../config/database';
import { Booking } from '../types';

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
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: endDateTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        colorId: '11', // Tomato/pink color
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
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
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
