import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GalleryService, GalleryItem } from '../../core/services/gallery.service';
import { EventTypeService } from '../../core/services/event-type.service';

@Component({
  selector: 'app-gallery-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gallery-management.component.html',
  styleUrl: './gallery-management.component.scss'
})
export class GalleryManagementComponent implements OnInit {
  items = signal<GalleryItem[]>([]);
  uploading = signal(false);
  title = '';
  category = 'private';
  selectedFile: File | null = null;

  categories = signal<{ value: string; label: string }[]>([]);

  constructor(
    private galleryService: GalleryService,
    private eventTypeService: EventTypeService
  ) {}

  ngOnInit() {
    this.loadGallery();
    this.eventTypeService.getAll().subscribe(types => {
      this.categories.set(types.map(t => ({ value: t.value, label: t.label })));
      if (types.length > 0 && !types.some(t => t.value === this.category)) {
        this.category = types[0].value;
      }
    });
  }

  loadGallery() {
    this.galleryService.getAll().subscribe(items => this.items.set(items));
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  upload() {
    if (!this.selectedFile) return;

    const formData = new FormData();
    formData.append('image', this.selectedFile);
    formData.append('category', this.category);
    if (this.title) formData.append('title', this.title);

    this.uploading.set(true);
    this.galleryService.upload(formData).subscribe({
      next: () => {
        this.loadGallery();
        this.title = '';
        this.selectedFile = null;
        this.uploading.set(false);
      },
      error: () => this.uploading.set(false),
    });
  }

  deleteItem(id: string) {
    this.galleryService.delete(id).subscribe(() => {
      this.items.update(items => items.filter(i => i.id !== id));
    });
  }
}
