import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { getDatabase } from '../config/database';

export async function getGalleryItems(req: Request, res: Response): Promise<void> {
  const db = getDatabase();
  const { category } = req.query;

  let query = 'SELECT * FROM gallery';
  const params: unknown[] = [];

  if (category && category !== 'all') {
    query += ' WHERE category = $1';
    params.push(category);
  }

  query += ' ORDER BY display_order ASC, created_at DESC';

  const result = await db.query(query, params);
  res.json(result.rows);
}

export async function addGalleryItem(req: Request, res: Response): Promise<void> {
  const db = getDatabase();
  const { title, category } = req.body;
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
    'INSERT INTO gallery (id, title, category, image_path, display_order) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [id, title || null, category, imagePath, displayOrder]
  );

  res.status(201).json(result.rows[0]);
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
