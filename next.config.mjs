/**
 * Antwort-Header für jede Seite, jede Datei und jede API-Route.
 *
 * Bewusst KEINE vollständige Content-Security-Policy: Next schreibt eigene
 * Inline-Skripte in jede Seite (die Daten der Seite, dazu unser Skript, das
 * Hell oder Dunkel vor dem ersten Bild setzt). Die ließen sich nur mit einer
 * Kennung je Antwort freigeben — dann wäre keine Seite mehr statisch, und der
 * Service Worker könnte sie nicht mehr vorladen (Training ohne Netz).
 *
 * HTTPS-Zwang (Strict-Transport-Security) setzt Vercel selbst.
 */
const SICHERHEIT = [
  // Der Browser rät den Dateityp nicht selbst: was als Text kommt, läuft nie
  // als Skript.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Fremde Adressen (YouTube, Strava, Spotify) erfahren nur die Herkunft, nie
  // den Pfad. YouTube braucht die Herkunft, sonst spielt das Video nicht.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Die App lässt sich in keine fremde Seite einbetten (Schutz vor
  // Klick-Fallen). Zwei Schreibweisen: ältere und heutige Browser.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  // Was die App nie braucht, ist abgeschaltet — auch für eingebettete Videos.
  // Nicht genannt und damit weiter erlaubt: Bewegungssensor (Sprungtest),
  // Wachhalten des Bildschirms, Vollbild und Bild-in-Bild der Videos. Fotos
  // kommen über die Dateiauswahl und brauchen keine Kamera-Freigabe.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Kein „X-Powered-By: Next.js“ — niemand muss wissen, womit die App gebaut ist.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SICHERHEIT }];
  },
};

export default nextConfig;
