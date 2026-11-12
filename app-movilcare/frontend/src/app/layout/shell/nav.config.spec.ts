import { visibleNav } from './nav.config';

describe('menú filtrado', () => {
  it('con todos los permisos muestra las seis entradas', () => {
    expect(visibleNav(() => true).flatMap((group) => group.items)).toHaveLength(
      6,
    );
  });

  it('sin concesiones oculta el grupo entero', () => {
    expect(visibleNav(() => false)).toEqual([]);
  });
});
