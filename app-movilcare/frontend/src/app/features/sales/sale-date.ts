function pad(value: number): string {
    return value.toString().padStart(2, '0');
}

/**
 * Valor inicial para <input type="datetime-local">:
 * `YYYY-MM-DDTHH:mm` en la hora local del navegador.
 */
export function toLocalInputValue(date: Date = new Date()): string {
    return (
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
        `T${pad(date.getHours())}:${pad(date.getMinutes())}`
    );
}

/**
 * Convierte el valor del input (`YYYY-MM-DDTHH:mm`, interpretado como hora
 * local) a `YYYY-MM-DDTHH:mm:ss±HH:mm` con el desfase de `getTimezoneOffset()`.
 * No usar `toISOString()`: esa cadena termina en `Z` y no es la zona local.
 */
export function toIsoWithOffset(value: string): string {
    const date = new Date(value);

    const offsetMinutes = -date.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const absolute = Math.abs(offsetMinutes);

    return (
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
        `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
        `${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`
    );
}