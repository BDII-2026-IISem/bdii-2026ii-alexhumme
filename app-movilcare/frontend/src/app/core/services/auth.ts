import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
    Observable,
    catchError,
    finalize,
    forkJoin,
    map,
    of,
    switchMap,
    tap,
    throwError,
} from 'rxjs';

import { environment } from '../../../environments/environment';
import {
    EffectivePermission,
    LoginRequest,
    SessionUser,
    TokenPair,
} from '../models/auth.model';
import { SessionStore } from './session-store';

/** Único punto de contacto con /api/auth/. El login solo devuelve el par. */
@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly http = inject(HttpClient);
    private readonly session = inject(SessionStore);
    private readonly base = `${environment.apiUrl}/auth`;

    /** Login + perfil + permisos: no emite hasta que la sesión está completa. */
    login(credentials: LoginRequest): Observable<SessionUser> {
        return this.http
            .post<TokenPair>(`${this.base}/login/`, credentials)
            .pipe(
                tap((tokens) => this.session.setTokens(tokens)),
                switchMap(() =>
                    this.me().pipe(
                        catchError((error: unknown) => {
                            this.session.clear();
                            return throwError(() => error);
                        }),
                    ),
                ),
            );
    }

    /** GET /auth/profile/ (objeto directo) + GET /auth/permissions/ (envuelto). */
    me(): Observable<SessionUser> {
        return forkJoin({
            user: this.http.get<SessionUser>(`${this.base}/profile/`),
            permissions: this.http.get<{ permissions: EffectivePermission[] }>(
                `${this.base}/permissions/`,
            ),
        }).pipe(
            tap(({ user, permissions }) =>
                this.session.setUser(user, permissions.permissions),
            ),
            map(({ user }) => user),
        );
    }

    refresh(): Observable<TokenPair> {
        const refresh = this.session.refreshToken();
        if (!refresh) {
            return throwError(() => new Error('La sesión no tiene refresh token'));
        }
        return this.http
            .post<TokenPair>(`${this.base}/refresh/`, { refresh })
            .pipe(tap((tokens) => this.session.setTokens(tokens)));
    }

    logout(): Observable<unknown> {
        const refresh = this.session.refreshToken();

        const request: Observable<unknown> = refresh
            ? this.http.post<unknown>(`${this.base}/logout/`, { refresh })
            : of(null);

        return request.pipe(
            catchError(() => of(null)),
            finalize(() => this.session.clear()),
        );
    }
}
