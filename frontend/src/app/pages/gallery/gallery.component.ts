import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalleryService, GalleryItem } from '../../core/services/gallery.service';
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

  categories = [
    { value: 'all', label: 'All' },
    { value: 'private_events', label: 'Private Events' },
    { value: 'editorial', label: 'Editorial' },
    { value: 'bridal', label: 'Bridal' },
  ];

  constructor(private galleryService: GalleryService) {}

  ngOnInit() {
    this.loadGallery();
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
