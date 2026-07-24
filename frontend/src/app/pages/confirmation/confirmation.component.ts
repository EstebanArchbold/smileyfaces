import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BookingService } from '../../core/services/booking.service';
import { EventTypeService, EventType } from '../../core/services/event-type.service';

@Component({
  selector: 'app-confirmation',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './confirmation.component.html',
  styleUrl: './confirmation.component.scss'
})
export class ConfirmationComponent implements OnInit {
  // With an id in the URL, the form updates an existing booking (admin-generated
  // link with prefill). Without one, it creates a brand new confirmed booking.
  bookingId = '';
  standalone = false;

  clientName = '';
  eventDate = '';
  isPrivate = false;

  // Standalone-only fields
  clientEmail = '';
  clientPhone = '';
  serviceType = 'private';
  eventTypes = signal<EventType[]>([]);
  startTime = '';
  hoursCount = '';

  // Start times in 15-minute steps, 8 AM to 10 PM
  hourOptions = Array.from({ length: 57 }, (_, i) => {
    const min = 8 * 60 + i * 15;
    const h = Math.floor(min / 60);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const mm = String(min % 60).padStart(2, '0');
    return { value: `${String(h).padStart(2, '0')}:${mm}`, label: `${h12}:${mm} ${period}` };
  });
  hoursOptions = Array.from({ length: 8 }, (_, i) => String(i + 1));

  address = '';
  numKids = '';
  arrivalTime = '';
  hoursBooked = '';
  theme = '';
  bdayKidName = '';
  kidsAgeRange = '';
  allergies = '';
  comments = '';

  submitting = signal(false);
  success = signal(false);
  error = signal<string | null>(null);

  constructor(
    private route: ActivatedRoute,
    private bookingService: BookingService,
    private eventTypeService: EventTypeService
  ) {}

  ngOnInit() {
    this.bookingId = this.route.snapshot.paramMap.get('id') || '';
    this.standalone = !this.bookingId;

    const q = this.route.snapshot.queryParamMap;
    this.clientName = q.get('name') || '';
    this.eventDate = q.get('date') || '';
    this.address = q.get('address') || '';
    this.numKids = q.get('kids') || '';
    this.isPrivate = (q.get('service') || '').toLowerCase().includes('private');

    if (this.standalone) {
      this.eventTypeService.getAll().subscribe(types => {
        this.eventTypes.set(types);
        if (types.length > 0 && !types.some(t => t.value === this.serviceType)) {
          this.serviceType = types[0].value;
        }
      });
    }
  }

  showBdayKid(): boolean {
    return this.standalone ? this.serviceType.toLowerCase().includes('private') : this.isPrivate;
  }

  canSubmit(): boolean {
    if (!this.address.trim()) return false;
    if (this.standalone) {
      return !!(this.clientName.trim() && this.clientEmail.trim() && this.eventDate && this.startTime && this.hoursCount);
    }
    return !!this.bookingId;
  }

  submit() {
    if (!this.canSubmit()) return;

    this.submitting.set(true);
    this.error.set(null);

    if (this.standalone) {
      this.bookingService.createConfirmed({
        client_name: this.clientName.trim(),
        client_email: this.clientEmail.trim(),
        client_phone: this.clientPhone.trim() || undefined,
        service_type: this.serviceType,
        date: this.eventDate,
        start_time: this.startTime,
        hours: this.hoursCount,
        address: this.address.trim(),
        theme: this.theme.trim() || undefined,
        bday_kid_name: this.bdayKidName.trim() || undefined,
        kids_age_range: this.kidsAgeRange.trim() || undefined,
        allergies: this.allergies.trim() || undefined,
        comments: this.comments.trim() || undefined,
        num_kids: this.numKids.trim() || undefined,
      }).subscribe({
        next: () => {
          this.success.set(true);
          this.submitting.set(false);
        },
        error: (err) => {
          this.error.set(err.error?.error || 'Something went wrong. Please try again.');
          this.submitting.set(false);
        }
      });
      return;
    }

    this.bookingService.submitConfirmation(this.bookingId, {
      address: this.address.trim(),
      theme: this.theme.trim() || undefined,
      bday_kid_name: this.bdayKidName.trim() || undefined,
      kids_age_range: this.kidsAgeRange.trim() || undefined,
      allergies: this.allergies.trim() || undefined,
      comments: this.comments.trim() || undefined,
      num_kids: this.numKids.trim() || undefined,
      arrival_time: this.arrivalTime.trim() || undefined,
      hours_booked: this.hoursBooked.trim() || undefined,
    }).subscribe({
      next: () => {
        this.success.set(true);
        this.submitting.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Something went wrong. Please try again.');
        this.submitting.set(false);
      }
    });
  }
}
