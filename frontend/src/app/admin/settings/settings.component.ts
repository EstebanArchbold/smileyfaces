import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../core/services/settings.service';
import { EventTypeService, EventType } from '../../core/services/event-type.service';
import { compressImage } from '../../core/utils/image.util';

const MAX_WORDS = 50;

interface ContentField {
  key: string;
  label: string;
  hint?: string;
  multiline?: boolean;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent implements OnInit {
  hourlyRate = 80;
  saving = signal(false);
  saved = signal(false);

  // Site content
  contentFields: ContentField[] = [
    { key: 'hero_title', label: 'Hero Title', hint: 'One line per row — the second line is shown in green.', multiline: true },
    { key: 'hero_subtitle', label: 'Hero Subtitle', multiline: true },
    { key: 'hero_cta', label: 'Hero Button Text' },
    { key: 'hero_badge', label: 'Hero Badge Text' },
    { key: 'gallery_label', label: 'Gallery Small Label' },
    { key: 'gallery_title', label: 'Gallery Title' },
    { key: 'gallery_description', label: 'Gallery Description', multiline: true },
  ];
  content: Record<string, string> = {};
  contentSaving = signal(false);
  contentSaved = signal(false);
  contentError = signal<string | null>(null);

  // Hero image
  heroImage = signal<string | null>(null);
  heroFile: File | null = null;
  heroPreview = signal<string | null>(null);
  heroUploading = signal(false);
  heroError = signal<string | null>(null);

  // About image
  aboutImage = signal<string | null>(null);
  aboutFile: File | null = null;
  aboutPreview = signal<string | null>(null);
  aboutUploading = signal(false);
  aboutError = signal<string | null>(null);

  // Event types
  eventTypes = signal<EventType[]>([]);
  newTypeLabel = '';
  newTypeIcon = 'palette';
  typeSaving = signal(false);
  typeError = signal<string | null>(null);

  calendarConfigured = signal(false);

  constructor(
    private settingsService: SettingsService,
    private eventTypeService: EventTypeService
  ) {}

  ngOnInit() {
    this.settingsService.get().subscribe(settings => this.applySettings(settings));
    this.loadEventTypes();
  }

  private applySettings(settings: Record<string, string | undefined>) {
    this.hourlyRate = Number(settings['hourly_rate']) || 80;
    this.heroImage.set(settings['hero_image'] || null);
    this.aboutImage.set(settings['about_image'] || null);
    this.calendarConfigured.set(settings['google_calendar_configured'] === 'true');
    for (const field of this.contentFields) {
      this.content[field.key] = settings[field.key] || '';
    }
  }

  wordCount(text: string): number {
    return (text || '').trim().split(/\s+/).filter(Boolean).length;
  }

  overLimit(text: string): boolean {
    return this.wordCount(text) > MAX_WORDS;
  }

  save() {
    this.saving.set(true);
    this.saved.set(false);
    this.settingsService.update({ hourly_rate: String(this.hourlyRate) }).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.set(true);
        setTimeout(() => this.saved.set(false), 3000);
      },
      error: () => this.saving.set(false),
    });
  }

  saveContent() {
    this.contentError.set(null);
    for (const field of this.contentFields) {
      if (this.overLimit(this.content[field.key])) {
        this.contentError.set(`"${field.label}" exceeds the ${MAX_WORDS}-word limit.`);
        return;
      }
    }

    this.contentSaving.set(true);
    this.contentSaved.set(false);
    this.settingsService.update({ ...this.content }).subscribe({
      next: settings => {
        this.applySettings(settings);
        this.contentSaving.set(false);
        this.contentSaved.set(true);
        setTimeout(() => this.contentSaved.set(false), 3000);
      },
      error: err => {
        this.contentSaving.set(false);
        this.contentError.set(err.error?.error || 'Failed to save content.');
      },
    });
  }

  onHeroFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.heroFile = input.files[0];
      const reader = new FileReader();
      reader.onload = () => this.heroPreview.set(reader.result as string);
      reader.readAsDataURL(this.heroFile);
    }
  }

  async uploadHeroImage() {
    if (!this.heroFile) return;
    this.heroUploading.set(true);
    this.heroError.set(null);
    const file = await compressImage(this.heroFile);
    this.settingsService.uploadHeroImage(file).subscribe({
      next: settings => {
        this.applySettings(settings);
        this.heroFile = null;
        this.heroPreview.set(null);
        this.heroUploading.set(false);
      },
      error: err => {
        this.heroUploading.set(false);
        this.heroError.set(this.uploadErrorMessage(err));
      },
    });
  }

  onAboutFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.aboutFile = input.files[0];
      const reader = new FileReader();
      reader.onload = () => this.aboutPreview.set(reader.result as string);
      reader.readAsDataURL(this.aboutFile);
    }
  }

  async uploadAboutImage() {
    if (!this.aboutFile) return;
    this.aboutUploading.set(true);
    this.aboutError.set(null);
    const file = await compressImage(this.aboutFile);
    this.settingsService.uploadAboutImage(file).subscribe({
      next: settings => {
        this.applySettings(settings);
        this.aboutFile = null;
        this.aboutPreview.set(null);
        this.aboutUploading.set(false);
      },
      error: err => {
        this.aboutUploading.set(false);
        this.aboutError.set(this.uploadErrorMessage(err));
      },
    });
  }

  private uploadErrorMessage(err: unknown): string {
    const e = err as { status?: number; error?: { error?: string } };
    if (e?.error?.error) return e.error.error;
    if (e?.status === 413) return 'Image is too large. Please try a smaller photo.';
    if (e?.status === 404) return 'Upload endpoint not found — the server may need to be redeployed.';
    if (e?.status === 401 || e?.status === 403) return 'Your session expired. Please log in again.';
    return 'Upload failed. Please try again.';
  }

  loadEventTypes() {
    this.eventTypeService.getAll().subscribe(types => this.eventTypes.set(types));
  }

  addEventType() {
    if (!this.newTypeLabel.trim()) return;
    this.typeSaving.set(true);
    this.typeError.set(null);
    this.eventTypeService.create({ label: this.newTypeLabel.trim(), icon: this.newTypeIcon.trim() || 'palette' }).subscribe({
      next: () => {
        this.newTypeLabel = '';
        this.newTypeIcon = 'palette';
        this.typeSaving.set(false);
        this.loadEventTypes();
      },
      error: err => {
        this.typeSaving.set(false);
        this.typeError.set(err.error?.error || 'Failed to add event type.');
      },
    });
  }

  updateEventType(type: EventType) {
    if (!type.label.trim()) return;
    this.typeError.set(null);
    this.eventTypeService.update(type.id, { label: type.label.trim(), icon: type.icon.trim() || 'palette' }).subscribe({
      next: () => this.loadEventTypes(),
      error: err => this.typeError.set(err.error?.error || 'Failed to update event type.'),
    });
  }

  deleteEventType(type: EventType) {
    this.typeError.set(null);
    this.eventTypeService.delete(type.id).subscribe({
      next: () => this.eventTypes.update(types => types.filter(t => t.id !== type.id)),
      error: err => this.typeError.set(err.error?.error || 'Failed to delete event type.'),
    });
  }
}
