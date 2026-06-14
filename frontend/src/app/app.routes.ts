import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [

  {
    path: '',
    redirectTo: 'galeria',
    pathMatch: 'full'
  },


  {
    path: 'galeria',
    loadComponent: () =>
      import('./pages/galeria/galeria.component').then(m => m.GaleriaComponent)
  },


  {
    path: 'solicitud',
    loadComponent: () =>
      import('./pages/solicitud/solicitud.component').then(m => m.SolicitudComponent)
  },

  // Admin — rutas protegidas por el guard
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./pages/admin/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'admin/dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/admin/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'admin/subir-fotos',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/admin/subir-fotos/subir-fotos.component').then(m => m.SubirFotosComponent)
  },

  {
    path: 'descargas/:id',
    loadComponent: () =>
      import('./pages/descargas/descargas.component').then(m => m.DescargasComponent)
  },

  {
    path: '**',
    redirectTo: 'galeria'
  },

];