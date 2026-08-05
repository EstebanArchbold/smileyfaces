import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SettingsService } from '../../core/services/settings.service';
import { GalleryService } from '../../core/services/gallery.service';
import { compressImage } from '../../core/utils/image.util';
import { SERVICES, ServiceDef, serviceSettingKey } from '../../core/services/service-catalog';

const MAX_WORDS = 50;

interface ServiceField {
  key: string;
  label: string;
  hint?: string;
  multiline?: boolean;
}

// Same shape for all three pages, so the editor is one form repeated per service.
const SERVICE_FIELDS: ServiceField[] = [
  { key: 'title', label: 'Page Title', hint: 'One line per row — the second line is shown in green.', multiline: true },
  { key: 'subtitle', label: 'Subtitle', multiline: true },
  { key: 'cta', label: 'Button Text' },
  { key: 'badge', label: 'Badge Text' },
  { key: 'gallery_title', label: 'Gallery Title' },
  { key: 'gallery_description', label: 'Gallery Description', multiline: true },
];

@Component({
  selector: 'app-services-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './services-management.component.html',
  styleUrl: './services-management.component.scss'
})
export class ServicesManagementComponent implements OnInit {
  readonly services = SERVICES;
  readonly fields = SERVICE_FIELDS;

  activeSlug = signal(SERVICES[0].slug);

  // Keyed by settings key, e.g. content['service_body_art_title']
  content: Record<string, string> = {};
  images = signal<Record<string, string | null>>({});
  photoCounts = signal<Record<string, number>>({});

  saving = signal(false);
  saved = signal(false);
  error = signal<string | null>(null);

  imageFile: File | null = null;
  imagePreview = signal<string | null>(null);
  imageUploading = signal(false);
  imageError = signal<string | null>(null);

  constructor(
    private settingsService: SettingsService,
    private galleryService: GalleryService
  ) {}

  ngOnInit() {
    this.settingsService.get().subscribe(settings => this.applySettings(settings));
    this.loadPhotoCounts();
  }

  get activeService(): ServiceDef {
    return this.services.find(s => s.slug === this.activeSlug()) || this.services[0];
  }

  selectService(slug: string) {
    this.activeSlug.set(slug);
    this.imageFile = null;
    this.imagePreview.set(null);
    this.imageError.set(null);
    this.error.set(null);
  }

  key(field: string): string {
    return serviceSettingKey(this.activeSlug(), field);
  }

  activeImage(): string | null {
    return this.images()[this.activeSlug()] || null;
  }

  photoCount(slug: string): number {
    return this.photoCounts()[slug] || 0;
  }

  wordCount(text: string): number {
    return (text || '').trim().split(/\s+/).filter(Boolean).length;
  }

  overLimit(text: string): boolean {
    return this.wordCount(text) > MAX_WORDS;
  }

  save() {
    this.error.set(null);
    for (const field of this.fields) {
      if (this.overLimit(this.content[this.key(field.key)])) {
        this.error.set(`"${field.label}" exceeds the ${MAX_WORDS}-word limit.`);
        return;
      }
    }

    // Only this service's keys are sent, so an unsaved edit on another tab can
    // never be written by accident.
    const payload: Record<string, string> = {};
    for (const field of this.fields) {
      payload[this.key(field.key)] = this.content[this.key(field.key)] || '';
    }

    this.saving.set(true);
    this.saved.set(false);
    this.settingsService.update(payload).subscribe({
      next: settings => {
        this.applySettings(settings);
        this.saving.set(false);
        this.saved.set(true);
        setTimeout(() => this.saved.set(false), 3000);
      },
      error: err => {
        this.saving.set(false);
        this.error.set(err.error?.error || 'Failed to save the service content.');
      },
    });
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.imageFile = input.files[0];
      const reader = new FileReader();
      reader.onload = () => this.imagePreview.set(reader.result as string);
      reader.readAsDataURL(this.imageFile);
    }
  }

  async uploadImage() {
    if (!this.imageFile) return;
    this.imageUploading.set(true);
    this.imageError.set(null);

    const slug = this.activeSlug();
    const file = await compressImage(this.imageFile);
    this.settingsService.uploadServiceImage(slug, file).subscribe({
      next: settings => {
        this.applySettings(settings);
        this.imageFile = null;
        this.imagePreview.set(null);
        this.imageUploading.set(false);
      },
      error: err => {
        this.imageUploading.set(false);
        this.imageError.set(this.uploadErrorMessage(err));
      },
    });
  }

  private applySettings(settings: Record<string, string | undefined>) {
    const images: Record<string, string | null> = {};
    for (const service of this.services) {
      for (const field of this.fields) {
        const key = serviceSettingKey(service.slug, field.key);
        // Fall back to the live default so the box shows the text a visitor
        // currently sees instead of looking blank.
        const fallback = service.defaults[field.key as keyof ServiceDef['defaults']];
        this.content[key] = settings[key] || fallback || '';
      }
      images[service.slug] = settings[serviceSettingKey(service.slug, 'image')] || null;
    }
    this.images.set(images);
  }

  private loadPhotoCounts() {
    for (const service of this.services) {
      this.galleryService.getByService(service.slug).subscribe(items => {
        this.photoCounts.update(counts => ({ ...counts, [service.slug]: items.length }));
      });
    }
  }

  private uploadErrorMessage(err: unknown): string {
    const e = err as { status?: number; error?: { error?: string } };
    if (e?.error?.error) return e.error.error;
    if (e?.status === 413) return 'Image is too large. Please try a smaller photo.';
    if (e?.status === 401 || e?.status === 403) return 'Your session expired. Please log in again.';
    return 'Upload failed. Please try again.';
  }
}
