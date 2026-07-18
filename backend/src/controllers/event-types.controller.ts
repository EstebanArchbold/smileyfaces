import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../config/database';

function slugify(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export async function getEventTypes(_req: Request, res: Response): Promise<void> {
  const db = getDatabase();
  const result = await db.query('SELECT * FROM event_types ORDER BY display_order ASC, created_at ASC');
  res.json(result.rows);
}

export async function createEventType(req: Request, res: Response): Promise<void> {
  const db = getDatabase();
  const { label, icon } = req.body;

  if (!label || typeof label !== 'string' || !label.trim()) {
    res.status(400).json({ error: 'Label is required' });
    return;
  }

  const value = slugify(label);
  if (!value) {
    res.status(400).json({ error: 'Label must contain letters or numbers' });
    return;
  }

  const existing = await db.query('SELECT id FROM event_types WHERE value = $1', [value]);
  if (existing.rows.length > 0) {
    res.status(409).json({ error: 'An event type with that name already exists' });
    return;
  }

  const maxOrder = await db.query('SELECT MAX(display_order) as max_order FROM event_types');
  const displayOrder = (maxOrder.rows[0].max_order || 0) + 1;

  const result = await db.query(
    'INSERT INTO event_types (id, value, label, icon, display_order) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [uuidv4(), value, label.trim(), icon || 'palette', displayOrder]
  );

  res.status(201).json(result.rows[0]);
}

export async function updateEventType(req: Request, res: Response): Promise<void> {
  const db = getDatabase();
  const { id } = req.params;
  const { label, icon } = req.body;

  const existing = await db.query('SELECT * FROM event_types WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    res.status(404).json({ error: 'Event type not found' });
    return;
  }

  if (label !== undefined && (typeof label !== 'string' || !label.trim())) {
    res.status(400).json({ error: 'Label cannot be empty' });
    return;
  }

  const result = await db.query(
    'UPDATE event_types SET label = COALESCE($1, label), icon = COALESCE($2, icon) WHERE id = $3 RETURNING *',
    [label ? label.trim() : null, icon || null, id]
  );

  res.json(result.rows[0]);
}

export async function deleteEventType(req: Request, res: Response): Promise<void> {
  const db = getDatabase();
  const { id } = req.params;

  const result = await db.query('DELETE FROM event_types WHERE id = $1 RETURNING id', [id]);
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Event type not found' });
    return;
  }

  res.json({ message: 'Event type deleted' });
}
