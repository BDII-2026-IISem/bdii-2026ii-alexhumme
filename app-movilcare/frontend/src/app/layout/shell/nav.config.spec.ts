import { NAV, visibleNav } from './nav.config';

describe('menú filtrado', () => {
  it('con todos los permisos muestra las catorce entradas', () => {
    expect(visibleNav(() => true).flatMap((group) => group.items)).toHaveLength(
      14,
    );
  });

  it('sin concesiones oculta el grupo entero', () => {
    expect(visibleNav(() => false)).toEqual([]);
  });

  it('sin GET /api/resource-roles no queda ninguna entrada de Concesiones', () => {
    const labels = visibleNav((permission) => permission !== 'GET /api/resource-roles')
      .flatMap((group) => group.items)
      .map((item) => item.label);

    expect(labels).not.toContain('Concesiones');
    expect(labels).toContain('Usuarios');
    expect(labels).toHaveLength(13);
  });

  it('separa las catorce entradas en cinco grupos por flujo', () => {
    expect(visibleNav(() => true).map((group) => group.label)).toEqual([
      'General',
      'Catálogo',
      'Ventas',
      'Servicio',
      'Seguridad',
    ]);

    // Un grupo sin permisos desaparece entero, no deja cabecera vacía.
    const sinServicio = visibleNav(
      (permission) => permission !== 'GET /api/service-orders',
    );
    expect(sinServicio.map((group) => group.label)).not.toContain('Servicio');
    expect(NAV).toHaveLength(5);
  });
});
