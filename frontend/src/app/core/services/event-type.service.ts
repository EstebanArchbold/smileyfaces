import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

export interface EventType {
  id: string;
  value: string;
  label: string;
  icon: string;
  display_order: number;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class EventTypeService {
  constructor(private api: ApiService) {}

  getAll(): Observable<EventType[]> {
    return this.api.get<EventType[]>('/event-types');
  }

  create(data: { label: string; icon?: string }): Observable<EventType> {
    return this.api.post<EventType>('/event-types', data);
  }

  update(id: string, data: { label?: string; icon?: string }): Observable<EventType> {
    return this.api.put<EventType>(`/event-types/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/event-types/${id}`);
  }
}
