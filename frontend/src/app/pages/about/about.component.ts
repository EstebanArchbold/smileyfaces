import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SettingsService } from '../../core/services/settings.service';
import { aboutDefaults } from '../../core/services/about-content';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss'
})
export class AboutComponent implements OnInit {
  image = signal<string | null>(null);

  // Starts on the shipped copy so the page never renders blank while /settings
  // is in flight, then whatever the admin saved replaces it.
  content = signal<Record<string, string>>(aboutDefaults());

  titleLines = computed(() => this.text('about_title').split('\n').filter(l => l.trim()));

  constructor(private settingsService: SettingsService) {}

  ngOnInit() {
    this.settingsService.get().subscribe(settings => {
      if (settings.about_image) this.image.set(settings.about_image);

      const merged = aboutDefaults();
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
