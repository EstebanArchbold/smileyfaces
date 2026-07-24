import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../config/database';

export async function getTestimonials(_req: Request, res: Response): Promise<void> {
  const db = getDatabase();
  const result = await db.query('SELECT * FROM testimonials ORDER BY display_order ASC, created_at ASC');
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

  const result = await db.query(
    'INSERT INTO testimonials (id, author, quote, display_order) VALUES ($1, $2, $3, $4) RETURNING *',
    [uuidv4(), author.trim(), quote.trim(), displayOrder]
  );

  res.status(201).json(result.rows[0]);
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

export async function deleteTestimonial(req: Request, res: Response): Promise<void> {
  const db = getDatabase();
  const { id } = req.params;

  const result = await db.query('DELETE FROM testimonials WHERE id = $1 RETURNING id', [id]);
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Testimonial not found' });
    return;
  }

  res.json({ message: 'Testimonial deleted' });
}
