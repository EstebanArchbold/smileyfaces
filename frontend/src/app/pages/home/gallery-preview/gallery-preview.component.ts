import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GalleryService, GalleryItem } from '../../../core/services/gallery.service';

@Component({
  selector: 'app-gallery-preview',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './gallery-preview.component.html',
  styleUrl: './gallery-preview.component.scss'
})
export class GalleryPreviewComponent implements OnInit {
  items = signal<GalleryItem[]>([]);

  constructor(private galleryService: GalleryService) {}

  ngOnInit() {
    this.galleryService.getAll().subscribe(items => {
      this.items.set(items.slice(0, 6));
    });
  }
}
