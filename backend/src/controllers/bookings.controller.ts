import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../config/database';
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '../services/calendar.service';
import { notifyAdmin } from '../services/notification.service';
import { Booking } from '../types';

// Minimum gap between appointments (traveling time, setup, etc.)
const GAP_MINUTES = 45;

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

async function getConfirmedIntervals(date: string, excludeId?: string): Promise<{ start: number; end: number }[]> {
  const db = getDatabase();
  const params: unknown[] = [date];
  let query = "SELECT id, start_time, end_time FROM bookings WHERE date = $1 AND status = 'confirmed'";
  if (excludeId) {
    query += ' AND id != $2';
    params.push(excludeId);
  }
  const result = await db.query(query, params);
  return result.rows.map(r => ({ start: toMinutes(r.start_time), end: toMinutes(r.end_time) }));
}

function hasConflict(start: number, end: number, intervals: { start: number; end: number }[]): boolean {
  return intervals.some(i => start < i.end + GAP_MINUTES && end > i.start - GAP_MINUTES);
}

export async function createBooking(req: Request, res: Response): Promise<void> {
  const { client_name, client_email, client_phone, address, service_type, date, start_time, end_time, notes, num_kids, duration } = req.body;

  if (!client_name || !client_email || !service_type || !date || !start_time || !end_time) {
    res.status(400).json({ error: 'Missing required fields: client_name, client_email, service_type, date, start_time, end_time' });
    return;
  }

  const db = getDatabase();
  const id = uuidv4();

  const confirmed = await getConfirmedIntervals(date);
  if (hasConflict(toMinutes(start_time), toMinutes(end_time), confirmed)) {
    res.status(409).json({ error: 'That time slot is no longer available. Please pick another one.' });
    return;
  }

  const result = await db.query(
    `INSERT INTO bookings (id, client_name, client_email, client_phone, address, service_type, date, start_time, end_time, notes, num_kids, duration)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
    [id, client_name, client_email, client_phone || null, address || null, service_type, date, start_time, end_time, notes || null, num_kids || null, duration || null]
  );

  notifyAdmin(result.rows[0] as Booking, 'new_booking');

  res.status(201).json(result.rows[0]);
}

// Public: clients the admin already talked to fill the confirmation form with no
// prior booking — the entry is created directly as confirmed.
export async function createConfirmedBooking(req: Request, res: Response): Promise<void> {
  const {
    client_name, client_email, client_phone, service_type, date, start_time, hours,
    address, theme, bday_kid_name, kids_age_range, allergies, comments, num_kids,
  } = req.body;

  if (!client_name || !client_email || !service_type || !date || !start_time || !hours || !address) {
    res.status(400).json({ error: 'Missing required fields: client_name, client_email, service_type, date, start_time, hours, address' });
    return;
  }

  const numHours = Number(hours);
  if (isNaN(numHours) || numHours < 1 || numHours > 12) {
    res.status(400).json({ error: 'hours must be a number between 1 and 12' });
    return;
  }

  const startMin = toMinutes(start_time);
  const endMin = startMin + numHours * 60;
  if (endMin > 24 * 60) {
    res.status(400).json({ error: 'The event cannot end past midnight' });
    return;
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  const end_time = `${pad(Math.floor(endMin / 60))}:${pad(endMin % 60)}`;

  const confirmedIntervals = await getConfirmedIntervals(date);
  if (hasConflict(startMin, endMin, confirmedIntervals)) {
    res.status(409).json({ error: `That time conflicts with another confirmed booking (${GAP_MINUTES} min gap required). Please contact us to pick another time.` });
    return;
  }

  const db = getDatabase();
  const id = uuidv4();

  const result = await db.query(
    `INSERT INTO bookings (id, client_name, client_email, client_phone, address, service_type, date, start_time, end_time,
       num_kids, theme, bday_kid_name, kids_age_range, allergies, comments, arrival_time, hours_booked,
       status, confirmation_submitted_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'confirmed', NOW()) RETURNING *`,
    [
      id, client_name, client_email, client_phone || null, address.trim(), service_type, date, start_time, end_time,
      num_kids || null, theme || null, bday_kid_name || null, kids_age_range || null, allergies || null, comments || null,
      start_time, `${numHours} hour${numHours > 1 ? 's' : ''}`,
    ]
  );

  const booking = result.rows[0] as Booking;
  const eventId = await createCalendarEvent(booking);
  if (eventId) {
    await db.query('UPDATE bookings SET google_event_id = $1 WHERE id = $2', [eventId, id]);
  }

  notifyAdmin(booking, 'confirmation_submitted');

  res.status(201).json(booking);
}

// Public endpoint: the client fills the confirmation form via a link the admin
// shares manually. The booking UUID acts as the access token.
export async function submitConfirmation(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { address, theme, bday_kid_name, kids_age_range, allergies, comments, num_kids, arrival_time, hours_booked } = req.body;
  const db = getDatabase();

  const existing = await db.query('SELECT * FROM bookings WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    res.status(404).json({ error: 'Booking not found' });
    return;
  }

  if (!address || typeof address !== 'string' || !address.trim()) {
    res.status(400).json({ error: 'Exact event address is required' });
    return;
  }

  const result = await db.query(
    `UPDATE bookings SET
       address = $1,
       theme = $2,
       bday_kid_name = $3,
       kids_age_range = $4,
       allergies = $5,
       comments = $6,
       num_kids = COALESCE($7, num_kids),
       arrival_time = $8,
       hours_booked = $9,
       confirmation_submitted_at = NOW(),
       updated_at = NOW()
     WHERE id = $10 RETURNING *`,
    [
      address.trim(),
      theme || null,
      bday_kid_name || null,
      kids_age_range || null,
      allergies || null,
      comments || null,
      num_kids || null,
      arrival_time || null,
      hours_booked || null,
      id,
    ]
  );

  notifyAdmin(result.rows[0] as Booking, 'confirmation_submitted');

  res.json(result.rows[0]);
}

export async function getBookings(req: Request, res: Response): Promise<void> {
  const db = getDatabase();
  const { status, from, to, page = '1', limit = '20', sort = 'created_desc' } = req.query;

  let query = 'SELECT * FROM bookings WHERE 1=1';
  let countQuery = 'SELECT COUNT(*) as total FROM bookings WHERE 1=1';
  const params: unknown[] = [];
  let paramIdx = 1;

  if (status) {
    const clause = ` AND status = $${paramIdx++}`;
    query += clause;
    countQuery += clause;
    params.push(status);
  }
  if (from) {
    const clause = ` AND date >= $${paramIdx++}`;
    query += clause;
    countQuery += clause;
    params.push(from);
  }
  if (to) {
    const clause = ` AND date <= $${paramIdx++}`;
    query += clause;
    countQuery += clause;
    params.push(to);
  }

  const countResult = await db.query(countQuery, params);
  const total = Number(countResult.rows[0].total);

  const offset = (Number(page) - 1) * Number(limit);
  // Whitelisted: the ORDER BY is interpolated into SQL, so it can never come
  // straight from the query string.
  // created_* sorts by when the client sent the request, date_* by the event day.
  const orderClauses: Record<string, string> = {
    created_desc: 'created_at DESC',
    created_asc: 'created_at ASC',
    date_desc: 'date DESC, start_time DESC',
    date_asc: 'date ASC, start_time ASC',
  };
  const orderBy = orderClauses[String(sort)] || orderClauses['created_desc'];
  query += ` ORDER BY ${orderBy} LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
  const queryParams = [...params, Number(limit), offset];

  const result = await db.query(query, queryParams);

  res.json({
    bookings: result.rows,
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / Number(limit)),
  });
}

