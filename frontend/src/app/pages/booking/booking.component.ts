import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './booking.component.html',
  styleUrl: './booking.component.scss'
})
export class BookingComponent implements OnInit {
  form: FormGroup;

  currentMonth = signal(new Date());
  selectedDate = signal<Date | null>(null);
  selectedTimeSlot = signal<string | null>(null);
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

  timeSlots = [
    { start: '09:00', end: '11:00', label: '9:00 AM — 11:00 AM' },
    { start: '11:00', end: '13:00', label: '11:00 AM — 1:00 PM' },
    { start: '13:00', end: '15:00', label: '1:00 PM — 3:00 PM' },
    { start: '14:30', end: '16:00', label: '2:30 PM — 4:00 PM' },
    { start: '16:00', end: '18:00', label: '4:00 PM — 6:00 PM' },
  ];

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
  }

  selectTimeSlot(slot: string) {
    this.selectedTimeSlot.set(slot);
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
    if (this.form.invalid || !this.selectedDate() || !this.selectedTimeSlot()) return;

    const slot = this.timeSlots.find(s => `${s.start}-${s.end}` === this.selectedTimeSlot());
    if (!slot) return;

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
