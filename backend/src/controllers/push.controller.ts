import { Request, Response } from 'express';
import {
  getPublicKey,
  isPushConfigured,
  saveSubscription,
  removeSubscription,
  countSubscriptions,
} from '../services/push.service';
import { isEmailConfigured } from '../services/email.service';
import { notifyAdmin } from '../services/notification.service';
import { Booking } from '../types';

// The VAPID public key is not a secret — the browser needs it to subscribe.
export function getVapidKey(_req: Request, res: Response): void {
  res.json({ publicKey: getPublicKey(), enabled: isPushConfigured() });
}

export async function subscribe(req: Request, res: Response): Promise<void> {
  const { endpoint, keys } = req.body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ error: 'A valid push subscription is required' });
    return;
  }

  await saveSubscription({ endpoint, keys });
  res.status(201).json({ message: 'Subscribed' });
}

export async function unsubscribe(req: Request, res: Response): Promise<void> {
  const { endpoint } = req.body;

  if (!endpoint) {
    res.status(400).json({ error: 'endpoint is required' });
    return;
  }

  await removeSubscription(endpoint);
  res.json({ message: 'Unsubscribed' });
}

export async function getStatus(_req: Request, res: Response): Promise<void> {
  res.json({
    pushConfigured: isPushConfigured(),
    emailConfigured: isEmailConfigured(),
    devices: await countSubscriptions(),
  });
}

// Lets the admin verify the whole chain (device, keys, SMTP) without waiting
// for a real client to book something.
export function sendTest(_req: Request, res: Response): void {
  const sample = {
    id: 'test',
    client_name: 'Test Notification',
    client_email: 'test@example.com',
    client_phone: null,
    address: null,
    service_type: 'test',
    date: new Date().toISOString().split('T')[0],
    start_time: '17:00',
    end_time: '18:00',
    notes: 'If you can read this, notifications are working.',
    num_kids: null,
    status: 'pending',
  } as unknown as Booking;

  notifyAdmin(sample, 'new_booking');
  res.json({ message: 'Test notification sent' });
}
