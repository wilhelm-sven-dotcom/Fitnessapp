/**
 * Ein `localStorage` für die Unit-Tests: hält Werte in einer Map und kann
 * „voll“ sein (`grenze` in Zeichen), wie der echte Speicher des Browsers.
 */
export class SpeicherAttrappe {
  private werte = new Map<string, string>();
  /** Größte Gesamtlänge aller Schlüssel und Werte; `Infinity` = unbegrenzt. */
  grenze = Infinity;

  get length(): number {
    return this.werte.size;
  }
  key(i: number): string | null {
    return [...this.werte.keys()][i] ?? null;
  }
  getItem(k: string): string | null {
    return this.werte.has(k) ? (this.werte.get(k) as string) : null;
  }
  setItem(k: string, v: string): void {
    let summe = k.length + v.length;
    for (const [kk, vv] of this.werte) if (kk !== k) summe += kk.length + vv.length;
    if (summe > this.grenze) throw new Error("QuotaExceededError");
    this.werte.set(k, v);
  }
  removeItem(k: string): void {
    this.werte.delete(k);
  }
  clear(): void {
    this.werte.clear();
  }
  schluessel(): string[] {
    return [...this.werte.keys()].sort();
  }
}

/** Namen der Ereignisse, die seit dem letzten `frischerSpeicher()` am
 *  `window` ausgelöst wurden. */
export const ereignisse: string[] = [];

/** Setzt einen frischen Speicher als `window.localStorage` ein. */
export function frischerSpeicher(): SpeicherAttrappe {
  const ls = new SpeicherAttrappe();
  ereignisse.length = 0;
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: ls,
    dispatchEvent: (e: Event) => {
      ereignisse.push(e.type);
      return true;
    },
  };
  return ls;
}
