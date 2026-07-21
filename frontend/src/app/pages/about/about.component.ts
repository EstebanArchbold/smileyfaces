import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SettingsService } from '../../core/services/settings.service';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss'
})
export class AboutComponent implements OnInit {
  image = signal<string | null>(null);

  constructor(private settingsService: SettingsService) {}

  ngOnInit() {
    this.settingsService.get().subscribe(settings => {
      if (settings.about_image) this.image.set(settings.about_image);
    });
  }
}
