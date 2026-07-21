import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { getDatabase } from '../config/database';
import { isConfigured } from '../config/google-calendar';

const MAX_WORDS = 50;

// Site content keys editable from the admin panel
const CONTENT_KEYS = [
  'hero_title',
  'hero_subtitle',
  'hero_cta',
  'hero_badge',
  'gallery_label',
  'gallery_title',
  'gallery_description',
];

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

async function readAllSettings(): Promise<Record<string, string>> {
  const db = getDatabase();
  const result = await db.query('SELECT * FROM settings');
  const settings: Record<string, string> = {};
  for (const s of result.rows) {
    settings[s.key] = s.value;
  }
  settings['google_calendar_configured'] = isConfigured() ? 'true' : 'false';
  return settings;
}

export async function getSettings(_req: Request, res: Response): Promise<void> {
  res.json(await readAllSettings());
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  const db = getDatabase();
  const { hourly_rate } = req.body;

  if (hourly_rate !== undefined) {
    const rate = Number(hourly_rate);
    if (isNaN(rate) || rate < 0) {
      res.status(400).json({ error: 'Invalid hourly rate' });
      return;
    }
    await db.query(
      "INSERT INTO settings (key, value) VALUES ('hourly_rate', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
      [String(rate)]
    );
  }

  for (const key of CONTENT_KEYS) {
    const value = req.body[key];
    if (value === undefined) continue;
    if (typeof value !== 'string') {
      res.status(400).json({ error: `${key} must be a string` });
      return;
    }
    if (countWords(value) > MAX_WORDS) {
      res.status(400).json({ error: `${key} exceeds the ${MAX_WORDS}-word limit` });
      return;
    }
    await db.query(
      'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
      [key, value]
    );
  }

  res.json(await readAllSettings());
}

async function saveImageSetting(key: string, req: Request, res: Response): Promise<void> {
  const db = getDatabase();
  const file = req.file;

  if (!file) {
    res.status(400).json({ error: 'Image file is required' });
    return;
  }

  const imagePath = `/uploads/${file.filename}`;

  // Remove the previous image file so the volume doesn't accumulate orphans
  const previous = await db.query('SELECT value FROM settings WHERE key = $1', [key]);
  if (previous.rows.length > 0) {
    const oldPath = path.join(__dirname, '../../', previous.rows[0].value);
    if (fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    }
  }

  await db.query(
    'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
    [key, imagePath]
  );

  res.status(201).json(await readAllSettings());
}

export async function uploadHeroImage(req: Request, res: Response): Promise<void> {
  await saveImageSetting('hero_image', req, res);
}

export async function uploadAboutImage(req: Request, res: Response): Promise<void> {
  await saveImageSetting('about_image', req, res);
}
