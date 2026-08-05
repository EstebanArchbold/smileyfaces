import { Component, signal, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SERVICES } from '../../../core/services/service-catalog';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  menuOpen = signal(false);
  servicesOpen = signal(false);
  scrolled = signal(false);

  readonly services = SERVICES;

  constructor(private host: ElementRef<HTMLElement>) {}

  @HostListener('window:scroll')
  onScroll() {
    this.scrolled.set(window.scrollY > 20);
  }

  // Clicking anywhere else closes the dropdown — without this it stayed open
  // while the visitor was already reading the page behind it.
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.servicesOpen() && !this.host.nativeElement.contains(event.target as Node)) {
      this.servicesOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.servicesOpen.set(false);
  }

  toggleMenu() {
    this.menuOpen.update(v => !v);
    if (!this.menuOpen()) this.servicesOpen.set(false);
  }

  toggleServices(event: Event) {
    event.stopPropagation();
    this.servicesOpen.update(v => !v);
  }

  closeMenu() {
    this.menuOpen.set(false);
    this.servicesOpen.set(false);
  }
}
