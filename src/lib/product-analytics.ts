import posthog from 'posthog-js';

export function captureProductEvent(event: string, properties?: Record<string, unknown>): void {
  try {
    const key = import.meta.env.VITE_POSTHOG_KEY;
    if (!key) return;
    posthog.capture(event, properties);
  } catch {
    /* ignore */
  }
}
