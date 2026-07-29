import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { initDatabase } from './config/database';
import authRoutes from './routes/auth.routes';
import bookingsRoutes from './routes/bookings.routes';
import galleryRoutes from './routes/gallery.routes';
import settingsRoutes from './routes/settings.routes';
import eventTypesRoutes from './routes/event-types.routes';
import testimonialsRoutes from './routes/testimonials.routes';
import pushRoutes from './routes/push.routes';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
// Filenames are UUIDs and a replacement upload always gets a new one, so a
// cached image can never go stale — without this every visit revalidated each
// photo individually.
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), { maxAge: '1y', immutable: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/event-types', eventTypesRoutes);
app.use('/api/testimonials', testimonialsRoutes);
app.use('/api/push', pushRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Without this, a rejected upload fell through to Express's default handler,
// which answers with an HTML error page. The admin reads `error` off a JSON
// body, so every failure showed up as no message at all.
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Request failed:', err);

  // Thrown by busboy when the request body ends mid-form — typically a phone
  // dropping its connection partway through an upload.
  if (err.message === 'Unexpected end of form') {
    res.status(400).json({ error: 'The upload was interrupted. Please check your connection and try again.' });
    return;
  }

  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'That image is too large. Please use one under 50MB.'
      : `Upload failed: ${err.message}`;
    res.status(400).json({ error: message });
    return;
  }

  // The file-type rejection from the upload middleware.
  if (err.message.startsWith('Only image files')) {
    res.status(400).json({ error: err.message });
    return;
  }

  res.status(500).json({ error: 'Something went wrong. Please try again.' });
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
