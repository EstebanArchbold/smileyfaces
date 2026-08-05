import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingService, Booking, ExtraCharge } from '../../core/services/booking.service';
import { EventTypeService } from '../../core/services/event-type.service';
import { SettingsService } from '../../core/services/settings.service';

@Component({
  selector: 'app-bookings-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bookings-management.component.html',
  styleUrl: './bookings-management.component.scss'
})
export class BookingsManagementComponent implements OnInit {
  bookings = signal<Booking[]>([]);
  total = signal(0);
  page = signal(1);
  totalPages = signal(1);
  statusFilter = '';
  sortBy = 'created_desc';
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

  // Review-link generator modal
  reviewBooking = signal<Booking | null>(null);
  reviewName = '';
  reviewEmail = '';
  generatedReviewLink = signal<string | null>(null);
  reviewCopied = signal(false);

  // Billing & notes modal (discount, extra charges, private notes)
  billingBooking = signal<Booking | null>(null);
  billingDiscount = 0;
  billingDiscountNote = '';
  billingCharges = signal<ExtraCharge[]>([]);
  billingNotes = '';
  billingSaving = signal(false);
  billingError = signal<string | null>(null);
  hourlyRate = signal(80);

  // Reschedule modal
  editBooking = signal<Booking | null>(null);
  editDate = '';
  editStart = '';
  editEnd = '';
  editError = signal<string | null>(null);
  editSaving = signal(false);
  // 15-minute steps from 8:00 to 22:00, matching the public booking page
  hourOptions = Array.from({ length: 57 }, (_, i) => {
    const min = 8 * 60 + i * 15;
    return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
  });

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
    private settingsService: SettingsService
  ) {}

  ngOnInit() {
    this.loadBookings();
    this.eventTypeService.getAll().subscribe(types => {
      for (const t of types) {
        this.serviceLabels[t.value] = t.label;
      }
    });
    // Needed to show what a booking adds up to once charges and discounts are in
    this.settingsService.get().subscribe(settings => {
      this.hourlyRate.set(Number(settings['hourly_rate']) || 80);
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
      sort: this.sortBy,
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

  // Sorting happens server-side: the list is paginated, so reordering
  // client-side would only touch the 15 rows currently on screen.
  onSortChange() {
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

  openReviewModal(booking: Booking, event: Event) {
    event.stopPropagation();
    this.reviewBooking.set(booking);
    this.reviewName = booking.client_name;
    this.reviewEmail = booking.client_email || '';
    this.generatedReviewLink.set(null);
    this.reviewCopied.set(false);
  }

  closeReviewModal() {
    this.reviewBooking.set(null);
    this.generatedReviewLink.set(null);
  }

  generateReviewLink() {
    const booking = this.reviewBooking();
    if (!booking) return;

    const params = new URLSearchParams();
    if (this.reviewName.trim()) params.set('name', this.reviewName.trim());
    if (this.reviewEmail.trim()) params.set('email', this.reviewEmail.trim());
    params.set('date', this.formatDate(booking.date));

    this.generatedReviewLink.set(`${window.location.origin}/review/${booking.id}?${params.toString()}`);
    this.reviewCopied.set(false);
  }

  copyReviewLink() {
    const link = this.generatedReviewLink();
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      this.reviewCopied.set(true);
      setTimeout(() => this.reviewCopied.set(false), 2500);
    });
  }

  openBillingModal(booking: Booking, event: Event) {
    event.stopPropagation();
    this.billingBooking.set(booking);
    this.billingDiscount = Number(booking.discount) || 0;
    this.billingDiscountNote = booking.discount_note || '';
    // Copied, so editing rows in the modal doesn't mutate the row behind it
    // before the admin saves.
    this.billingCharges.set((booking.extra_charges || []).map(c => ({ ...c })));
    this.billingNotes = booking.admin_notes || '';
    this.billingError.set(null);
  }

  closeBillingModal() {
    this.billingBooking.set(null);
  }

  addCharge() {
    this.billingCharges.update(list => [...list, { label: '', amount: 0 }]);
  }

  removeCharge(index: number) {
    this.billingCharges.update(list => list.filter((_, i) => i !== index));
  }

  /** Quick presets for the charges that come up on almost every event. */
  addPresetCharge(label: string) {
    this.billingCharges.update(list => [...list, { label, amount: 0 }]);
  }

  baseAmount(booking: Booking): number {
    return this.hoursOf(booking) * this.hourlyRate();
  }

  chargesTotal(charges: ExtraCharge[]): number {
    return charges.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  }

  /** Base + extras − discount, never below zero (matches the server's math). */
  bookingTotal(booking: Booking, charges?: ExtraCharge[], discount?: number): number {
    const extras = this.chargesTotal(charges ?? booking.extra_charges ?? []);
    const off = discount ?? Number(booking.discount) ?? 0;
    return Math.max(0, this.baseAmount(booking) + extras - (Number(off) || 0));
  }

  /** Revenue counts delivered work only, matching the dashboard's own rule. */
  countsTowardRevenue(booking: Booking): boolean {
    return booking.status === 'completed';
  }

  hasBillingInfo(booking: Booking): boolean {
    return Number(booking.discount) > 0
      || (booking.extra_charges?.length || 0) > 0
      || !!booking.admin_notes;
  }

  saveBilling() {
    const booking = this.billingBooking();
    if (!booking) return;

    // Blank rows are what a half-filled "add charge" line looks like; drop them
    // instead of making the admin clean up before saving.
    const charges = this.billingCharges()
      .filter(c => c.label.trim() || c.amount)
      .map(c => ({ label: c.label.trim(), amount: Number(c.amount) || 0 }));

    const missingLabel = charges.find(c => !c.label);
    if (missingLabel) {
      this.billingError.set('Every extra charge needs a name.');
      return;
    }

    this.billingSaving.set(true);
    this.billingError.set(null);
    this.bookingService.updateBilling(booking.id, {
      discount: Number(this.billingDiscount) || 0,
      discount_note: this.billingDiscountNote.trim(),
      extra_charges: charges,
      admin_notes: this.billingNotes.trim(),
    }).subscribe({
      next: updated => {
        this.bookings.update(list => list.map(b => b.id === updated.id ? updated : b));
        this.billingSaving.set(false);
        this.closeBillingModal();
      },
      error: err => {
        this.billingSaving.set(false);
        this.billingError.set(err.error?.error || 'Could not save. Please try again.');
      },
    });
  }

  private hoursOf(booking: Booking): number {
    const [sh, sm] = booking.start_time.split(':').map(Number);
    const [eh, em] = booking.end_time.split(':').map(Number);
    return (eh + (em || 0) / 60) - (sh + (sm || 0) / 60);
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
}
