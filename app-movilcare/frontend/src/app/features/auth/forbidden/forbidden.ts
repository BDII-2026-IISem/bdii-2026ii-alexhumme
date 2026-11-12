import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';

/** Convierte un 403 en una pista: qué permiso falta y a quién pedirlo. */
@Component({
  selector: 'app-forbidden',
  host: { class: 'block' },
  imports: [ButtonModule, CardModule, RouterLink],
  templateUrl: './forbidden.html',
  styleUrl: './forbidden.css',
})
export class Forbidden {
  /** `permissionGuard` lo deja en la URL; el query param llega ya decodificado. */
  readonly permission = inject(ActivatedRoute).snapshot.queryParamMap.get(
    'permission',
  );
}
