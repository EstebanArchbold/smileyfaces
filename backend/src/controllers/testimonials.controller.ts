import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { getDatabase } from '../config/database';
import { notifyNewReview } from '../services/notification.service';

export const TESTIMONIAL_STATUSES = ['pending', 'approved', 'archived'] as const;

// Public: only what the admin approved ever reaches the landing page.
export async function getTestimonials(_req: Request, res: Response): Promise<void> {
  const db = getDatabase();
  const result = await db.query(
    "SELECT * FROM testimonials WHERE status = 'approved' ORDER BY display_order ASC, created_at ASC"
  );
  res.json(result.rows);
}

// Admin: every review regardless of status, newest submissions first so the
// ones waiting for approval are at the top of the list.
export async function getAllTestimonials(req: Request, res: Response): Promise<void> {
  const db = getDatabase();
  const { status } = req.query;

  let query = 'SELECT * FROM testimonials';
  const params: unknown[] = [];
  if (status && TESTIMONIAL_STATUSES.includes(String(status) as typeof TESTIMONIAL_STATUSES[number])) {
    query += ' WHERE status = $1';
    params.push(status);
  }
  query += ' ORDER BY COALESCE(submitted_at, created_at) DESC, display_order ASC';

  const result = await db.query(query, params);
  res.json(result.rows);
}

export async function createTestimonial(req: Request, res: Response): Promise<void> {
  const db = getDatabase();
  const { author, quote } = req.body;

  if (!quote || typeof quote !== 'string' || !quote.trim()) {
    res.status(400).json({ error: 'Testimonial text is required' });
    return;
  }
  if (!author || typeof author !== 'string' || !author.trim()) {
    res.status(400).json({ error: 'Author is required' });
    return;
  }

  const maxOrder = await db.query('SELECT MAX(display_order) as max_order FROM testimonials');
  const displayOrder = (maxOrder.rows[0].max_order || 0) + 1;

  // Written by the admin, so it goes live right away.
  const result = await db.query(
    "INSERT INTO testimonials (id, author, quote, display_order, status) VALUES ($1, $2, $3, $4, 'approved') RETURNING *",
    [uuidv4(), author.trim(), quote.trim(), displayOrder]
  );

  res.status(201).json(result.rows[0]);
}

/**
 * Public endpoint behind the "leave a review" link the admin generates. Like the
 * confirmation form, the booking UUID in the URL is the only token — it just
 * links the review back to the event, it is not required to submit.
 *
 * Reviews always land as 'pending': nothing a stranger types shows up on the
 * landing page until the admin approves it.
 */
export async function submitTestimonial(req: Request, res: Response): Promise<void> {
  const db = getDatabase();
  const { author, quote, booking_id, client_email } = req.body;
  const files = Array.isArray(req.files) ? req.files : [];

  // Photos that came with a rejected submission are dropped, but never at the
  // cost of the validation response the client is waiting for.
  const cleanup = () => files.forEach(f => {
    try {
      if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
    } catch (err) {
      console.error('Could not remove rejected review image:', f.path, err);
    }
  });

  if (!author || typeof author !== 'string' || !author.trim()) {
    cleanup();
    res.status(400).json({ error: 'Your name is required' });
    return;
  }
  if (!quote || typeof quote !== 'string' || !quote.trim()) {
    cleanup();
    res.status(400).json({ error: 'Please write a few words about your experience' });
    return;
  }

  let bookingId: string | null = null;
  if (booking_id && typeof booking_id === 'string') {
    const booking = await db.query('SELECT id FROM bookings WHERE id = $1', [booking_id]);
    // An unknown id just means the link was edited or the booking was removed —
    // the review is still worth keeping, only without the link back.
    bookingId = booking.rows.length > 0 ? booking_id : null;
  }

  const images = files.map(f => `/uploads/${f.filename}`);

  const maxOrder = await db.query('SELECT MAX(display_order) as max_order FROM testimonials');
  const displayOrder = (maxOrder.rows[0].max_order || 0) + 1;

  const result = await db.query(
    `INSERT INTO testimonials (id, author, quote, display_order, status, images, booking_id, client_email, submitted_at)
     VALUES ($1, $2, $3, $4, 'pending', $5::jsonb, $6, $7, NOW()) RETURNING *`,
    [
      uuidv4(),
      author.trim(),
      quote.trim(),
      displayOrder,
      JSON.stringify(images),
      bookingId,
      typeof client_email === 'string' && client_email.trim() ? client_email.trim() : null,
    ]
  );

  notifyNewReview(result.rows[0].author, result.rows[0].quote, images.length);

  res.status(201).json({ message: 'Review received', id: result.rows[0].id });
}

export async function updateTestimonial(req: Request, res: Response): Promise<void> {
  const db = getDatabase();
  const { id } = req.params;
  const { author, quote } = req.body;

  const existing = await db.query('SELECT * FROM testimonials WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    res.status(404).json({ error: 'Testimonial not found' });
    return;
  }

  if (author !== undefined && (typeof author !== 'string' || !author.trim())) {
    res.status(400).json({ error: 'Author cannot be empty' });
    return;
  }
  if (quote !== undefined && (typeof quote !== 'string' || !quote.trim())) {
    res.status(400).json({ error: 'Testimonial text cannot be empty' });
    return;
  }

  const result = await db.query(
    'UPDATE testimonials SET author = COALESCE($1, author), quote = COALESCE($2, quote) WHERE id = $3 RETURNING *',
    [author ? author.trim() : null, quote ? quote.trim() : null, id]
  );

  res.json(result.rows[0]);
}

// Approve (show on the landing page), send back to pending, or archive (hide it
// without losing it — archiving is the alternative to deleting).
export async function updateTestimonialStatus(req: Request, res: Response): Promise<void> {
  const db = getDatabase();
  const { id } = req.params;
  const { status } = req.body;

  if (!TESTIMONIAL_STATUSES.includes(status)) {
    res.status(400).json({ error: `Invalid status. Must be one of: ${TESTIMONIAL_STATUSES.join(', ')}` });
    return;
  }

  const result = await db.query(
    'UPDATE testimonials SET status = $1 WHERE id = $2 RETURNING *',
    [status, id]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Testimonial not found' });
    return;
  }

  res.json(result.rows[0]);
}

export async function deleteTestimonial(req: Request, res: Response): Promise<void> {
  const db = getDatabase();
  const { id } = req.params;

  const result = await db.query('DELETE FROM testimonials WHERE id = $1 RETURNING *', [id]);
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Testimonial not found' });
    return;
  }

  // Photos the client uploaded go with it, so uploads/ doesn't pile up. A file
  // that refuses to be removed only leaves an orphan behind — the review is
  // already gone, so it must not turn into a failed request.
  for (const image of (result.rows[0].images || []) as string[]) {
    const filePath = path.join(__dirname, '../../', image);
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (err) {
      console.error('Could not remove review image:', filePath, err);
    }
  }

  res.json({ message: 'Testimonial deleted' });
}
