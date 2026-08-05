import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

export interface GalleryItem {
  id: string;
  title: string | null;
  category: string;
  image_path: string;
  display_order: number;
  /** Which service page this photo belongs to, or null for none. */
  service: string | null;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class GalleryService {
  constructor(private api: ApiService) {}

  getAll(category?: string): Observable<GalleryItem[]> {
    const params: Record<string, string> = {};
    if (category && category !== 'all') {
      params['category'] = category;
    }
    return this.api.get<GalleryItem[]>('/gallery', params);
  }

  /** Photos tagged with one of the service pages. */
  getByService(service: string): Observable<GalleryItem[]> {
    return this.api.get<GalleryItem[]>('/gallery', { service });
  }

  upload(formData: FormData): Observable<GalleryItem> {
    return this.api.upload<GalleryItem>('/gallery', formData);
  }

  update(id: string, formData: FormData): Observable<GalleryItem> {
    return this.api.uploadPut<GalleryItem>(`/gallery/${id}`, formData);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/gallery/${id}`);
  }

  updateOrder(items: { id: string; display_order: number }[]): Observable<void> {
    return this.api.put<void>('/gallery/order', { items });
  }
}
