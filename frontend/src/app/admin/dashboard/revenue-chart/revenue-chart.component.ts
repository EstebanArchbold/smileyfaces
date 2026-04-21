import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

@Component({
  selector: 'app-revenue-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  template: `
    <div class="chart-card">
      <h3 class="title-lg">Revenue Over Time</h3>
      <div class="chart-wrapper">
        <canvas baseChart
          [data]="chartData"
          [options]="chartOptions"
          [type]="'line'">
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
export class RevenueChartComponent implements OnChanges {
  @Input() data: { month: string; revenue: number }[] = [];

  chartData: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [] };

  chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: '#5c3d47',
          callback: (value) => `$${value}`,
        },
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
        data: this.data.map(d => d.revenue),
        borderColor: '#215441',
        backgroundColor: 'rgba(33, 84, 65, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#215441',
        pointRadius: 4,
        pointHoverRadius: 6,
      }],
    };
  }
}
