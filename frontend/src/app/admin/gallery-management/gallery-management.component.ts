import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GalleryService, GalleryItem } from '../../core/services/gallery.service';
import { EventTypeService } from '../../core/services/event-type.service';
import { compressImage } from '../../core/utils/image.util';

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

  // Edit modal
  editItem = signal<GalleryItem | null>(null);
  editTitle = '';
  editCategory = '';
  editFile: File | null = null;
  editSaving = signal(false);
  editError = signal<string | null>(null);

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

  openEdit(item: GalleryItem) {
    this.editItem.set(item);
    this.editTitle = item.title || '';
    this.editCategory = item.category;
    this.editFile = null;
    this.editError.set(null);
  }

  closeEdit() {
    this.editItem.set(null);
    this.editFile = null;
  }

  onEditFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.editFile = input.files && input.files.length > 0 ? input.files[0] : null;
  }

  async saveEdit() {
    const item = this.editItem();
    if (!item) return;

    this.editSaving.set(true);
    this.editError.set(null);

    const formData = new FormData();
    formData.append('title', this.editTitle);
    formData.append('category', this.editCategory);

    // Only sent when the admin picked a replacement; otherwise the image stays
    if (this.editFile) {
      try {
        formData.append('image', await compressImage(this.editFile));
      } catch {
        this.editError.set('Could not read that image. Please try another file.');
        this.editSaving.set(false);
        return;
      }
    }

    this.galleryService.update(item.id, formData).subscribe({
      next: updated => {
        this.items.update(items => items.map(i => (i.id === updated.id ? updated : i)));
        this.editSaving.set(false);
        this.closeEdit();
      },
      error: err => {
        this.editError.set(err.error?.error || 'Could not save the changes. Please try again.');
        this.editSaving.set(false);
      },
    });
  }
}
