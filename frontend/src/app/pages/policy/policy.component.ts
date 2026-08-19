import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SettingsService } from '../../core/services/settings.service';
import { policyDefaults } from '../../core/services/policy-content';

const BLOCK_COUNT = 5;

@Component({
  selector: 'app-policy',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './policy.component.html',
  styleUrl: './policy.component.scss'
})
export class PolicyComponent implements OnInit {
  // Starts on the shipped copy so the page never renders blank while /settings
  // is in flight, then whatever the admin saved replaces it.
  content = signal<Record<string, string>>(policyDefaults());

  blocks = computed(() =>
    Array.from({ length: BLOCK_COUNT }, (_, i) => ({
      title: this.text(`policy_block${i + 1}_title`),
      text: this.text(`policy_block${i + 1}_text`),
    })).filter(block => block.title || block.text)
  );

  constructor(private settingsService: SettingsService) {}

  ngOnInit() {
    this.settingsService.get().subscribe(settings => {
      const merged = policyDefaults();
      for (const key of Object.keys(merged)) {
        if (settings[key]) merged[key] = settings[key]!;
      }
      this.content.set(merged);
    });
  }

  text(key: string): string {
    return this.content()[key] || '';
  }
}
