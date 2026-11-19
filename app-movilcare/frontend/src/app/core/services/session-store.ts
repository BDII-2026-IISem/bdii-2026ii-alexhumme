import { Injectable, computed, signal } from '@angular/core';

import {
    EffectivePermission,
    SessionUser,
    TokenPair,
} from '../models/auth.model';

const STORAGE_KEY = 'movilcare.session.v1';

/** Única fuente de verdad de la sesión; el backend sigue siendo la autoridad. */
@Injectable({ providedIn: 'root' })
export class SessionStore {
    private readonly _accessToken = signal<string | null>(null);
    private readonly _refreshToken = signal<string | null>(null);
    private readonly _user = signal<SessionUser | null>(null);
    private readonly _permissions = signal<EffectivePermission[]>([]);

    readonly accessToken = this._accessToken.asReadonly();
    readonly refreshToken = this._refreshToken.asReadonly();
    readonly user = this._user.asReadonly();
    readonly permissions = this._permissions.asReadonly();

    readonly isAuthenticated = computed(() => this._accessToken() !== null);
    readonly permissionCount = computed(() => this._permissions().length);
    /** Roles de la matriz efectiva: no hay endpoint de roles del usuario. */
    readonly roles = computed(() =>
        [...new Set(this._permissions().map((p) => p.roleName))].sort(),
    );

    constructor() {
        this.restore();
    }

    setTokens(tokens: TokenPair): void {
        this._accessToken.set(tokens.access);
        this._refreshToken.set(tokens.refresh);
        this.persist();
    }

    setUser(user: SessionUser, permissions: EffectivePermission[]): void {
        this._user.set(user);
        this._permissions.set(permissions);
        this.persist();
    }

    clear(): void {
        this._accessToken.set(null);
        this._refreshToken.set(null);
        this._user.set(null);
        this._permissions.set([]);
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch {
            /* sin almacenamiento */
        }
    }

    /** canPermission('PATCH /api/customers/7') contra `api/customers/<int:pk>/`. */
    canPermission(key: string): boolean {
        const separator = key.indexOf(' ');
        if (separator < 0) {
            return false;
        }
        const method = key.slice(0, separator).toUpperCase();
        return this._permissions().some(
            (p) => p.method === method && samePath(p.path, key.slice(separator + 1)),
        );
    }

    private restore(): void {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                return;
            }
            const data = JSON.parse(raw) as {
                access: string;
                refresh: string;
                user: SessionUser | null;
                permissions: EffectivePermission[];
            };
            if (!Array.isArray(data.permissions)) {
                this.clear();
                return;
            }
            this._accessToken.set(data.access || null);
            this._refreshToken.set(data.refresh || null);
            this._user.set(data.user ?? null);
            this._permissions.set(data.permissions);
        } catch {
            this.clear();
        }
    }

    private persist(): void {
        const raw = JSON.stringify({
            access: this._accessToken() ?? '',
            refresh: this._refreshToken() ?? '',
            user: this._user(),
            permissions: this._permissions(),
        });
        try {
            localStorage.setItem(STORAGE_KEY, raw);
        } catch {
            /* cuota llena */
        }
    }
}

/**
 * Compara la clave `MÉTODO /ruta` contra `resource.route`.
 *
 * En MovilCare la ruta es la de Django (`api/customers/<int:pk>/`, sin barra
 * inicial): se parte por segmentos, los conversores `<…>` (y `:id`, por si
 * acaso) valen por cualquier segmento, y la query y la barra final se ignoran.
 */
function samePath(pattern: string, path: string): boolean {
    const segments = (value: string): string[] =>
        value
            .split('?')[0]
            .replace(/^\/+/, '')
            .replace(/\/+$/, '')
            .split('/')
            .filter(Boolean);

    const expected = segments(pattern);
    const actual = segments(path);

    if (expected.length !== actual.length) {
        return false;
    }

    return expected.every((segment, index) => {
        const wildcard =
            (segment.startsWith('<') && segment.endsWith('>')) ||
            segment.startsWith(':');
        return wildcard || segment === actual[index];
    });
}