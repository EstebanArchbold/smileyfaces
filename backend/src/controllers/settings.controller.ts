import { Request, Response } from 'express';
import { getDatabase } from '../config/database';

export async function getSettings(_req: Request, res: Response): Promise<void> {
  const db = getDatabase();
  const result = await db.query('SELECT * FROM settings');

  const settings: Record<string, string> = {};
  for (const s of result.rows) {
    settings[s.key] = s.value;
  }

  res.json(settings);
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

  const result = await db.query('SELECT * FROM settings');
  const settings: Record<string, string> = {};
  for (const s of result.rows) {
    settings[s.key] = s.value;
  }

  res.json(settings);
}
