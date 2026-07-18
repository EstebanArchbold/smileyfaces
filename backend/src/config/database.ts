import { Pool } from 'pg';

let pool: Pool;

export async function initDatabase(): Promise<Pool> {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  // Test connection
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        client_name TEXT NOT NULL,
        client_email TEXT NOT NULL,
        client_phone TEXT,
        service_type TEXT NOT NULL,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        notes TEXT,
        status TEXT DEFAULT 'pending',
        google_event_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS gallery (
        id TEXT PRIMARY KEY,
        title TEXT,
        category TEXT NOT NULL,
        image_path TEXT NOT NULL,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      INSERT INTO settings (key, value) VALUES ('hourly_rate', '80')
      ON CONFLICT (key) DO NOTHING;

      CREATE TABLE IF NOT EXISTS event_types (
        id TEXT PRIMARY KEY,
        value TEXT UNIQUE NOT NULL,
        label TEXT NOT NULL,
        icon TEXT DEFAULT 'palette',
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      INSERT INTO event_types (id, value, label, icon, display_order) VALUES
        ('et-private-events', 'private_events', 'Private Events', 'celebration', 1),
        ('et-editorial-glow', 'editorial_glow', 'Editorial Glow', 'auto_awesome', 2),
        ('et-bridal', 'bridal', 'Bridal', 'favorite', 3),
        ('et-other', 'other', 'Other', 'palette', 4)
      ON CONFLICT (id) DO NOTHING;
    `);
  } finally {
    client.release();
  }

  return pool;
}

export function getDatabase(): Pool {
  if (!pool) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return pool;
}