// Public: blocked time ranges (in minutes since midnight) for a given date.
// Confirmed bookings lock their slot plus a travel gap on each side.
export async function getAvailability(req: Request, res: Response): Promise<void> {
  const { date } = req.query;
  if (!date || typeof date !== 'string') {
    res.status(400).json({ error: 'date query param is required (YYYY-MM-DD)' });
    return;
  }

  const confirmed = await getConfirmedIntervals(date);
  const blocked = confirmed.map(i => ({
    start: Math.max(0, i.start - GAP_MINUTES),
    end: Math.min(24 * 60, i.end + GAP_MINUTES),
  }));

  res.json({ blocked, gap_minutes: GAP_MINUTES });
}

export async function updateBooking(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { status, date, start_time, end_time } = req.body;
  const db = getDatabase();

  const existing = await db.query('SELECT * FROM bookings WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    res.status(404).json({ error: 'Booking not found' });
    return;
  }
  const current = existing.rows[0] as Booking;

  const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
  if (status && !validStatuses.includes(status)) {
    res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    return;
  }

  const timeChanged = date !== undefined || start_time !== undefined || end_time !== undefined;
  if (timeChanged) {
    const newDate = date || current.date;
    const newStart = start_time || current.start_time;
    const newEnd = end_time || current.end_time;

    if (toMinutes(newEnd) <= toMinutes(newStart)) {
      res.status(400).json({ error: 'End time must be after start time' });
      return;
    }

    const confirmed = await getConfirmedIntervals(newDate, String(id));
    if (hasConflict(toMinutes(newStart), toMinutes(newEnd), confirmed)) {
      res.status(409).json({ error: `That time conflicts with another confirmed booking (${GAP_MINUTES} min gap required).` });
      return;
    }

    await db.query(
      'UPDATE bookings SET date = $1, start_time = $2, end_time = $3, updated_at = NOW() WHERE id = $4',
      [newDate, newStart, newEnd, id]
    );
  }

  if (status) {
    await db.query('UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);
  }

  const afterUpdate = await db.query('SELECT * FROM bookings WHERE id = $1', [id]);
  const booking = afterUpdate.rows[0] as Booking;

  // Google Calendar sync: create on confirm, remove on cancel, patch when a
  // synced booking is rescheduled
  if (status === 'cancelled' && current.status !== 'cancelled' && booking.google_event_id) {
    const removed = await deleteCalendarEvent(booking.google_event_id);
    if (removed) {
      await db.query('UPDATE bookings SET google_event_id = NULL WHERE id = $1', [id]);
    }
  } else if (status === 'confirmed' && current.status !== 'confirmed') {
    const eventId = await createCalendarEvent(booking);
    if (eventId) {
      await db.query('UPDATE bookings SET google_event_id = $1 WHERE id = $2', [eventId, id]);
    }
  } else if (timeChanged && booking.google_event_id) {
    await updateCalendarEvent(booking);
  }

  const updated = await db.query('SELECT * FROM bookings WHERE id = $1', [id]);
  res.json(updated.rows[0]);
}

/**
 * Admin-only money and notes on a booking: a discount, any extra charges
 * (gas, parking, ...) and private notes about the client. Kept off updateBooking
 * because none of it touches the schedule or the calendar sync.
 */
export async function updateBookingBilling(req: Request, res: Response): Promise<void> {
  const db = getDatabase();
  const { id } = req.params;
  const { discount, discount_note, extra_charges, admin_notes } = req.body;

  const existing = await db.query('SELECT id FROM bookings WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    res.status(404).json({ error: 'Booking not found' });
    return;
  }

  let discountValue: number | undefined;
  if (discount !== undefined) {
    discountValue = Number(discount);
    if (isNaN(discountValue) || discountValue < 0) {
      res.status(400).json({ error: 'Discount must be a number of 0 or more' });
      return;
    }
  }

  let charges: { label: string; amount: number }[] | undefined;
  if (extra_charges !== undefined) {
    if (!Array.isArray(extra_charges)) {
      res.status(400).json({ error: 'extra_charges must be an array' });
      return;
    }
    charges = [];
    for (const charge of extra_charges) {
      const label = typeof charge?.label === 'string' ? charge.label.trim() : '';
      const amount = Number(charge?.amount);
      // A half-filled row is what an empty "add charge" line looks like, so it
      // is dropped rather than rejected.
      if (!label && !charge?.amount) continue;
      if (!label) {
        res.status(400).json({ error: 'Every extra charge needs a label' });
        return;
      }
      if (isNaN(amount) || amount < 0) {
        res.status(400).json({ error: `Invalid amount for "${label}"` });
        return;
      }
      charges.push({ label, amount });
    }
  }

  const result = await db.query(
    `UPDATE bookings SET
       discount = COALESCE($1, discount),
       discount_note = CASE WHEN $2::boolean THEN $3 ELSE discount_note END,
       extra_charges = COALESCE($4::jsonb, extra_charges),
       admin_notes = CASE WHEN $5::boolean THEN $6 ELSE admin_notes END,
       updated_at = NOW()
     WHERE id = $7 RETURNING *`,
    [
      discountValue ?? null,
      discount_note !== undefined,
      typeof discount_note === 'string' && discount_note.trim() ? discount_note.trim() : null,
      charges ? JSON.stringify(charges) : null,
      admin_notes !== undefined,
      typeof admin_notes === 'string' && admin_notes.trim() ? admin_notes.trim() : null,
      id,
    ]
  );

  res.json(result.rows[0]);
}

export async function getBookingStats(_req: Request, res: Response): Promise<void> {
  const db = getDatabase();

  const rateResult = await db.query("SELECT value FROM settings WHERE key = 'hourly_rate'");
  const hourlyRate = Number(rateResult.rows[0]?.value || '80');

  const totalResult = await db.query("SELECT COUNT(*) as count FROM bookings WHERE status != 'cancelled'");
  const totalBookings = Number(totalResult.rows[0].count);

  const today = new Date().toISOString().split('T')[0];
  const upcomingResult = await db.query(
    "SELECT COUNT(*) as count FROM bookings WHERE date >= $1 AND status IN ('pending', 'confirmed')",
    [today]
  );
  const upcomingBookings = Number(upcomingResult.rows[0].count);

  // Revenue only counts work already delivered, so 'completed' bookings only
  const revenueRows = await db.query(
    "SELECT start_time, end_time, discount, extra_charges FROM bookings WHERE status = 'completed'"
  );
  let totalRevenue = 0;
  for (const b of revenueRows.rows) {
    totalRevenue += bookingTotal(b, hourlyRate);
  }

  // Bookings by month
  const byMonthResult = await db.query(`
    SELECT TO_CHAR(date::date, 'YYYY-MM') as month, COUNT(*) as count
    FROM bookings WHERE status != 'cancelled'
    GROUP BY month ORDER BY month DESC LIMIT 12
  `);

  // Revenue by month
  const revenueDataResult = await db.query(`
    SELECT TO_CHAR(date::date, 'YYYY-MM') as month, start_time, end_time, discount, extra_charges
    FROM bookings WHERE status = 'completed'
    ORDER BY month DESC
  `);

  const revenueMap = new Map<string, number>();
  for (const b of revenueDataResult.rows) {
    const current = revenueMap.get(b.month) || 0;
    revenueMap.set(b.month, current + bookingTotal(b, hourlyRate));
  }

  const revenueByMonth = Array.from(revenueMap.entries())
    .map(([month, revenue]) => ({ month, revenue: Math.round(revenue * 100) / 100 }))
    .slice(0, 12);

  res.json({
    totalBookings,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    upcomingBookings,
    hourlyRate,
    bookingsByMonth: byMonthResult.rows.map(r => ({ month: r.month, count: Number(r.count) })).reverse(),
    revenueByMonth: revenueByMonth.reverse(),
  });
}

/**
 * What the booking is actually worth: the hours at the hourly rate, plus any
 * extra charges the admin added, minus the discount. Floored at zero so a
 * discount larger than the job can't subtract from the month's total.
 */
function bookingTotal(
  booking: { start_time: string; end_time: string; discount?: string | number | null; extra_charges?: { amount: number }[] | null },
  hourlyRate: number
): number {
  const base = calculateHours(booking.start_time, booking.end_time) * hourlyRate;
  const extras = (booking.extra_charges || []).reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  // pg returns NUMERIC as a string, so this always goes through Number().
  const discount = Number(booking.discount) || 0;
  return Math.max(0, base + extras - discount);
}

function calculateHours(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  return (endH + endM / 60) - (startH + startM / 60);
}
