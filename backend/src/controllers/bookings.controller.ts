import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../config/database';
import { createCalendarEvent } from '../services/calendar.service';
import { Booking } from '../types';

export async function createBooking(req: Request, res: Response): Promise<void> {
  const { client_name, client_email, client_phone, service_type, date, start_time, end_time, notes } = req.body;

  if (!client_name || !client_email || !service_type || !date || !start_time || !end_time) {
    res.status(400).json({ error: 'Missing required fields: client_name, client_email, service_type, date, start_time, end_time' });
    return;
  }

  const db = getDatabase();
  const id = uuidv4();

  const result = await db.query(
    `INSERT INTO bookings (id, client_name, client_email, client_phone, service_type, date, start_time, end_time, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [id, client_name, client_email, client_phone || null, service_type, date, start_time, end_time, notes || null]
  );

  res.status(201).json(result.rows[0]);
}

export async function getBookings(req: Request, res: Response): Promise<void> {
  const db = getDatabase();
  const { status, from, to, page = '1', limit = '20' } = req.query;

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
  query += ` ORDER BY date DESC, start_time DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
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

export async function updateBooking(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { status } = req.body;
  const db = getDatabase();

  const existing = await db.query('SELECT * FROM bookings WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    res.status(404).json({ error: 'Booking not found' });
    return;
  }

  const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
  if (status && !validStatuses.includes(status)) {
    res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    return;
  }

  if (status) {
    await db.query('UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);
  }

  // Create Google Calendar event when confirmed
  if (status === 'confirmed' && existing.rows[0].status !== 'confirmed') {
    const updatedResult = await db.query('SELECT * FROM bookings WHERE id = $1', [id]);
    const eventId = await createCalendarEvent(updatedResult.rows[0] as Booking);
    if (eventId) {
      await db.query('UPDATE bookings SET google_event_id = $1 WHERE id = $2', [eventId, id]);
    }
  }

  const updated = await db.query('SELECT * FROM bookings WHERE id = $1', [id]);
  res.json(updated.rows[0]);
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

  // Calculate total revenue
  const revenueRows = await db.query(
    "SELECT start_time, end_time FROM bookings WHERE status IN ('confirmed', 'completed')"
  );
  let totalRevenue = 0;
  for (const b of revenueRows.rows) {
    totalRevenue += calculateHours(b.start_time, b.end_time) * hourlyRate;
  }

  // Bookings by month
  const byMonthResult = await db.query(`
    SELECT TO_CHAR(date::date, 'YYYY-MM') as month, COUNT(*) as count
    FROM bookings WHERE status != 'cancelled'
    GROUP BY month ORDER BY month DESC LIMIT 12
  `);

  // Revenue by month
  const revenueDataResult = await db.query(`
    SELECT TO_CHAR(date::date, 'YYYY-MM') as month, start_time, end_time
    FROM bookings WHERE status IN ('confirmed', 'completed')
    ORDER BY month DESC
  `);

  const revenueMap = new Map<string, number>();
  for (const b of revenueDataResult.rows) {
    const hours = calculateHours(b.start_time, b.end_time);
    const current = revenueMap.get(b.month) || 0;
    revenueMap.set(b.month, current + hours * hourlyRate);
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

function calculateHours(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  return (endH + endM / 60) - (startH + startM / 60);
}
