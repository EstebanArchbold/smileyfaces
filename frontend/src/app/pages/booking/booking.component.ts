import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BookingService, CreateBookingDto } from '../../core/services/booking.service';
import { EventTypeService } from '../../core/services/event-type.service';

interface CalendarDay {
  day: number;
  currentMonth: boolean;
  date: Date;
}

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './booking.component.html',
  styleUrl: './booking.component.scss'
})
export class BookingComponent implements OnInit, OnDestroy {
  form: FormGroup;
  private availabilityPoll: ReturnType<typeof setInterval> | null = null;

  currentMonth = signal(new Date());
  selectedDate = signal<Date | null>(null);
  // Range selection: first click sets the start hour, second click extends to the end hour
  rangeStart = signal<number | null>(null);
  rangeEnd = signal<number | null>(null);
  selectedService = signal<string>('private_events');
  submitting = signal(false);
  success = signal(false);
  error = signal<string | null>(null);

  services = signal<{ value: string; label: string; icon: string }[]>([
    { value: 'private_events', label: 'Private Events', icon: 'celebration' },
    { value: 'editorial_glow', label: 'Editorial Glow', icon: 'auto_awesome' },
    { value: 'bridal', label: 'Bridal', icon: 'favorite' },
    { value: 'other', label: 'Other', icon: 'palette' },
  ]);

  // 1-hour slots from 8 AM to 10 PM
  timeSlots = Array.from({ length: 14 }, (_, i) => {
    const h = 8 + i;
    const fmt = (hour: number) => {
      const period = hour >= 12 ? 'PM' : 'AM';
      const h12 = hour % 12 === 0 ? 12 : hour % 12;
      return `${h12}:00 ${period}`;
    };
    const pad = (hour: number) => String(hour).padStart(2, '0');
    return { start: `${pad(h)}:00`, end: `${pad(h + 1)}:00`, label: `${fmt(h)} — ${fmt(h + 1)}` };
  });

  blockedRanges = signal<{ start: number; end: number }[]>([]);

  // Blocked hours are hidden from the list entirely; `i` keeps the absolute index
  visibleSlots = computed(() =>
    this.timeSlots
      .map((slot, i) => ({ slot, i }))
      .filter(x => !this.isBlockedByRanges(x.slot, this.blockedRanges()))
  );

  dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  calendarDays = computed(() => this.generateCalendar(this.currentMonth()));

  monthLabel = computed(() => {
    const d = this.currentMonth();
    return d.toLocaleString('default', { month: 'long', year: 'numeric' });
  });

  constructor(private fb: FormBuilder, private bookingService: BookingService, private eventTypeService: EventTypeService) {
    this.form = this.fb.group({
      client_name: ['', Validators.required],
      client_email: ['', [Validators.required, Validators.email]],
      client_phone: [''],
      address: [''],
      num_kids: [''],
      duration: [''],
      notes: [''],
    });
  }

  ngOnInit() {
    this.eventTypeService.getAll().subscribe(types => {
      if (types.length === 0) return;
      this.services.set(types.map(t => ({ value: t.value, label: t.label, icon: t.icon || 'palette' })));
      if (!types.some(t => t.value === this.selectedService())) {
        this.selectedService.set(types[0].value);
      }
    });
  }

  selectService(value: string) {
    this.selectedService.set(value);
  }

  selectDate(day: CalendarDay) {
    if (!day.currentMonth) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (day.date < today) return;
    this.selectedDate.set(day.date);
    this.blockedRanges.set([]);
    this.loadAvailability(day.date);
    this.startAvailabilityPolling();
  }

  // Near-realtime: while a date is selected, refresh availability every 15s so
  // slots confirmed by the admin disappear without a page reload
  private startAvailabilityPolling() {
    this.stopAvailabilityPolling();
    this.availabilityPoll = setInterval(() => {
      const date = this.selectedDate();
      if (date) this.loadAvailability(date);
    }, 15000);
  }

  private stopAvailabilityPolling() {
    if (this.availabilityPoll) {
      clearInterval(this.availabilityPoll);
      this.availabilityPoll = null;
    }
  }

  ngOnDestroy() {
    this.stopAvailabilityPolling();
  }

