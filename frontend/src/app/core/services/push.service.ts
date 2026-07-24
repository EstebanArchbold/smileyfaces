import { Injectable } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class PushService {
  constructor(private swPush: SwPush, private api: ApiService) {}

  get supported(): boolean {
    return this.swPush.isEnabled;
  }

  // iOS only delivers push to a web app launched from the Home Screen, so the
  // admin needs to know why the button does nothing in a plain Safari tab.
  get isStandalone(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
  }

  get permission(): NotificationPermission {
    return typeof Notification === 'undefined' ? 'denied' : Notification.permission;
  }

  async isSubscribed(): Promise<boolean> {
    if (!this.swPush.isEnabled) return false;
    const sub = await firstValueFrom(this.swPush.subscription);
    return sub !== null;
  }

  // Must be called from a user gesture — iOS rejects the permission prompt
  // otherwise, without any error we could catch.
  async subscribe(): Promise<void> {
    const { publicKey, enabled } = await firstValueFrom(
      this.api.get<{ publicKey: string; enabled: boolean }>('/push/vapid-key')
    );

    if (!enabled || !publicKey) {
      throw new Error('Push notifications are not configured on the server.');
    }

    const sub = await this.swPush.requestSubscription({ serverPublicKey: publicKey });
    await firstValueFrom(this.api.post('/push/subscribe', sub.toJSON()));
  }

  async unsubscribe(): Promise<void> {
    const sub = await firstValueFrom(this.swPush.subscription);
    if (sub) {
      await firstValueFrom(this.api.post('/push/unsubscribe', { endpoint: sub.endpoint }));
      await this.swPush.unsubscribe();
    }
  }

  sendTest() {
    return this.api.post('/push/test', {});
  }
}
