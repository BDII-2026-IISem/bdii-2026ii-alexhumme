import { MenuItem } from 'primeng/api';

/** Entrada del menú con la clave `MÉTODO /api/recurso` que la habilita. */
export interface NavEntryConfig {
  label: string;
  icon: string;
  routerLink: string;
  permission?: string;
}

export interface NavGroupConfig {
  label: string;
  items: NavEntryConfig[];
}

/**
 * Catálogo de MovilCare: cinco grupos por flujo de trabajo — General,
 * Catálogo, Ventas, Servicio (taller) y Seguridad (matriz RBAC).
 */
export const NAV: NavGroupConfig[] = [
  {
    label: 'General',
    items: [
      {
        label: 'Panel',
        icon: 'pi pi-home',
        routerLink: '/dashboard',
        permission: 'GET /api/sales',
      },
      {
        label: 'Clientes',
        icon: 'pi pi-users',
        routerLink: '/clientes',
        permission: 'GET /api/customers',
      },
    ],
  },
  {
    label: 'Catálogo',
    items: [
      {
        label: 'Unidades serializadas',
        icon: 'pi pi-tags',
        routerLink: '/unidades-serializadas',
        permission: 'GET /api/serialized-units',
      },
      {
        label: 'Productos',
        icon: 'pi pi-box',
        routerLink: '/productos',
        permission: 'GET /api/products',
      },
      {
        label: 'Repuestos',
        icon: 'pi pi-cog',
        routerLink: '/repuestos',
        permission: 'GET /api/parts',
      },
    ],
  },
  {
    label: 'Ventas',
    items: [
      {
        label: 'Ventas',
        icon: 'pi pi-shopping-cart',
        routerLink: '/ventas',
        permission: 'GET /api/sales',
      },
      {
        label: 'Detalle de ventas',
        icon: 'pi pi-list',
        routerLink: '/detalle-ventas',
        permission: 'GET /api/sales',
      },
      {
        label: 'Garantías',
        icon: 'pi pi-shield',
        routerLink: '/garantias',
        permission: 'GET /api/warranties',
      },
    ],
  },
  {
    label: 'Servicio',
    items: [
      {
        label: 'Órdenes de servicio',
        icon: 'pi pi-wrench',
        routerLink: '/ordenes',
        permission: 'GET /api/service-orders',
      },
    ],
  },
  {
    label: 'Seguridad',
    items: [
      {
        label: 'Usuarios',
        icon: 'pi pi-user',
        routerLink: '/admin/usuarios',
        permission: 'GET /api/users',
      },
      {
        label: 'Roles',
        icon: 'pi pi-id-card',
        routerLink: '/admin/roles',
        permission: 'GET /api/roles',
      },
      {
        label: 'Recursos',
        icon: 'pi pi-server',
        routerLink: '/admin/recursos',
        permission: 'GET /api/resources',
      },
      {
        label: 'Asignaciones',
        icon: 'pi pi-link',
        routerLink: '/admin/asignaciones',
        permission: 'GET /api/role-users',
      },
      {
        label: 'Concesiones',
        icon: 'pi pi-key',
        routerLink: '/admin/permisos',
        permission: 'GET /api/resource-roles',
      },
    ],
  },
];

/** Filtra el catálogo con el predicado de la sesión; sin Angular, para poder probarlo. */
export function visibleNav(
  can: (permission: string) => boolean,
): NavGroupConfig[] {
  return NAV.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => !item.permission || can(item.permission),
    ),
  })).filter((group) => group.items.length > 0);
}

/** Convierte el catálogo visible al modelo de PrimeNG. */
export function toMenuItems(groups: NavGroupConfig[]): MenuItem[] {
  return groups.map((group) => ({
    label: group.label,
    items: group.items.map<MenuItem>((item) => ({
      label: item.label,
      icon: item.icon,
      routerLink: item.routerLink,
    })),
  }));
}
