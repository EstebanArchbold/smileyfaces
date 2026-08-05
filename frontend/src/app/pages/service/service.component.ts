import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { GalleryService, GalleryItem } from '../../core/services/gallery.service';
import { SettingsService } from '../../core/services/settings.service';
import { LightboxComponent } from '../../shared/components/lightbox/lightbox.component';
import { BookingSectionComponent } from '../home/booking-section/booking-section.component';
import { ServiceDef, findService, serviceSettingKey } from '../../core/services/service-catalog';

@Component({
  selector: 'app-service',
  standalone: true,
  imports: [CommonModule, LightboxComponent, BookingSectionComponent],
  templateUrl: './service.component.html',
  styleUrl: './service.component.scss'
})
export class ServiceComponent implements OnInit {
  service = signal<ServiceDef | null>(null);

  title = signal('');
  subtitle = signal('');
  cta = signal('');
  badge = signal('');
  galleryTitle = signal('');
  galleryDescription = signal('');
  image = signal<string | null>(null);

  titleLines = computed(() => this.title().split('\n').filter(l => l.trim()));

  items = signal<GalleryItem[]>([]);
  lightboxVisible = signal(false);
  lightboxIndex = signal(0);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private galleryService: GalleryService,
    private settingsService: SettingsService
  ) {}

  ngOnInit() {
    // Switching tabs in the Services dropdown reuses this component, so the slug
    // is read from the stream rather than once from the snapshot.
    this.route.paramMap.subscribe(params => {
      const service = findService(params.get('slug'));
      if (!service) {
        this.router.navigate(['/']);
        return;
      }
      this.service.set(service);
      this.applyDefaults(service);
      this.loadContent(service);
      this.loadGallery(service);
      window.scrollTo({ top: 0 });
    });
  }

  scrollToBooking() {
    document.getElementById('service-booking')?.scrollIntoView({ behavior: 'smooth' });
  }

  openLightbox(index: number) {
    this.lightboxIndex.set(index);
    this.lightboxVisible.set(true);
  }

  closeLightbox() {
    this.lightboxVisible.set(false);
  }

  get imageUrls(): string[] {
    return this.items().map(item => item.image_path);
  }

  // Shown right away so the page never flashes empty while /settings loads.
  private applyDefaults(service: ServiceDef) {
    this.title.set(service.defaults.title);
    this.subtitle.set(service.defaults.subtitle);
    this.cta.set(service.defaults.cta);
    this.badge.set(service.defaults.badge);
    this.galleryTitle.set(service.defaults.gallery_title);
    this.galleryDescription.set(service.defaults.gallery_description);
    this.image.set(null);
  }

  private loadContent(service: ServiceDef) {
    this.settingsService.get().subscribe(settings => {
      const value = (field: string) => settings[serviceSettingKey(service.slug, field)];
      if (value('title')) this.title.set(value('title')!);
      if (value('subtitle')) this.subtitle.set(value('subtitle')!);
      if (value('cta')) this.cta.set(value('cta')!);
      if (value('badge')) this.badge.set(value('badge')!);
      if (value('gallery_title')) this.galleryTitle.set(value('gallery_title')!);
      if (value('gallery_description')) this.galleryDescription.set(value('gallery_description')!);
      this.image.set(value('image') || null);
    });
  }

  private loadGallery(service: ServiceDef) {
    this.items.set([]);
    this.galleryService.getByService(service.slug).subscribe(items => this.items.set(items));
  }
}
