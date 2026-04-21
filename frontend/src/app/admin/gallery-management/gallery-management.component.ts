import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { GalleryService, GalleryItem } from '../../core/services/gallery.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-gallery-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './gallery-management.component.html',
  styleUrl: './gallery-management.component.scss'
})
export class GalleryManagementComponent implements OnInit {
  items = signal<GalleryItem[]>([]);
  uploading = signal(false);
  title = '';
  category = 'editorial';
  selectedFile: File | null = null;

  categories = [
    { value: 'private_events', label: 'Private Events' },
    { value: 'editorial', label: 'Editorial' },
    { value: 'bridal', label: 'Bridal' },
    { value: 'other', label: 'Other' },
  ];

  constructor(private galleryService: GalleryService, private authService: AuthService) {}

  ngOnInit() {
    this.loadGallery();
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

  logout() {
    this.authService.logout();
  }
}
