import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

export type TestimonialStatus = 'pending' | 'approved' | 'archived';

export interface Testimonial {
  id: string;
  author: string;
  quote: string;
  display_order: number;
  status: TestimonialStatus;
  images: string[];
  booking_id: string | null;
  client_email: string | null;
  submitted_at: string | null;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class TestimonialService {
  constructor(private api: ApiService) {}

  /** Public: approved only — this is what the landing page slideshow shows. */
  getAll(): Observable<Testimonial[]> {
    return this.api.get<Testimonial[]>('/testimonials');
  }

  /** Admin: every review, whatever its status. */
  getAllForAdmin(): Observable<Testimonial[]> {
    return this.api.get<Testimonial[]>('/testimonials/all');
  }

  create(data: { author: string; quote: string }): Observable<Testimonial> {
    return this.api.post<Testimonial>('/testimonials', data);
  }

  /** Public: a client sending in their review (with optional photos). */
  submit(formData: FormData): Observable<{ message: string; id: string }> {
    return this.api.upload<{ message: string; id: string }>('/testimonials/submit', formData);
  }

  update(id: string, data: { author?: string; quote?: string }): Observable<Testimonial> {
    return this.api.put<Testimonial>(`/testimonials/${id}`, data);
  }

  setStatus(id: string, status: TestimonialStatus): Observable<Testimonial> {
    return this.api.patch<Testimonial>(`/testimonials/${id}/status`, { status });
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/testimonials/${id}`);
  }
}
