import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../core/services/settings.service';
import { compressImage } from '../../core/utils/image.util';
import { ABOUT_FIELDS, ABOUT_GROUPS, AboutField } from '../../core/services/about-content';

const MAX_WORDS = 50;

@Component({
  selector: 'app-about-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './about-management.component.html',
  styleUrl: './about-management.component.scss'
})
export class AboutManagementComponent implements OnInit {
  readonly groups = ABOUT_GROUPS;

  content: Record<string, string> = {};

  saving = signal(false);
  saved = signal(false);
  error = signal<string | null>(null);

  // The About photo lived in Settings; it belongs with the rest of the page.
  aboutImage = signal<string | null>(null);
  imageFile: File | null = null;
  imagePreview = signal<string | null>(null);
  imageUploading = signal(false);
  imageError = signal<string | null>(null);

  constructor(private settingsService: SettingsService) {}

  ngOnInit() {
    this.settingsService.get().subscribe(settings => this.applySettings(settings));
  }

  fieldsOf(group: string): AboutField[] {
    return ABOUT_FIELDS.filter(f => f.group === group);
  }

  wordCount(text: string): number {
    return (text || '').trim().split(/\s+/).filter(Boolean).length;
  }

  overLimit(text: string): boolean {
    return this.wordCount(text) > MAX_WORDS;
  }

  save() {
    this.error.set(null);
    for (const field of ABOUT_FIELDS) {
      if (this.overLimit(this.content[field.key])) {
        this.error.set(`"${field.label}" exceeds the ${MAX_WORDS}-word limit.`);
        return;
      }
    }

    const payload: Record<string, string> = {};
    for (const field of ABOUT_FIELDS) {
      payload[field.key] = this.content[field.key] || '';
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
        this.error.set(err.error?.error || 'Failed to save the About page.');
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

    const file = await compressImage(this.imageFile);
    this.settingsService.uploadAboutImage(file).subscribe({
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
    for (const field of ABOUT_FIELDS) {
      // Falls back to the shipped copy so the box shows what a visitor sees now.
      this.content[field.key] = settings[field.key] || field.default;
    }
    this.aboutImage.set(settings['about_image'] || null);
  }

  private uploadErrorMessage(err: unknown): string {
    const e = err as { status?: number; error?: { error?: string } };
    if (e?.error?.error) return e.error.error;
    if (e?.status === 413) return 'Image is too large. Please try a smaller photo.';
    if (e?.status === 401 || e?.status === 403) return 'Your session expired. Please log in again.';
    return 'Upload failed. Please try again.';
  }
}
