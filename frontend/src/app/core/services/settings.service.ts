import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

export interface Settings {
  hourly_rate?: string;
  hero_image?: string;
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
  constructor(private api: ApiService) {}

  get(): Observable<Settings> {
    return this.api.get<Settings>('/settings');
  }

  update(settings: Partial<Settings>): Observable<Settings> {
    return this.api.put<Settings>('/settings', settings);
  }

  uploadHeroImage(file: File): Observable<Settings> {
    const formData = new FormData();
    formData.append('image', file);
    return this.api.upload<Settings>('/settings/hero-image', formData);
  }
}
