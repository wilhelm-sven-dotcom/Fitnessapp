/**
 * Tiny haptic helpers (Vibration API, guarded). No-ops where unsupported
 * (e.g. iOS Safari ignores navigator.vibrate) — purely additive feedback.
 */
function buzz(pattern: number | number[]): void {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* ignore */
    }
  }
}

/** Light tap for primary actions (start, save, select). */
export function tap(): void {
  buzz(15);
}

/** Success pattern for milestones (PR, finished). */
export function success(): void {
  buzz([40, 40, 60]);
}
