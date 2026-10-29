import { Routes } from '@angular/router';

const provisional = () =>
  import('./features/placeholder/placeholder').then(
    (m) => m.Placeholder,
  );

export const routes: Routes = [
  {
    path: 'construir',
    loadComponent: () =>
      import('./features/construir/construir')
        .then((m) => m.Construir),
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/shell/shell').then((m) => m.Shell),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'clientes',
      },
      {
        path: 'clientes',
        title: 'Clientes · MovilCare',
        loadComponent: provisional,
      },
      {
        path: 'productos',
        title: 'Productos · MovilCare',
        loadComponent: provisional,
      },
      {
        path: 'unidades-serializadas',
        title: 'Unidades serializadas · MovilCare',
        loadComponent: provisional,
      },
      {
        path: 'ventas',
        title: 'Ventas · MovilCare',
        loadComponent: provisional,
      },
    ],
  },
  { path: '**', redirectTo: 'clientes' },
];