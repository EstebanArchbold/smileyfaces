import { Component, effect } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { filter, map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, FooterComponent],
  template: `
    @if (!isAdminRoute()) {
      <app-navbar />
    }
    <router-outlet />
    @if (!isAdminRoute()) {
      <app-footer />
    }
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }
  `]
})
export class AppComponent {
  isAdminRoute = toSignal(
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map((event) => (event as NavigationEnd).url.startsWith('/admin'))
    ),
    { initialValue: false }
  );

  constructor(private router: Router) {
    // Swap the PWA manifest on admin routes so "Add to Home Screen" from
    // /admin/* installs an app that opens the admin (start_url /admin)
    // instead of the public home.
    effect(() => {
      const admin = this.isAdminRoute();
      const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
      if (manifest) manifest.href = admin ? 'manifest-admin.webmanifest' : 'manifest.webmanifest';
      const iosTitle = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');
      if (iosTitle) iosTitle.content = admin ? 'SF Admin' : 'Smiley Faces';
    });
  }
}
