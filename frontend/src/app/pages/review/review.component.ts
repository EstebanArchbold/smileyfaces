import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TestimonialService } from '../../core/services/testimonial.service';
import { compressImage } from '../../core/utils/image.util';

const MAX_IMAGES = 5;

interface PendingImage {
  file: File;
  preview: string;
}

@Component({
  selector: 'app-review',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './review.component.html',
  styleUrl: './review.component.scss'
})
export class ReviewComponent implements OnInit {
  // With an id in the URL the review is tied back to that booking (admin-
  // generated link). Without one it still works, just unlinked.
  bookingId = '';

  clientName = '';
  clientEmail = '';
  eventDate = '';
  quote = '';

  images = signal<PendingImage[]>([]);
  readonly maxImages = MAX_IMAGES;

  submitting = signal(false);
  success = signal(false);
  error = signal<string | null>(null);

  constructor(
    private route: ActivatedRoute,
    private testimonialService: TestimonialService
  ) {}

  ngOnInit() {
    this.bookingId = this.route.snapshot.paramMap.get('id') || '';

    const q = this.route.snapshot.queryParamMap;
    this.clientName = q.get('name') || '';
    this.clientEmail = q.get('email') || '';
    this.eventDate = q.get('date') || '';
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    this.error.set(null);
    const room = MAX_IMAGES - this.images().length;
    const picked = Array.from(input.files).slice(0, room);

    if (Array.from(input.files).length > room) {
      this.error.set(`You can attach up to ${MAX_IMAGES} photos.`);
    }

    for (const file of picked) {
      const reader = new FileReader();
      reader.onload = () =>
        this.images.update(list => [...list, { file, preview: reader.result as string }]);
      reader.readAsDataURL(file);
    }

    // Let the same file be picked again after removing it.
    input.value = '';
  }

  removeImage(index: number) {
    this.images.update(list => list.filter((_, i) => i !== index));
  }

  canSubmit(): boolean {
    return !!(this.clientName.trim() && this.quote.trim());
  }

  async submit() {
    if (!this.canSubmit() || this.submitting()) return;

    this.submitting.set(true);
    this.error.set(null);

    const formData = new FormData();
    formData.append('author', this.clientName.trim());
    formData.append('quote', this.quote.trim());
    if (this.clientEmail.trim()) formData.append('client_email', this.clientEmail.trim());
    if (this.bookingId) formData.append('booking_id', this.bookingId);

    try {
      // Phone photos are several MB each; downscaling in the browser keeps the
      // upload from stalling or hitting the proxy's body limit.
      for (const image of this.images()) {
        formData.append('images', await compressImage(image.file));
      }
    } catch {
      this.submitting.set(false);
      this.error.set('One of the photos could not be processed. Please remove it and try again.');
      return;
    }

    this.testimonialService.submit(formData).subscribe({
      next: () => {
        this.success.set(true);
        this.submitting.set(false);
      },
      error: err => {
        this.submitting.set(false);
        this.error.set(this.uploadErrorMessage(err));
      },
    });
  }

  private uploadErrorMessage(err: unknown): string {
    const e = err as { status?: number; error?: { error?: string } };
    if (e?.error?.error) return e.error.error;
    if (e?.status === 413) return 'Those photos are too large. Please try fewer or smaller ones.';
    return 'Something went wrong. Please try again.';
  }
}
