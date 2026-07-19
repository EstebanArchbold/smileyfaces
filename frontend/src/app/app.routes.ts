import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'gallery',
    loadComponent: () => import('./pages/gallery/gallery.component').then(m => m.GalleryComponent),
  },
  {
    path: 'booking',
    loadComponent: () => import('./pages/booking/booking.component').then(m => m.BookingComponent),
  },
  {
    path: 'about',
    loadComponent: () => import('./pages/about/about.component').then(m => m.AboutComponent),
  },
  {
    path: 'confirm/:id',
    loadComponent: () => import('./pages/confirmation/confirmation.component').then(m => m.ConfirmationComponent),
  },
  {
    path: 'confirm',
    loadComponent: () => import('./pages/confirmation/confirmation.component').then(m => m.ConfirmationComponent),
  },
  {
    path: 'admin/login',
    loadComponent: () => import('./admin/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'admin/dashboard',
    canActivate: [adminGuard],
    loadComponent: () => import('./admin/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'admin/bookings',
    canActivate: [adminGuard],
    loadComponent: () => import('./admin/bookings-management/bookings-management.component').then(m => m.BookingsManagementComponent),
  },
  {
    path: 'admin/gallery',
    canActivate: [adminGuard],
    loadComponent: () => import('./admin/gallery-management/gallery-management.component').then(m => m.GalleryManagementComponent),
  },
  {
    path: 'admin/settings',
    canActivate: [adminGuard],
    loadComponent: () => import('./admin/settings/settings.component').then(m => m.SettingsComponent),
  },
  {
    path: 'admin',
    redirectTo: 'admin/dashboard',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
