import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TestimonialService, Testimonial } from '../../../core/services/testimonial.service';

@Component({
  selector: 'app-testimonials-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './testimonials-section.component.html',
  styleUrl: './testimonials-section.component.scss'
})
export class TestimonialsSectionComponent implements OnInit, OnDestroy {
  items = signal<Testimonial[]>([]);
  current = signal(0);

  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly intervalMs = 6000;

  constructor(private testimonialService: TestimonialService) {}

  ngOnInit() {
    this.testimonialService.getAll().subscribe(items => {
      this.items.set(items);
      this.startAuto();
    });
  }

  ngOnDestroy() {
    this.stopAuto();
  }

  goTo(index: number) {
    this.current.set(index);
    // Restart the timer so a manual pick gets a full interval before moving on.
    this.startAuto();
  }

  private startAuto() {
    this.stopAuto();
    if (this.items().length > 1) {
      this.timer = setInterval(() => {
        this.current.update(i => (i + 1) % this.items().length);
      }, this.intervalMs);
    }
  }

  private stopAuto() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
