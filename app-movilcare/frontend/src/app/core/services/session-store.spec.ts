import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import {
    EffectivePermission,
    SessionUser,
    TokenPair,
} from '../models/auth.model';
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

describe('SessionStore', () => {
    beforeEach(() => {
        localStorage.clear();
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });
    });

    afterEach(() => localStorage.clear());

    it('should match <int:pk>, ignore the trailing slash and restore the session', () => {
        const store = TestBed.inject(SessionStore);

        store.setTokens(PAR);
        store.setUser(USER, [
            PERMISO,
            { ...PERMISO, method: 'PATCH', path: 'api/customers/<int:pk>/' },
        ]);

        // `resource.route` es la ruta Django: sin barra inicial, con conversor.
        expect(store.canPermission('GET /api/customers')).toBe(true);
        expect(store.canPermission('PATCH /api/customers/7')).toBe(true);
        expect(store.canPermission('DELETE /api/customers/7')).toBe(false);
        expect(store.roles()).toEqual(['admin']);
        expect(store.permissionCount()).toBe(2);
        expect(store.isAuthenticated()).toBe(true);

        // El constructor de SessionStore restaura desde localStorage.
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });

        const restored = TestBed.inject(SessionStore);
        expect(restored.accessToken()).toBe('a1');
        expect(restored.user()).toEqual(USER);
        expect(restored.canPermission('GET /api/customers')).toBe(true);
    });
});
