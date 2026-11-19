/**
 * Polyfills del entorno de pruebas: PrimeNG `p-tabs` observa el tamaño del
 * tablist con `ResizeObserver`, que jsdom no implementa.
 */
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverStub implements ResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }

  globalThis.ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver;
}
