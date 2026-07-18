import { Component, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SettingsService } from '../../../core/services/settings.service';

@Component({
  selector: 'app-hero-section',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './hero-section.component.html',
  styleUrl: './hero-section.component.scss'
})
export class HeroSectionComponent implements OnInit {
  title = signal('Artistry\nBeyond\nPaint');
  subtitle = signal('Curated face couture for the modern celebration. Transforming every occasion into a living canvas of elegance.');
  cta = signal('Reserve Your Glow');
  badge = signal('Smiley Faces Artistry');
  image = signal<string | null>(null);

  titleLines = computed(() => this.title().split('\n').filter(l => l.trim()));

  constructor(private settingsService: SettingsService) {}

  ngOnInit() {
    this.settingsService.get().subscribe(settings => {
      if (settings.hero_title) this.title.set(settings.hero_title);
      if (settings.hero_subtitle) this.subtitle.set(settings.hero_subtitle);
      if (settings.hero_cta) this.cta.set(settings.hero_cta);
      if (settings.hero_badge) this.badge.set(settings.hero_badge);
      if (settings.hero_image) this.image.set(settings.hero_image);
    });
  }
}
