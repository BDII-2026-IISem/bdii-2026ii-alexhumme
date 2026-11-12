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

/** Catálogo de Operación de MovilCare. Seguridad se agrega en el ISS-10. */
export const NAV: NavGroupConfig[] = [
  {
    label: 'Operación',
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
