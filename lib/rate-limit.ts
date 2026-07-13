/**
 * Sehr einfacher In-Memory-Limiter für die bezahlten Coach-Endpunkte
 * (Sliding Window pro Schlüssel, typisch `route:ip`). Pro Serverless-Instanz —
 * kein Ersatz für echte Auth, aber der bisherige Client-Deckel allein war
 * serverseitig gar keine Grenze gegen Schleifen oder direkte Aufrufe.
 */
const hits = new Map<string, number[]>();

export function allowRequest(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  // Notbremse gegen unbegrenztes Wachstum bei vielen verschiedenen Schlüsseln.
  if (hits.size > 2000 && !hits.has(key)) hits.clear();
  recent.push(now);
  hits.set(key, recent);
  return true;
}

/** Anfragender Client fürs Limit — erste Adresse aus x-forwarded-for. */
export function clientKey(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
