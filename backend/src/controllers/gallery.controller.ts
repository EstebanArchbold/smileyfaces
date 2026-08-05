import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { getDatabase } from '../config/database';
import { isServiceSlug } from '../config/services';

export async function getGalleryItems(req: Request, res: Response): Promise<void> {
  const db = getDatabase();
  const { category, service } = req.query;

  let query = 'SELECT * FROM gallery';
  const params: unknown[] = [];
  const conditions: string[] = [];

  if (category && category !== 'all') {
    conditions.push(`category = $${params.length + 1}`);
    params.push(category);
  }
  // Used by the service pages (/services/face-painting, ...) to show only the
  // photos tagged with that service.
  if (service && service !== 'all') {
    conditions.push(`service = $${params.length + 1}`);
    params.push(service);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  query += ' ORDER BY display_order ASC, created_at DESC';

  const result = await db.query(query, params);
  res.json(result.rows);
}

export async function addGalleryItem(req: Request, res: Response): Promise<void> {
  const db = getDatabase();
  const { title, category, service } = req.body;
  const file = req.file;

  if (!file) {
    res.status(400).json({ error: 'Image file is required' });
    return;
  }

  if (!category) {
    res.status(400).json({ error: 'Category is required' });
    return;
  }

  const id = uuidv4();
  const imagePath = `/uploads/${file.filename}`;

  const maxOrder = await db.query('SELECT MAX(display_order) as max_order FROM gallery');
  const displayOrder = (maxOrder.rows[0].max_order || 0) + 1;

  const result = await db.query(
    'INSERT INTO gallery (id, title, category, image_path, display_order, service) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [id, title || null, category, imagePath, displayOrder, isServiceSlug(service) ? service : null]
  );

  res.status(201).json(result.rows[0]);
}

// Edit an existing item: title and category always, image file only when a
// replacement is uploaded (the old file is removed so uploads/ doesn't pile up).
export async function updateGalleryItem(req: Request, res: Response): Promise<void> {
  const db = getDatabase();
  const { id } = req.params;
  const { title, category, service } = req.body;
  const file = req.file;

  const existing = await db.query('SELECT * FROM gallery WHERE id = $1', [id]);

  if (existing.rows.length === 0) {
    res.status(404).json({ error: 'Gallery item not found' });
    return;
  }

  const current = existing.rows[0];
  let imagePath = current.image_path;

  if (file) {
    imagePath = `/uploads/${file.filename}`;
    const oldPath = path.join(__dirname, '../../', current.image_path);
    if (fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    }
  }

  const result = await db.query(
    'UPDATE gallery SET title = $1, category = $2, image_path = $3, service = $4 WHERE id = $5 RETURNING *',
    [
      title === undefined ? current.title : (String(title).trim() || null),
      category || current.category,
      imagePath,
      // An empty value is how the admin clears the tag, so only an absent field
      // leaves the current one alone.
      service === undefined ? current.service : (isServiceSlug(service) ? service : null),
      id,
    ]
  );

  res.json(result.rows[0]);
}

export async function deleteGalleryItem(req: Request, res: Response): Promise<void> {
  const db = getDatabase();
  const { id } = req.params;

  const result = await db.query('SELECT * FROM gallery WHERE id = $1', [id]);

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Gallery item not found' });
    return;
  }

  const filePath = path.join(__dirname, '../../', result.rows[0].image_path);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await db.query('DELETE FROM gallery WHERE id = $1', [id]);
  res.json({ message: 'Gallery item deleted' });
}

export async function updateGalleryOrder(req: Request, res: Response): Promise<void> {
  const db = getDatabase();
  const { items } = req.body;

  if (!Array.isArray(items)) {
    res.status(400).json({ error: 'Items array is required' });
    return;
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    for (const item of items) {
      await client.query('UPDATE gallery SET display_order = $1 WHERE id = $2', [item.display_order, item.id]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  res.json({ message: 'Gallery order updated' });
}
