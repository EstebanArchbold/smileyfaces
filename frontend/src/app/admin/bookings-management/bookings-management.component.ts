import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BookingService, Booking } from '../../core/services/booking.service';
import { EventTypeService } from '../../core/services/event-type.service';
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
  expandedId = signal<string | null>(null);

  // Confirmation-link generator modal
  linkBooking = signal<Booking | null>(null);
  linkName = '';
  linkAddress = '';
  linkKids = '';
  generatedLink = signal<string | null>(null);
  copied = signal(false);
  blankCopied = signal(false);

  // Reschedule modal
  editBooking = signal<Booking | null>(null);
  editDate = '';
  editStart = '';
  editEnd = '';
  editError = signal<string | null>(null);
  editSaving = signal(false);
  hourOptions = Array.from({ length: 15 }, (_, i) => `${String(8 + i).padStart(2, '0')}:00`);

  statuses = ['', 'pending', 'confirmed', 'completed', 'cancelled'];

  private serviceLabels: Record<string, string> = {
    private_events: 'Private Event',
    editorial_glow: 'Editorial Glow',
    bridal: 'Bridal',
    other: 'Other',
  };

  private monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  constructor(
    private bookingService: BookingService,
    private eventTypeService: EventTypeService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadBookings();
    this.eventTypeService.getAll().subscribe(types => {
      for (const t of types) {
        this.serviceLabels[t.value] = t.label;
      }
    });
  }

  formatDate(dateStr: string): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) return dateStr;
    return `${this.monthNames[month - 1]}/${String(day).padStart(2, '0')}/${year}`;
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
    return this.serviceLabels[type] || type;
  }

  toggleExpand(id: string) {
    this.expandedId.update(current => current === id ? null : id);
  }

  openLinkModal(booking: Booking, event: Event) {
    event.stopPropagation();
    this.linkBooking.set(booking);
    this.linkName = booking.client_name;
    this.linkAddress = booking.address || '';
    this.linkKids = booking.num_kids || '';
    this.generatedLink.set(null);
    this.copied.set(false);
  }

  closeLinkModal() {
    this.linkBooking.set(null);
    this.generatedLink.set(null);
  }

  generateLink() {
    const booking = this.linkBooking();
    if (!booking) return;

    const params = new URLSearchParams();
    if (this.linkName.trim()) params.set('name', this.linkName.trim());
    if (this.linkAddress.trim()) params.set('address', this.linkAddress.trim());
    if (this.linkKids.trim()) params.set('kids', this.linkKids.trim());
    params.set('service', booking.service_type);
    params.set('date', this.formatDate(booking.date));

    this.generatedLink.set(`${window.location.origin}/confirm/${booking.id}?${params.toString()}`);
    this.copied.set(false);
  }

  copyLink() {
    const link = this.generatedLink();
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2500);
    });
  }

  copyBlankFormLink() {
    navigator.clipboard.writeText(`${window.location.origin}/confirm`).then(() => {
      this.blankCopied.set(true);
      setTimeout(() => this.blankCopied.set(false), 2500);
    });
  }

  openEditModal(booking: Booking, event: Event) {
    event.stopPropagation();
    this.editBooking.set(booking);
    this.editDate = booking.date;
    this.editStart = booking.start_time;
    this.editEnd = booking.end_time;
    this.editError.set(null);
  }

  closeEditModal() {
    this.editBooking.set(null);
  }

  saveTimes() {
    const booking = this.editBooking();
    if (!booking || !this.editDate || !this.editStart || !this.editEnd) return;

    this.editSaving.set(true);
    this.editError.set(null);
    this.bookingService.updateTimes(booking.id, {
      date: this.editDate,
      start_time: this.editStart,
      end_time: this.editEnd,
    }).subscribe({
      next: updated => {
        this.bookings.update(list => list.map(b => b.id === updated.id ? updated : b));
        this.editSaving.set(false);
        this.closeEditModal();
      },
      error: err => {
        this.editSaving.set(false);
        this.editError.set(err.error?.error || 'Failed to update the appointment.');
      },
    });
  }

  logout() {
    this.authService.logout();
  }
}
