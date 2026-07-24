import webpush from 'web-push';
import { getDatabase } from '../config/database';

const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@smileyfaces.art';

let configured = false;

if (PUBLIC_KEY && PRIVATE_KEY) {
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
  configured = true;
} else {
  console.log('[Push] VAPID keys missing — push notifications disabled.');
}

export function isPushConfigured(): boolean {
  return configured;
}

export function getPublicKey(): string {
  return PUBLIC_KEY;
}

export async function saveSubscription(sub: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<void> {
  const db = getDatabase();
  // Re-subscribing on the same device returns the same endpoint but can rotate
  // the keys, so overwrite instead of ignoring the conflict.
  await db.query(
    `INSERT INTO push_subscriptions (endpoint, p256dh, auth) VALUES ($1, $2, $3)
     ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
    [sub.endpoint, sub.keys.p256dh, sub.keys.auth]
  );
}

export async function removeSubscription(endpoint: string): Promise<void> {
  const db = getDatabase();
  await db.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
}

export async function countSubscriptions(): Promise<number> {
  const db = getDatabase();
  const result = await db.query('SELECT COUNT(*) as count FROM push_subscriptions');
  return Number(result.rows[0].count);
}

// Fan out to every registered device. Failures are logged, never thrown: a dead
// phone subscription must not break the booking that triggered the notification.
export async function sendPush(title: string, body: string, url = '/admin/bookings'): Promise<void> {
  if (!configured) return;

  const db = getDatabase();
  const subs = await db.query('SELECT endpoint, p256dh, auth FROM push_subscriptions');
  if (subs.rows.length === 0) return;

  const payload = JSON.stringify({
    notification: {
      title,
      body,
      icon: '/assets/icons/icon-192x192.png',
      badge: '/assets/icons/icon-96x96.png',
      vibrate: [200, 100, 200],
      data: { onActionClick: { default: { operation: 'navigateLastFocusedOrOpen', url } } },
    },
  });

  await Promise.all(
    subs.rows.map(async row => {
      try {
        await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          payload
        );
      } catch (error) {
        const status = (error as { statusCode?: number })?.statusCode;
        // 404/410: the browser dropped this subscription for good. Anything else
        // (network blip, rate limit) might recover, so keep the row.
        if (status === 404 || status === 410) {
          await db.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [row.endpoint]);
          console.log('[Push] Removed expired subscription.');
        } else {
          console.error('[Push] Failed to send notification:', error);
        }
      }
    })
  );
}
