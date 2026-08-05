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
    path: 'services/:slug',
    loadComponent: () => import('./pages/service/service.component').then(m => m.ServiceComponent),
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
    path: 'policy',
    loadComponent: () => import('./pages/policy/policy.component').then(m => m.PolicyComponent),
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
    path: 'review/:id',
    loadComponent: () => import('./pages/review/review.component').then(m => m.ReviewComponent),
  },
  {
    path: 'review',
    loadComponent: () => import('./pages/review/review.component').then(m => m.ReviewComponent),
  },
  {
    path: 'admin/login',
    loadComponent: () => import('./admin/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./admin/layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./admin/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'bookings',
        loadComponent: () => import('./admin/bookings-management/bookings-management.component').then(m => m.BookingsManagementComponent),
      },
      {
        path: 'gallery',
        loadComponent: () => import('./admin/gallery-management/gallery-management.component').then(m => m.GalleryManagementComponent),
      },
      {
        path: 'services',
        loadComponent: () => import('./admin/services-management/services-management.component').then(m => m.ServicesManagementComponent),
      },
      {
        path: 'about',
        loadComponent: () => import('./admin/about-management/about-management.component').then(m => m.AboutManagementComponent),
      },
      {
        path: 'settings',
        loadComponent: () => import('./admin/settings/settings.component').then(m => m.SettingsComponent),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
