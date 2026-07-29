import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

@Component({
  selector: 'app-bookings-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  // Declared here rather than in appConfig so Chart.js is bundled with the lazy
  // dashboard chunk instead of the initial bundle every visitor downloads.
  providers: [provideCharts(withDefaultRegisterables())],
  template: `
    <div class="chart-card">
      <h3 class="title-lg">Bookings Over Time</h3>
      <div class="chart-wrapper">
        <canvas baseChart
          [data]="chartData"
          [options]="chartOptions"
          [type]="'bar'">
        </canvas>
      </div>
    </div>
  `,
  styles: [`
    .chart-card {
      background: var(--surface);
      border-radius: 2rem;
      padding: 2rem;
      box-shadow: 0 12px 24px var(--shadow-tint);
      h3 { margin-bottom: 1.5rem; }
    }
    .chart-wrapper { position: relative; height: 280px; }
  `]
})
export class BookingsChartComponent implements OnChanges {
  @Input() data: { month: string; count: number }[] = [];

  chartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };

  chartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1, color: '#5c3d47' },
        grid: { color: 'rgba(48, 17, 27, 0.06)' },
      },
      x: {
        ticks: { color: '#5c3d47' },
        grid: { display: false },
      },
    },
  };

  ngOnChanges() {
    this.chartData = {
      labels: this.data.map(d => {
        const [y, m] = d.month.split('-');
        return new Date(+y, +m - 1).toLocaleString('default', { month: 'short' });
      }),
      datasets: [{
        data: this.data.map(d => d.count),
        backgroundColor: '#e6b1be',
        borderRadius: 8,
        borderSkipped: false,
      }],
    };
  }
}
