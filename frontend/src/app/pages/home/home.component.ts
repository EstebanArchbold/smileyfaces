import { Component } from '@angular/core';
import { HeroSectionComponent } from './hero-section/hero-section.component';
import { GalleryPreviewComponent } from './gallery-preview/gallery-preview.component';
import { BookingSectionComponent } from './booking-section/booking-section.component';
import { QuoteSectionComponent } from './quote-section/quote-section.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [HeroSectionComponent, GalleryPreviewComponent, BookingSectionComponent, QuoteSectionComponent],
  template: `
    <app-hero-section />
    <app-gallery-preview />
    <app-booking-section />
    <app-quote-section />
  `
})
export class HomeComponent {}
