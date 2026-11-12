import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { CustomerApi } from '../../features/customers/customer-api';
import { TokenPair } from '../models/auth.model';
import { SessionStore } from '../services/session-store';
import { authInterceptor } from './auth-interceptor';

const PAR: TokenPair = {
    access: 'a1',
    refresh: 'r1',
    tokenType: 'Bearer',
    accessExpiresIn: 3600,
};

describe('authInterceptor', () => {
    let store: SessionStore;
    let api: CustomerApi;
    let http: HttpTestingController;

    beforeEach(() => {
        localStorage.clear();
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withInterceptors([authInterceptor])),
                provideHttpClientTesting(),
                provideRouter([]),
                // El interceptor inyecta Notification, que a su vez inyecta
                // MessageService (mismo provider que registra app.config.ts).
                MessageService,
            ],
        });
        store = TestBed.inject(SessionStore);
        api = TestBed.inject(CustomerApi);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        http.verify();
        localStorage.clear();
    });

    it('should attach Bearer and refresh only once for two 401', () => {
        store.setTokens({ ...PAR, access: 'viejo' });

        api.list().subscribe();
        api.list().subscribe();

        const original = http.match('http://127.0.0.1:8000/api/customers/');
        expect(original.length).toBe(2);
        expect(original[0].request.headers.get('Authorization')).toBe(
            'Bearer viejo',
        );

        original[0].flush(
            { detail: 'vencido' },
            { status: 401, statusText: 'Unauthorized' },
        );
        original[1].flush(
            { detail: 'vencido' },
            { status: 401, statusText: 'Unauthorized' },
        );

        // Single-flight: una sola llamada al refresh para las dos peticiones,
        // y sin Authorization (el refresh va en el cuerpo).
        const refresh = http.expectOne('http://127.0.0.1:8000/api/auth/refresh/');
        expect(refresh.request.body).toEqual({ refresh: 'r1' });
        expect(refresh.request.headers.get('Authorization')).toBeNull();
        refresh.flush({ ...PAR, access: 'nuevo', refresh: 'r2' });

        const retried = http.match('http://127.0.0.1:8000/api/customers/');
        expect(retried.length).toBe(2);
        retried.forEach((request) => {
            expect(request.request.headers.get('Authorization')).toBe(
                'Bearer nuevo',
            );
            request.flush([]);
        });
    });
});
