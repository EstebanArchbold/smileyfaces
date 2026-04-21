import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BookingService, Booking } from '../../core/services/booking.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-bookings-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './bookings-management.component.html',
  styleUrl: './bookings-management.component.scss'
})
export class BookingsManagementComponent implements OnInit {
  bookings = signal<Booking[]>([]);
  total = signal(0);
  page = signal(1);
  totalPages = signal(1);
  statusFilter = '';
  loading = signal(false);

  statuses = ['', 'pending', 'confirmed', 'completed', 'cancelled'];

  constructor(private bookingService: BookingService, private authService: AuthService) {}

  ngOnInit() {
    this.loadBookings();
  }

  loadBookings() {
    this.loading.set(true);
    const params: Record<string, string> = {
      page: String(this.page()),
      limit: '15',
    };
    if (this.statusFilter) params['status'] = this.statusFilter;

    this.bookingService.getAll(params).subscribe({
      next: (res) => {
        this.bookings.set(res.bookings);
        this.total.set(res.total);
        this.totalPages.set(res.totalPages);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onStatusFilterChange() {
    this.page.set(1);
    this.loadBookings();
  }

  updateStatus(booking: Booking, newStatus: string) {
    this.bookingService.updateStatus(booking.id, newStatus).subscribe(updated => {
      this.bookings.update(list =>
        list.map(b => b.id === updated.id ? updated : b)
      );
    });
  }

  prevPage() {
    if (this.page() > 1) {
      this.page.update(p => p - 1);
      this.loadBookings();
    }
  }

  nextPage() {
    if (this.page() < this.totalPages()) {
      this.page.update(p => p + 1);
      this.loadBookings();
    }
  }

  getServiceLabel(type: string): string {
    const labels: Record<string, string> = {
      private_events: 'Private Event',
      editorial_glow: 'Editorial Glow',
      bridal: 'Bridal',
      other: 'Other',
    };
    return labels[type] || type;
  }

  logout() {
    this.authService.logout();
  }
}
