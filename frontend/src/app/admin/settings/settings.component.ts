import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SettingsService } from '../../core/services/settings.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent implements OnInit {
  hourlyRate = 80;
  saving = signal(false);
  saved = signal(false);

  constructor(private settingsService: SettingsService, private authService: AuthService) {}

  ngOnInit() {
    this.settingsService.get().subscribe(settings => {
      this.hourlyRate = Number(settings.hourly_rate) || 80;
    });
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

  logout() {
    this.authService.logout();
  }
}
