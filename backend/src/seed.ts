import dotenv from 'dotenv';
dotenv.config();

import { initDatabase, getDatabase } from './config/database';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  await initDatabase();
  const db = getDatabase();

  const bookings = [
    { client_name: 'Emma Thompson', client_email: 'emma@example.com', client_phone: '555-0101', address: '123 Rosewood Ave, Toronto', service_type: 'private', date: '2026-03-28', start_time: '10:00', end_time: '12:00', status: 'confirmed' },
    { client_name: 'Sofia Garcia', client_email: 'sofia@example.com', client_phone: '555-0102', address: '88 Lakeshore Blvd, Toronto', service_type: 'public', date: '2026-03-30', start_time: '14:00', end_time: '16:00', status: 'pending' },
    { client_name: 'Olivia Chen', client_email: 'olivia@example.com', client_phone: '555-0103', address: '45 King St W, Toronto', service_type: 'private', date: '2026-04-02', start_time: '11:00', end_time: '13:30', status: 'confirmed' },
    { client_name: 'Isabella Park', client_email: 'isabella@example.com', client_phone: '555-0104', address: '12 Queen St E, Toronto', service_type: 'public', date: '2026-04-05', start_time: '09:00', end_time: '11:00', status: 'pending' },
    { client_name: 'Mia Johnson', client_email: 'mia@example.com', client_phone: '555-0105', address: '301 Bloor St, Toronto', service_type: 'private', date: '2026-02-15', start_time: '13:00', end_time: '15:30', status: 'completed' },
    { client_name: 'Ava Williams', client_email: 'ava@example.com', client_phone: '555-0106', address: '77 Yonge St, Toronto', service_type: 'private', date: '2026-02-20', start_time: '10:00', end_time: '12:00', status: 'completed' },
    { client_name: 'Charlotte Brown', client_email: 'charlotte@example.com', client_phone: '555-0107', address: '9 Distillery Lane, Toronto', service_type: 'public', date: '2026-01-10', start_time: '14:00', end_time: '17:00', status: 'completed' },
    { client_name: 'Amelia Davis', client_email: 'amelia@example.com', client_phone: '555-0108', address: '230 Dundas St, Toronto', service_type: 'private', date: '2026-01-22', start_time: '09:00', end_time: '12:00', status: 'completed' },
    { client_name: 'Harper Wilson', client_email: 'harper@example.com', client_phone: '555-0109', address: '15 Harbourfront Dr, Toronto', service_type: 'private', date: '2025-12-15', start_time: '15:00', end_time: '17:00', status: 'completed' },
    { client_name: 'Luna Martinez', client_email: 'luna@example.com', client_phone: '555-0110', address: '52 Kensington Ave, Toronto', service_type: 'public', date: '2025-12-28', start_time: '10:00', end_time: '12:30', status: 'completed' },
    { client_name: 'Ella Anderson', client_email: 'ella@example.com', client_phone: '555-0111', address: '410 College St, Toronto', service_type: 'public', date: '2026-04-10', start_time: '11:00', end_time: '13:00', status: 'pending' },
    { client_name: 'Scarlett Taylor', client_email: 'scarlett@example.com', client_phone: null, address: null, service_type: 'private', date: '2026-03-15', start_time: '09:00', end_time: '11:30', status: 'cancelled' },
  ];

  for (const b of bookings) {
    await db.query(
      `INSERT INTO bookings (id, client_name, client_email, client_phone, address, service_type, date, start_time, end_time, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO NOTHING`,
      [uuidv4(), b.client_name, b.client_email, b.client_phone, b.address, b.service_type, b.date, b.start_time, b.end_time, b.status]
    );
  }

  console.log(`Seeded ${bookings.length} bookings`);
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
