import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BookingService, BookingStats } from '../../core/services/booking.service';
import { AuthService } from '../../core/services/auth.service';
import { BookingsChartComponent } from './bookings-chart/bookings-chart.component';
import { RevenueChartComponent } from './revenue-chart/revenue-chart.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, BookingsChartComponent, RevenueChartComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  stats = signal<BookingStats | null>(null);

  constructor(
    private bookingService: BookingService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.bookingService.getStats().subscribe(stats => {
      this.stats.set(stats);
    });
  }

  logout() {
    this.authService.logout();
  }
}
