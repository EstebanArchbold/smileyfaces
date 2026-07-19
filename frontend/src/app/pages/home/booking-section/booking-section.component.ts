import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { EventTypeService, EventType } from '../../../core/services/event-type.service';

interface CalendarDay {
  day: number;
  currentMonth: boolean;
  date: Date;
}

@Component({
  selector: 'app-booking-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './booking-section.component.html',
  styleUrl: './booking-section.component.scss'
})
export class BookingSectionComponent implements OnInit {
  eventTypes = signal<EventType[]>([]);
  selectedType = signal<string | null>(null);
  selectedDay = signal<Date | null>(null);
  currentMonth = signal(new Date());

  dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  calendarDays = computed(() => this.generateCalendar(this.currentMonth()));

  monthLabel = computed(() => {
    const d = this.currentMonth();
    return d.toLocaleString('default', { month: 'long', year: 'numeric' });
  });

  constructor(private eventTypeService: EventTypeService, private router: Router) {}

  ngOnInit() {
    this.eventTypeService.getAll().subscribe(types => {
      this.eventTypes.set(types);
      if (types.length > 0) this.selectedType.set(types[0].value);
    });
  }

  selectType(value: string) {
    this.selectedType.set(value);
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
    return day.date.toDateString() === new Date().toDateString();
  }

  isPast(day: CalendarDay): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return day.date < today;
  }

  selectDay(day: CalendarDay) {
    if (!day.currentMonth || this.isPast(day)) return;
    this.selectedDay.set(day.date);
  }

  isSelected(day: CalendarDay): boolean {
    const sel = this.selectedDay();
    return sel !== null && day.date.toDateString() === sel.toDateString();
  }

  selectedDayLabel(): string {
    const d = this.selectedDay();
    if (!d) return 'Tap a date to start your booking';
    return d.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' });
  }

  // The confirm button carries the chosen event type and day into the booking flow
  confirm() {
    const params: Record<string, string> = {};
    const type = this.selectedType();
    if (type) params['service'] = type;
    const d = this.selectedDay();
    if (d) params['date'] = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    this.router.navigate(['/booking'], { queryParams: params });
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
