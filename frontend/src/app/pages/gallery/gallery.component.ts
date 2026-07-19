import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalleryService, GalleryItem } from '../../core/services/gallery.service';
import { EventTypeService } from '../../core/services/event-type.service';
import { LightboxComponent } from '../../shared/components/lightbox/lightbox.component';

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [CommonModule, LightboxComponent],
  templateUrl: './gallery.component.html',
  styleUrl: './gallery.component.scss'
})
export class GalleryComponent implements OnInit {
  items = signal<GalleryItem[]>([]);
  activeCategory = signal('all');
  lightboxVisible = signal(false);
  lightboxIndex = signal(0);

  categories = signal<{ value: string; label: string }[]>([{ value: 'all', label: 'All' }]);

  constructor(private galleryService: GalleryService, private eventTypeService: EventTypeService) {}

  ngOnInit() {
    this.loadGallery();
    this.eventTypeService.getAll().subscribe(types => {
      this.categories.set([
        { value: 'all', label: 'All' },
        ...types.map(t => ({ value: t.value, label: t.label })),
      ]);
    });
  }

  filterBy(category: string) {
    this.activeCategory.set(category);
    this.loadGallery();
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

  private loadGallery() {
    this.galleryService.getAll(this.activeCategory()).subscribe(items => {
      this.items.set(items);
    });
  }
}
