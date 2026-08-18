import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Old_Standard_TT } from "next/font/google";
import "./globals.css";
import { TrainingProvider } from "@/components/providers/TrainingProvider";
import { AppShell } from "@/components/layout/AppShell";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { Splash } from "@/components/start/Splash";
import { SplashGate } from "@/components/start/SplashGate";
import { Toaster } from "@/components/ui/Toaster";

// Zwei Schriften, ein Labor: IBM Plex Mono trägt ALLE UI inkl. Body
// (Messgeräte-Beschriftung), Old Standard TT (1900er-Buchsatz) nur für
// Benanntes — Titel kursiv, Buchsatz-Absätze. Self-hosted via next/font.
const oldstandard = Old_Standard_TT({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-oldstandard",
  display: "swap",
});
const plexmono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plexmono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Platte 311",
  description: "Das Bewegungslabor — Muskelaufbau mit ATLAS als Studienleiter.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Platte 311",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#f2ecdd",
  width: "device-width",
  initialScale: 1,
  // Kein maximumScale: Pinch-Zoom bleibt möglich (WCAG 1.4.4).
  viewportFit: "cover",
  // iOS-Tastatur STAUCHT das Layout statt es zu überdecken — Sticky-Chrome
  // (Dock, Nav) bleibt über der Tastatur sichtbar.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="de"
      data-theme="light"
      // The pre-paint script below rewrites data-theme on <html> from
      // localStorage before hydration, so React would flag an attribute
      // mismatch on this element. Suppress it (scoped to <html>'s own
      // attributes only; descendant mismatches still surface).
      suppressHydrationWarning
      className={`${oldstandard.variable} ${plexmono.variable}`}
    >
      <body>
        {/* Richtungsvertrag Platte 311 — als inertes <script> statt JSX-
            Kommentar, damit er den Produktions-Build überlebt und im
            ausgelieferten HTML auditierbar bleibt. */}
        <script
          type="text/x-direction-contract"
          dangerouslySetInnerHTML={{
            __html: `
THESIS: Training als fotografische Studie — Muybridges Bewegungslabor (1887):
jede Wiederholung ein Kader, jede Einheit eine Platte; verweigert werden
Neon-Gym-Schablone UND Fitness-App-Konfetti.
OWN-WORLD: Albumin-Papier („Archiv", hell) als Grundzustand, Kollodium-Dunkel
(„Atelier") als Variante — der Fokus-Modus läuft IMMER im Atelier. Fäden statt
Schatten, Radius 1/2/3 px. Funktionsfarben: Siegellack = Akzent/aktiv,
Cyanotypie = Daten/Hypothese, Messing = Rekord, IWF-Scheibenfarben = Last.
IBM Plex Mono trägt alle UI inkl. Body; Old Standard TT nur Benanntes.
Phasenfiguren nach Muybridge-Regeln (48er-Raster, 3 Kader, Zoetrop 8 B/s).
STORY: öffnen → die heutige Studie als Platte lesen → Apparatur kalibrieren →
Kader für Kader belichten → ATLAS führt das Protokoll → die Platte wandert
ins Archiv; Maxima landen auf der Tafel.
FIRST VIEWPORT: Karteikopf PLATTE Nr./Datum, Titel in Old-Standard-Kursive,
Marey-Karte mit Phasenfigur, Stempel-CTA „Studie beginnen".
FINISH: unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, and DESIGN.md (ui-style).
`,
          }}
        />
        {/* Apply saved theme before paint (no flash of the wrong look).
            Enthält die Einmal-Migration auf den hellen Default (altes
            gespeichertes "dark" ohne themeMigratedM72-Flag zählt als hell;
            loadAll persistiert die Migration) UND den Atelier-Zwang des
            Fokus-Modus: /workout rendert IMMER dunkel (Theme-Lock, siehe
            lib/theme.ts). Setzt auch das theme-color-Meta pre-paint.

            Zweite Aufgabe: die Wahl des Startbilds. Sie MUSS hier fallen —
            vor dem ersten Paint und außerhalb von React —, denn das Markup
            aller drei Varianten steht identisch im HTML (hydrationssicher),
            und erst `data-splash` macht eine davon sichtbar. Ohne Attribut
            bleibt der Splash unsichtbar: der Fail-Safe für „aus" und für den
            Fall, dass dieses Skript gar nicht läuft. Der Notausgang nach 4 s
            liegt bewusst ebenfalls hier — er greift auch dann noch, wenn die
            Hydration scheitert und SplashGate nie zum Zug kommt. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=JSON.parse(localStorage.getItem('wilhelm-training-settings')||'{}');var d=document.documentElement;var t=s.theme||'light';if(t==='dark'&&!s.themeMigratedM72)t='light';var r=t==='dark'?'dark':(t==='system'&&window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');if(location.pathname.indexOf('/workout')===0)r='dark';d.setAttribute('data-theme',r);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',r==='dark'?'#141210':'#f2ecdd');var p=s.splash||'zufall';if(p!=='aus'){var v=p==='zufall'?'v'+(1+Math.floor(Math.random()*3)):p;d.setAttribute('data-splash',v);setTimeout(function(){d.setAttribute('data-splash','weg')},4000);}}catch(e){}})();`,
          }}
        />
        <Splash />
        <TrainingProvider>
          <AppShell>{children}</AppShell>
          <Toaster />
          <SplashGate />
        </TrainingProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
