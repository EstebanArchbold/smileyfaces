import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable, shareReplay, tap } from 'rxjs';

export interface Settings {
  hourly_rate?: string;
  hero_image?: string;
  about_image?: string;
  hero_title?: string;
  hero_subtitle?: string;
  hero_cta?: string;
  hero_badge?: string;
  gallery_label?: string;
  gallery_title?: string;
  gallery_description?: string;
  google_calendar_configured?: string;
  [key: string]: string | undefined;
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  // The home page alone asks for settings from two components (hero + gallery
  // preview); without sharing, each subscription fired its own /settings request.
  private cached$: Observable<Settings> | null = null;

  constructor(private api: ApiService) {}

  get(): Observable<Settings> {
    if (!this.cached$) {
      this.cached$ = this.api.get<Settings>('/settings').pipe(
        // Drop the cache on failure, otherwise shareReplay would keep replaying
        // the error to every later caller.
        tap({ error: () => this.invalidate() }),
        shareReplay(1),
      );
    }
    return this.cached$;
  }

  update(settings: Partial<Settings>): Observable<Settings> {
    return this.api.put<Settings>('/settings', settings).pipe(tap(() => this.invalidate()));
  }

  uploadHeroImage(file: File): Observable<Settings> {
    const formData = new FormData();
    formData.append('image', file);
    return this.api.upload<Settings>('/settings/hero-image', formData).pipe(tap(() => this.invalidate()));
  }

  uploadAboutImage(file: File): Observable<Settings> {
    const formData = new FormData();
    formData.append('image', file);
    return this.api.upload<Settings>('/settings/about-image', formData).pipe(tap(() => this.invalidate()));
  }

  uploadServiceImage(slug: string, file: File): Observable<Settings> {
    const formData = new FormData();
    formData.append('image', file);
    return this.api.upload<Settings>(`/settings/service-image/${slug}`, formData).pipe(tap(() => this.invalidate()));
  }

  /** Forces the next get() to hit the API again. */
  private invalidate() {
    this.cached$ = null;
  }
}
