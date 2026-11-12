import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';

import {
    EffectivePermission,
    SessionUser,
    TokenPair,
} from '../models/auth.model';
import { AuthService } from './auth';
import { SessionStore } from './session-store';

const PAR: TokenPair = {
    access: 'a1',
    refresh: 'r1',
    tokenType: 'Bearer',
    accessExpiresIn: 3600,
};

const USER: SessionUser = {
    id: 1,
    username: 'admin',
    email: 'admin@movilcare.test',
    firstName: 'Ana',
    lastName: 'Torres',
    status: 'active',
};

const PERMISO: EffectivePermission = {
    method: 'GET',
    path: 'api/customers/',
    roleId: 1,
    roleName: 'admin',
};

describe('AuthService', () => {
    let auth: AuthService;
    let http: HttpTestingController;

    beforeEach(() => {
        localStorage.clear();
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });
        auth = TestBed.inject(AuthService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        http.verify();
        localStorage.clear();
    });

    it('should store the pair and only then load profile and permissions', () => {
        let emitted: SessionUser | undefined;

        auth
            .login({ username: 'admin', password: 'Admin123!' })
            .subscribe((user) => (emitted = user));

        http
            .expectOne('http://127.0.0.1:8000/api/auth/login/')
            .flush(PAR);

        // el par ya está guardado…
        expect(TestBed.inject(SessionStore).accessToken()).toBe('a1');
        // …pero login() no emite todavía.
        expect(emitted).toBeUndefined();

        http
            .expectOne('http://127.0.0.1:8000/api/auth/profile/')
            .flush(USER);
        http
            .expectOne('http://127.0.0.1:8000/api/auth/permissions/')
            .flush({ permissions: [PERMISO] });

        expect(emitted).toEqual(USER);
        expect(TestBed.inject(SessionStore).permissionCount()).toBe(1);
        expect(TestBed.inject(SessionStore).user()).toEqual(USER);
    });

    it('should clear the session when profile fails after the login', () => {
        // ya había una sesión: el fallo posterior tiene que dejar todo limpio.
        TestBed.inject(SessionStore).setTokens(PAR);

        let failed = false;
        auth
            .login({ username: 'admin', password: 'x' })
            .subscribe({ error: () => (failed = true) });

        http
            .expectOne('http://127.0.0.1:8000/api/auth/login/')
            .flush(PAR);

        // forkJoin lanza profile y permissions en paralelo: se resuelve primero
        // la de permisos para que la rama de perfil sea la que falla.
        http
            .expectOne('http://127.0.0.1:8000/api/auth/permissions/')
            .flush({ permissions: [] });
        http
            .expectOne('http://127.0.0.1:8000/api/auth/profile/')
            .flush(
                { detail: 'Token expirado.' },
                { status: 401, statusText: 'Unauthorized' },
            );

        expect(failed).toBe(true);
        expect(TestBed.inject(SessionStore).isAuthenticated()).toBe(false);
        expect(TestBed.inject(SessionStore).user()).toBeNull();
    });
});
