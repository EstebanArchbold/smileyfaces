import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

export interface Testimonial {
  id: string;
  author: string;
  quote: string;
  display_order: number;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class TestimonialService {
  constructor(private api: ApiService) {}

  getAll(): Observable<Testimonial[]> {
    return this.api.get<Testimonial[]>('/testimonials');
  }

  create(data: { author: string; quote: string }): Observable<Testimonial> {
    return this.api.post<Testimonial>('/testimonials', data);
  }

  update(id: string, data: { author?: string; quote?: string }): Observable<Testimonial> {
    return this.api.put<Testimonial>(`/testimonials/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/testimonials/${id}`);
  }
}
