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
      // antes de la ruta '' que monta Shell (junto a 'construir')
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'login',
      },
      {
        path: 'login',
        title: 'Iniciar sesión · MovilCare',
        loadComponent: () =>
          import('./features/auth/login/login').then((m) => m.Login),
      },

      // dentro de `children`, después de 'dashboard'
      {
        path: 'perfil',
        title: 'Mi sesión · MovilCare',
        loadComponent: () =>
          import('./features/auth/profile/profile').then((m) => m.Profile),
      },
      {
        path: 'clientes',
        title: 'Clientes · MovilCare',
        loadComponent: () =>
          import('./features/customers/customer-list/customer-list')
            .then((module) => module.CustomerList),
      },
      {
        path: 'productos',
        title: 'Productos · MovilCare',
        loadComponent: () =>
          import('./features/products/product-list/product-list')
            .then((m) => m.ProductList),
      },
      {
        path: 'unidades-serializadas',
        title: 'Unidades serializadas · MovilCare',
        loadComponent: () =>
          import('./features/serialized-units/serialized-unit-list/serialized-unit-list')
            .then((module) => module.SerializedUnitList),
      },
      {
        path: 'ventas',
        title: 'Ventas · MovilCare',
        loadComponent: () =>
          import('./features/sales/sale-list/sale-list')
            .then((m) => m.SaleList),
      },
      {
        path: 'ventas/:id',
        title: 'Detalle de venta · MovilCare',
        loadComponent: () =>
          import('./features/sales/sale-detail/sale-detail')
            .then((m) => m.SaleDetail),
      },
      {
        path: 'detalle-ventas',
        title: 'Líneas de venta · MovilCare',
        loadComponent: () =>
          import('./features/sale-details/sale-detail-list/sale-detail-list')
            .then((m) => m.SaleDetailList),
      },
      {
        path: 'dashboard',
        title: 'Panel · MovilCare',
        loadComponent: () =>
          import('./features/dashboard/dashboard')
            .then((m) => m.Dashboard),
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];