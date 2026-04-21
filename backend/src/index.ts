import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { initDatabase } from './config/database';
import authRoutes from './routes/auth.routes';
import bookingsRoutes from './routes/bookings.routes';
import galleryRoutes from './routes/gallery.routes';
import settingsRoutes from './routes/settings.routes';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize database then start server
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🌸 Smileyfaces API running on http://localhost:${PORT}`);
      console.log(`   Admin email: ${process.env.ADMIN_EMAIL}`);
      console.log(`   Google Calendar: ${process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id' ? 'Configured' : 'Not configured (placeholder)'}\n`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
