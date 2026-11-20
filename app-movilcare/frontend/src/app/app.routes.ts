import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth-guard';
import { authOnlyGuard } from './core/guards/auth-only-guard';
import { guestGuard } from './core/guards/guest-guard';
import { permissionGuard } from './core/guards/permission-guard';

export const routes: Routes = [
  {
    path: 'construir',
    loadComponent: () =>
      import('./features/construir/construir')
        .then((m) => m.Construir),
  },

  // Fuera del Shell: guestGuard y authGuard no comparten árbol (evita bucle).
  {
    path: 'login',
    title: 'Iniciar sesión · MovilCare',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login').then((m) => m.Login),
  },

  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/shell/shell').then((m) => m.Shell),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        title: 'Panel · MovilCare',
        canActivate: [permissionGuard],
        data: { permission: 'GET /api/sales' },
        loadComponent: () =>
          import('./features/dashboard/dashboard')
            .then((m) => m.Dashboard),
      },
      {
        path: 'clientes',
        title: 'Clientes · MovilCare',
        canActivate: [permissionGuard],
        data: { permission: 'GET /api/customers' },
        loadComponent: () =>
          import('./features/customers/customer-list/customer-list')
            .then((module) => module.CustomerList),
      },
      {
        path: 'productos',
        title: 'Productos · MovilCare',
        canActivate: [permissionGuard],
        data: { permission: 'GET /api/products' },
        loadComponent: () =>
          import('./features/products/product-list/product-list')
            .then((m) => m.ProductList),
      },
      {
        path: 'unidades-serializadas',
        title: 'Unidades serializadas · MovilCare',
        canActivate: [permissionGuard],
        data: { permission: 'GET /api/serialized-units' },
        loadComponent: () =>
          import('./features/serialized-units/serialized-unit-list/serialized-unit-list')
            .then((module) => module.SerializedUnitList),
      },
      {
        path: 'ventas',
        title: 'Ventas · MovilCare',
        canActivate: [permissionGuard],
        data: { permission: 'GET /api/sales' },
        loadComponent: () =>
          import('./features/sales/sale-list/sale-list')
            .then((m) => m.SaleList),
      },
      {
        path: 'garantias',
        title: 'Garantías · MovilCare',
        canActivate: [permissionGuard],
        data: { permission: 'GET /api/warranties' },
        loadComponent: () =>
          import('./features/warranties/warranty-list/warranty-list')
            .then((m) => m.WarrantyList),
      },
      {
        path: 'ordenes',
        title: 'Órdenes de servicio · MovilCare',
        canActivate: [permissionGuard],
        data: { permission: 'GET /api/service-orders' },
        loadComponent: () =>
          import('./features/service-orders/service-order-list/service-order-list')
            .then((m) => m.ServiceOrderList),
      },
      {
        path: 'repuestos',
        title: 'Repuestos · MovilCare',
        canActivate: [permissionGuard],
        data: { permission: 'GET /api/parts' },
        loadComponent: () =>
          import('./features/parts/part-list/part-list')
            .then((m) => m.PartList),
      },
      {
        path: 'detalle-ventas',
        title: 'Líneas de venta · MovilCare',
        canActivate: [permissionGuard],
        data: { permission: 'GET /api/sales' },
        loadComponent: () =>
          import('./features/sale-details/sale-detail-list/sale-detail-list')
            .then((m) => m.SaleDetailList),
      },
      // Administración de la matriz RBAC: cinco tablas, cinco permisos.
      {
        path: 'admin/usuarios',
        title: 'Usuarios · MovilCare',
        canActivate: [permissionGuard],
        data: { permission: 'GET /api/users' },
        loadComponent: () =>
          import('./features/admin/users/user-list/user-list')
            .then((m) => m.UserList),
      },
      {
        path: 'admin/roles',
        title: 'Roles · MovilCare',
        canActivate: [permissionGuard],
        data: { permission: 'GET /api/roles' },
        loadComponent: () =>
          import('./features/admin/roles/role-list/role-list')
            .then((m) => m.RoleList),
      },
      {
        path: 'admin/recursos',
        title: 'Recursos · MovilCare',
        canActivate: [permissionGuard],
        data: { permission: 'GET /api/resources' },
        loadComponent: () =>
          import('./features/admin/resources/resource-list/resource-list')
            .then((m) => m.ResourceList),
      },
      {
        path: 'admin/asignaciones',
        title: 'Asignaciones · MovilCare',
        canActivate: [permissionGuard],
        data: { permission: 'GET /api/role-users' },
        loadComponent: () =>
          import('./features/admin/role-users/role-user-list/role-user-list')
            .then((m) => m.RoleUserList),
      },
      {
        path: 'admin/permisos',
        title: 'Concesiones · MovilCare',
        canActivate: [permissionGuard],
        data: { permission: 'GET /api/resource-roles' },
        loadComponent: () =>
          import('./features/admin/resource-roles/resource-role-list/resource-role-list')
            .then((m) => m.ResourceRoleList),
      },
      // Sesión y ningún permiso: /perfil no hereda un permissionGuard.
      {
        path: 'perfil',
        title: 'Mi sesión · MovilCare',
        canActivate: [authOnlyGuard],
        loadComponent: () =>
          import('./features/auth/profile/profile').then((m) => m.Profile),
      },
      // Sin data.permission: el authGuard del Shell ya exige sesión.
      {
        path: 'forbidden',
        title: 'Acceso denegado · MovilCare',
        loadComponent: () =>
          import('./features/auth/forbidden/forbidden')
            .then((m) => m.Forbidden),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
