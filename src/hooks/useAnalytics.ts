export function useAnalytics() {
  function track(event: string, payload?: Record<string, any>) {
    try {
      // If an external analytics endpoint exists, send there (env-driven).
      const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID;
      if (gaId && (window as any).gtag) {
        (window as any).gtag('event', event, payload || {});
        return;
      }
    } catch (e) {
      // continue to fallback
    }
    // Default: console log events (safe, zero-cost)
    // eslint-disable-next-line no-console
    console.log('[analytics]', event, payload || {});
  }

  return { track };
}
