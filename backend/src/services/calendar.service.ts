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
        description: `Client: ${booking.client_name}\nEmail: ${booking.client_email}\nPhone: ${booking.client_phone || 'N/A'}\nService: ${serviceLabel}\nNotes: ${booking.notes || 'None'}`,
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
