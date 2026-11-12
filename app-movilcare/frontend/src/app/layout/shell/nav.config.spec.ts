import { visibleNav } from './nav.config';

describe('menú filtrado', () => {
  it('con todos los permisos muestra las once entradas', () => {
    expect(visibleNav(() => true).flatMap((group) => group.items)).toHaveLength(
      11,
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
    expect(labels).toHaveLength(10);
  });
});
