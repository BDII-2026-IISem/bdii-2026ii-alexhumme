
import { TestBed } from '@angular/core/testing';
import { Ejemplo } from './ejemplo';

describe('Ejemplo', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Ejemplo],
    }).compileComponents();
  });

  it('crea el componente', () => {
    const fixture = TestBed.createComponent(Ejemplo);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('calcula el IVA y el precio final', () => {
    const fixture = TestBed.createComponent(Ejemplo);
    const componente = fixture.componentInstance;

    expect(componente.iva()).toBe(3420);
    expect(componente.precioFinal()).toBe(21420);
  });

  it('incrementa el precio en 1000', () => {
    const fixture = TestBed.createComponent(Ejemplo);
    const componente = fixture.componentInstance;

    componente.variarPrecio();

    expect(componente.producto().precio).toBe(19000);
    expect(componente.iva()).toBe(3610);
    expect(componente.precioFinal()).toBe(22610);
  });

  it('cambia el estado del producto', () => {
    const fixture = TestBed.createComponent(Ejemplo);
    const componente = fixture.componentInstance;

    componente.cambiarEstado();

    expect(componente.estadoTexto()).toBe('Inactivo');
  });

  it('cambia el nombre y permite reiniciar', () => {
    const fixture = TestBed.createComponent(Ejemplo);
    const componente = fixture.componentInstance;

    componente.cambiarNombre('Té verde');
    expect(componente.producto().nombre).toBe('Té verde');

    componente.reiniciar();
    expect(componente.producto().nombre).toBe('Café molido 500 g');
    expect(componente.producto().precio).toBe(18000);
    expect(componente.producto().activo).toBe(true);
  });
});
