import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

export interface Booking {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  service_type: string;
  date: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  status: string;
  google_event_id: string | null;
  created_at: string;
  updated_at: string;
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
  service_type: string;
  date: string;
  start_time: string;
  end_time: string;
  notes?: string;
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

  getStats(): Observable<BookingStats> {
    return this.api.get<BookingStats>('/bookings/stats');
  }
}
