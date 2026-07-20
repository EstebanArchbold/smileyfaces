import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookingService, BookingStats } from '../../core/services/booking.service';
import { BookingsChartComponent } from './bookings-chart/bookings-chart.component';
import { RevenueChartComponent } from './revenue-chart/revenue-chart.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, BookingsChartComponent, RevenueChartComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  stats = signal<BookingStats | null>(null);

  constructor(private bookingService: BookingService) {}

  ngOnInit() {
    this.bookingService.getStats().subscribe(stats => {
      this.stats.set(stats);
    });
  }
}