  private loadAvailability(date: Date) {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    this.bookingService.getAvailability(dateStr).subscribe(res => {
      this.blockedRanges.set(res.blocked);
      const s = this.rangeStart();
      const e = this.rangeEnd();
      if (s !== null && e !== null) {
        for (let i = s; i <= e; i++) {
          if (this.isSlotBlocked(this.timeSlots[i])) {
            this.rangeStart.set(null);
            this.rangeEnd.set(null);
            break;
          }
        }
      }
    });
  }

  isSlotBlocked(slot: { start: string; end: string }): boolean {
    return this.isBlockedByRanges(slot, this.blockedRanges());
  }

  private isBlockedByRanges(slot: { start: string; end: string }, ranges: { start: number; end: number }[]): boolean {
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + (m || 0);
    };
    const s = toMin(slot.start);
    const e = toMin(slot.end);
    return ranges.some(r => s < r.end && e > r.start);
  }

  selectTimeSlot(index: number) {
    if (this.isSlotBlocked(this.timeSlots[index])) return;

    const s = this.rangeStart();
    const e = this.rangeEnd();

    // No selection yet, or a finished range: start over at the clicked hour
    if (s === null || e === null || e !== s) {
      this.rangeStart.set(index);
      this.rangeEnd.set(index);
      return;
    }

    // A single hour is selected: clicking a later hour extends the range
    // as long as every hour in between is available
    if (index > s) {
      for (let i = s + 1; i <= index; i++) {
        if (this.isSlotBlocked(this.timeSlots[i])) {
          this.rangeStart.set(index);
          this.rangeEnd.set(index);
          return;
        }
      }
      this.rangeEnd.set(index);
    } else {
      this.rangeStart.set(index);
      this.rangeEnd.set(index);
    }
  }

  inRange(index: number): boolean {
    const s = this.rangeStart();
    const e = this.rangeEnd();
    return s !== null && e !== null && index >= s && index <= e;
  }

  hasSelection(): boolean {
    return this.rangeStart() !== null;
  }

  selectionSummary(): string {
    const s = this.rangeStart();
    const e = this.rangeEnd();
    if (s === null || e === null) return '';
    const hours = e - s + 1;
    const startLabel = this.timeSlots[s].label.split(' — ')[0];
    const endLabel = this.timeSlots[e].label.split(' — ')[1];
    return `${startLabel} — ${endLabel} (${hours} hour${hours > 1 ? 's' : ''})`;
  }

  prevMonth() {
    const d = new Date(this.currentMonth());
    d.setMonth(d.getMonth() - 1);
    this.currentMonth.set(d);
  }

  nextMonth() {
    const d = new Date(this.currentMonth());
    d.setMonth(d.getMonth() + 1);
    this.currentMonth.set(d);
  }

  isToday(day: CalendarDay): boolean {
    const today = new Date();
    return day.date.toDateString() === today.toDateString();
  }

  isSelected(day: CalendarDay): boolean {
    const sel = this.selectedDate();
    if (!sel) return false;
    return day.date.toDateString() === sel.toDateString();
  }

  isPast(day: CalendarDay): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return day.currentMonth && day.date < today;
  }

  submit() {
    const rs = this.rangeStart();
    const re = this.rangeEnd();
    if (this.form.invalid || !this.selectedDate() || rs === null || re === null) return;

    const slot = { start: this.timeSlots[rs].start, end: this.timeSlots[re].end };

    const date = this.selectedDate()!;
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    const booking: CreateBookingDto = {
      ...this.form.value,
      service_type: this.selectedService(),
      date: dateStr,
      start_time: slot.start,
      end_time: slot.end,
    };

    this.submitting.set(true);
    this.error.set(null);

    this.bookingService.create(booking).subscribe({
      next: () => {
        this.success.set(true);
        this.submitting.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Something went wrong. Please try again.');
        this.submitting.set(false);
        // Slot taken while the user was filling the form: refresh so it disappears
        if (err.status === 409) {
          const date = this.selectedDate();
          if (date) this.loadAvailability(date);
          this.rangeStart.set(null);
          this.rangeEnd.set(null);
        }
      }
    });
  }

  private generateCalendar(date: Date): CalendarDay[] {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const days: CalendarDay[] = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      days.push({ day: d, currentMonth: false, date: new Date(year, month - 1, d) });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, currentMonth: true, date: new Date(year, month, i) });
    }

    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, currentMonth: false, date: new Date(year, month + 1, i) });
    }

    return days;
  }
}
