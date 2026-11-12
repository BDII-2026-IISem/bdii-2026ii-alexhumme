import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { SessionStore } from '../../core/services/session-store';
import { HasPermission } from './has-permission';

@Component({
  imports: [HasPermission],
  template: `<button *appHasPermission="'POST /api/customers'">Nuevo</button>`,
})
class Host {}

async function mount(allowed: boolean): Promise<HTMLElement> {
  await TestBed.configureTestingModule({
    imports: [Host],
    providers: [
      { provide: SessionStore, useValue: { canPermission: () => allowed } },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(Host);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('directiva *appHasPermission', () => {
  it('pinta el botón cuando la sesión tiene el permiso', async () => {
    expect((await mount(true)).textContent).toContain('Nuevo');
  });

  it('no pinta nada cuando falta la concesión', async () => {
    expect((await mount(false)).querySelector('button')).toBeNull();
  });
});
