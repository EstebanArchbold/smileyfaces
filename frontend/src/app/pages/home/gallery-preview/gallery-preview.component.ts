import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GalleryService, GalleryItem } from '../../../core/services/gallery.service';
import { SettingsService } from '../../../core/services/settings.service';

@Component({
  selector: 'app-gallery-preview',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './gallery-preview.component.html',
  styleUrl: './gallery-preview.component.scss'
})
export class GalleryPreviewComponent implements OnInit {
  items = signal<GalleryItem[]>([]);
  label = signal('Selected Works');
  title = signal('The Gallery');
  description = signal('A curation of our most sought-after designs, from minimal accents to full-face transformations.');

  constructor(private galleryService: GalleryService, private settingsService: SettingsService) {}

  ngOnInit() {
    this.galleryService.getAll().subscribe(items => {
      this.items.set(items.slice(0, 6));
    });
    this.settingsService.get().subscribe(settings => {
      if (settings.gallery_label) this.label.set(settings.gallery_label);
      if (settings.gallery_title) this.title.set(settings.gallery_title);
      if (settings.gallery_description) this.description.set(settings.gallery_description);
    });
  }
}
