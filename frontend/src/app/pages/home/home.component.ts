import { Component } from '@angular/core';
import { HeroSectionComponent } from './hero-section/hero-section.component';
import { GalleryPreviewComponent } from './gallery-preview/gallery-preview.component';
import { BookingSectionComponent } from './booking-section/booking-section.component';
import { TestimonialsSectionComponent } from './testimonials-section/testimonials-section.component';
import { QuoteSectionComponent } from './quote-section/quote-section.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [HeroSectionComponent, GalleryPreviewComponent, BookingSectionComponent, TestimonialsSectionComponent, QuoteSectionComponent],
  template: `
    <app-hero-section />
    <app-gallery-preview />
    <app-booking-section />
    <app-testimonials-section />
    <app-quote-section />
  `
})
export class HomeComponent {}
