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
        address TEXT,
        service_type TEXT NOT NULL,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        notes TEXT,
        num_kids TEXT,
        duration TEXT,
        theme TEXT,
        arrival_time TEXT,
        hours_booked TEXT,
        bday_kid_name TEXT,
        kids_age_range TEXT,
        allergies TEXT,
        comments TEXT,
        confirmation_submitted_at TIMESTAMPTZ,
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

      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS address TEXT;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS num_kids TEXT;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS duration TEXT;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS theme TEXT;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS arrival_time TEXT;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS hours_booked TEXT;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS bday_kid_name TEXT;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS kids_age_range TEXT;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS allergies TEXT;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS comments TEXT;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS confirmation_submitted_at TIMESTAMPTZ;

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
        ('et-private', 'private', 'Private', 'celebration', 1),
        ('et-public', 'public', 'Public', 'groups', 2)
      ON CONFLICT (id) DO NOTHING;

      DELETE FROM event_types WHERE id IN ('et-private-events', 'et-editorial-glow', 'et-bridal', 'et-other');
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
