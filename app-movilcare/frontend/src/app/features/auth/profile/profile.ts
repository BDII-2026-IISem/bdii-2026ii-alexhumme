import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';

import { AuthService } from '../../../core/services/auth';
import { Notification } from '../../../core/services/notification';
import { SessionStore } from '../../../core/services/session-store';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { StatusTag } from '../../../shared/ui/status-tag/status-tag';

@Component({
  selector: 'app-profile',
  imports: [
    ButtonModule,
    CardModule,
    PageHeader,
    StatusTag,
    TagModule,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
  host: { class: 'block' },
})
export class Profile {
  private readonly auth = inject(AuthService);
  private readonly notify = inject(Notification);
  private readonly router = inject(Router);
  readonly session = inject(SessionStore);

  readonly refreshing = signal(false);

  /** Vuelve a pedir /auth/profile/ y /auth/permissions/ sin cerrar sesión. */
  refresh(): void {
    this.refreshing.set(true);
    this.auth.me().subscribe({
      next: () => {
        this.refreshing.set(false);
        this.notify.success('Sesión sincronizada');
      },
      error: () => this.refreshing.set(false),
    });
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => {
        this.notify.info('Sesión cerrada');
        void this.router.navigate(['/login']);
      },
    });
  }
}
