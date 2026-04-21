import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

export interface Settings {
  hourly_rate: string;
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
}
