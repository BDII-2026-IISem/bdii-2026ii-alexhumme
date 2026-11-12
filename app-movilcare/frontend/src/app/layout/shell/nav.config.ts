/** Entrada del menú lateral; `permission` opcional la decide la sesión. */
export interface NavItemConfig {
  label: string;
  icon: string;
  routerLink: string;
  permission?: string;
}

/** Grupo de entradas; desaparece entero si ninguna sobrevive al filtro. */
export interface NavGroupConfig {
  label: string;
  items: NavItemConfig[];
}

/**
 * Filtra el catálogo con el predicado de la sesión; sin Angular, para
 * poder probarlo. Una entrada sin `permission` siempre es visible.
 */
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

/** Catálogo completo: lo pinta quien tiene todos los permisos. */
export const NAV: NavGroupConfig[] = [
  {
    label: 'Gestión',
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
        label: 'Productos',
        icon: 'pi pi-box',
        routerLink: '/productos',
        permission: 'GET /api/products',
      },
      {
        label: 'Unidades serializadas',
        icon: 'pi pi-barcode',
        routerLink: '/unidades-serializadas',
        permission: 'GET /api/serialized-units',
      },
      {
        label: 'Ventas',
        icon: 'pi pi-shopping-cart',
        routerLink: '/ventas',
        permission: 'GET /api/sales',
      },
      {
        label: 'Líneas de venta',
        icon: 'pi pi-list',
        routerLink: '/detalle-ventas',
        permission: 'GET /api/sales',
      },
    ],
  },
];
