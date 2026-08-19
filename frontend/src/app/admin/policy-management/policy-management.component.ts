import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../core/services/settings.service';
import { POLICY_FIELDS, POLICY_GROUPS, POLICY_MAX_WORDS, PolicyField } from '../../core/services/policy-content';

@Component({
  selector: 'app-policy-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './policy-management.component.html',
  styleUrl: './policy-management.component.scss'
})
export class PolicyManagementComponent implements OnInit {
  readonly groups = POLICY_GROUPS;

  content: Record<string, string> = {};

  saving = signal(false);
  saved = signal(false);
  error = signal<string | null>(null);

  constructor(private settingsService: SettingsService) {}

  ngOnInit() {
    this.settingsService.get().subscribe(settings => this.applySettings(settings));
  }

  fieldsOf(group: string): PolicyField[] {
    return POLICY_FIELDS.filter(f => f.group === group);
  }

  wordCount(text: string): number {
    return (text || '').trim().split(/\s+/).filter(Boolean).length;
  }

  limitOf(field: PolicyField): number {
    return field.maxWords ?? POLICY_MAX_WORDS;
  }

  overLimit(field: PolicyField): boolean {
    return this.wordCount(this.content[field.key]) > this.limitOf(field);
  }

  save() {
    this.error.set(null);
    for (const field of POLICY_FIELDS) {
      if (this.overLimit(field)) {
        this.error.set(`"${field.label}" exceeds the ${this.limitOf(field)}-word limit.`);
        return;
      }
    }

    const payload: Record<string, string> = {};
    for (const field of POLICY_FIELDS) {
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
        this.error.set(err.error?.error || 'Failed to save the Policies page.');
      },
    });
  }

  private applySettings(settings: Record<string, string | undefined>) {
    for (const field of POLICY_FIELDS) {
      // Falls back to the shipped copy so the box shows what a visitor sees now.
      this.content[field.key] = settings[field.key] || field.default;
    }
  }
}
