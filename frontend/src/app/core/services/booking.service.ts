import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

export interface ExtraCharge {
  label: string;
  amount: number;
}

export interface BillingDto {
  discount?: number;
  discount_note?: string;
  extra_charges?: ExtraCharge[];
  admin_notes?: string;
}

export interface Booking {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  address: string | null;
  service_type: string;
  date: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  num_kids: string | null;
  duration: string | null;
  theme: string | null;
  arrival_time: string | null;
  hours_booked: string | null;
  bday_kid_name: string | null;
  kids_age_range: string | null;
  allergies: string | null;
  comments: string | null;
  confirmation_submitted_at: string | null;
  /** NUMERIC comes back from the API as a string. */
  discount: string | number | null;
  discount_note: string | null;
  extra_charges: ExtraCharge[];
  /** Private to the admin — never shown to the client. */
  admin_notes: string | null;
  status: string;
  google_event_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConfirmationDto {
  address: string;
  theme?: string;
  bday_kid_name?: string;
  kids_age_range?: string;
  allergies?: string;
  comments?: string;
  num_kids?: string;
  arrival_time?: string;
  hours_booked?: string;
}

export interface BookingsResponse {
  bookings: Booking[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BookingStats {
  totalBookings: number;
  totalRevenue: number;
  upcomingBookings: number;
  hourlyRate: number;
  bookingsByMonth: { month: string; count: number }[];
  revenueByMonth: { month: string; revenue: number }[];
}

export interface CreateBookingDto {
  client_name: string;
  client_email: string;
  client_phone?: string;
  address?: string;
  service_type: string;
  date: string;
  start_time: string;
  end_time: string;
  notes?: string;
  num_kids?: string;
  duration?: string;
}

@Injectable({ providedIn: 'root' })
export class BookingService {
  constructor(private api: ApiService) {}

  create(booking: CreateBookingDto): Observable<Booking> {
    return this.api.post<Booking>('/bookings', booking);
  }

  getAll(params?: Record<string, string>): Observable<BookingsResponse> {
    return this.api.get<BookingsResponse>('/bookings', params);
  }

  updateStatus(id: string, status: string): Observable<Booking> {
    return this.api.put<Booking>(`/bookings/${id}`, { status });
  }

  updateTimes(id: string, data: { date: string; start_time: string; end_time: string }): Observable<Booking> {
    return this.api.put<Booking>(`/bookings/${id}`, data);
  }

  updateBilling(id: string, data: BillingDto): Observable<Booking> {
    return this.api.patch<Booking>(`/bookings/${id}/billing`, data);
  }

  getAvailability(date: string): Observable<{ blocked: { start: number; end: number }[]; gap_minutes: number }> {
    return this.api.get<{ blocked: { start: number; end: number }[]; gap_minutes: number }>('/bookings/availability', { date });
  }

  submitConfirmation(id: string, data: ConfirmationDto): Observable<Booking> {
    return this.api.put<Booking>(`/bookings/${id}/confirmation`, data);
  }

  createConfirmed(data: Record<string, string | undefined>): Observable<Booking> {
    return this.api.post<Booking>('/bookings/confirmed', data);
  }

  getStats(): Observable<BookingStats> {
    return this.api.get<BookingStats>('/bookings/stats');
  }
}
