import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";
import { TrainingProvider } from "@/components/providers/TrainingProvider";
import { AppShell } from "@/components/layout/AppShell";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { Splash } from "@/components/start/Splash";
import { SplashGate } from "@/components/start/SplashGate";
import { Toaster } from "@/components/ui/Toaster";
import { GRUND_DUNKEL, GRUND_HELL } from "@/lib/grundfarben";
import { ICON_VERSION } from "@/lib/icon-art";

// Eine Schrift: Archivo, variabel mit Breitenachse — normal für Text, breit
// (font-stretch 125 %, .font-display in globals.css) für Titel und Restzeit.
// Tabellenziffern über `tabular-nums`. Self-hosted via next/font.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

// iOS baut seinen Standalone-Splash NICHT aus dem Manifest — ohne diese
// Bilder blitzt Safari weiß auf, bevor das Startbild übernimmt. Gerätepixel
// = CSS-Maß × DPR; die Route rendert dieselbe Marey-Spur wie das Icon.
const IOS_SPLASH: { w: number; h: number; dw: number; dh: number; r: number }[] = [
  { w: 1290, h: 2796, dw: 430, dh: 932, r: 3 },
  { w: 1179, h: 2556, dw: 393, dh: 852, r: 3 },
  { w: 1170, h: 2532, dw: 390, dh: 844, r: 3 },
  { w: 1125, h: 2436, dw: 375, dh: 812, r: 3 },
  { w: 1242, h: 2688, dw: 414, dh: 896, r: 3 },
  { w: 828, h: 1792, dw: 414, dh: 896, r: 2 },
  { w: 1242, h: 2208, dw: 414, dh: 736, r: 3 },
  { w: 750, h: 1334, dw: 375, dh: 667, r: 2 },
];

export const metadata: Metadata = {
  title: "Platte 311",
  description: "Krafttraining mit ATLAS als Coach.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Platte 311",
    startupImage: IOS_SPLASH.map((s) => ({
      url: `/apple-splash/${s.w}x${s.h}?v=${ICON_VERSION}`,
      media: `(device-width: ${s.dw}px) and (device-height: ${s.dh}px) and (-webkit-device-pixel-ratio: ${s.r}) and (orientation: portrait)`,
    })),
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: GRUND_HELL,
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
      className={archivo.variable}
    >
      <body>
        {/* Richtungsvertrag „Regionen“ — als inertes <script> statt JSX-
            Kommentar, damit er den Produktions-Build überlebt und im
            ausgelieferten HTML auditierbar bleibt. */}
        <script
          type="text/x-direction-contract"
          dangerouslySetInnerHTML={{
            __html: `
THESIS: Krafttraining in Scheibenfarben — jede Körperregion hat eine Farbe
(Beine Rot, Druck Blau, Zug Gelb, Rumpf Grün wie die Wettkampf-Hantelscheiben),
alles andere ist Tinte auf warmem Papier bzw. helle Tinte auf warmem Dunkel.
Die Farbe bedeutet etwas: sie zeigt die Region einer Übung in Liste, Training,
Fortschritt und Muskelkarte. Bedienung in Alltagsdeutsch.
OWN-WORLD: Archivo (breit für Titel), Hauptaktionen als Tinte-Flächen, Karten
20 px, Zeilen 14 px, Knöpfe als Pille, keine Schatten. Kontrast Text ≥ 4,5:1,
Bedienelemente ≥ 3:1. Hell/Dunkel folgt der Einstellung, auch im Training.
STORY: öffnen → „Wo trainierst du heute?“ (Zuhause/Studio) → die heutige
Einheit lesen → aufwärmen → Satz für Satz eintragen → ATLAS begleitet →
speichern; Rekorde bekommen ihren Moment.
DOC: .claude/skills/ui-style/SKILL.md
`,
          }}
        />
        {/* Apply saved theme before paint (no flash of the wrong look).
            Enthält die Einmal-Migration auf den hellen Default (altes
            gespeichertes "dark" ohne themeMigratedM72-Flag zählt als hell;
            loadAll persistiert die Migration). Setzt auch das
            theme-color-Meta pre-paint.

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
            __html: `(function(){try{var s=JSON.parse(localStorage.getItem('wilhelm-training-settings')||'{}');var d=document.documentElement;var t=s.theme||'light';if(t==='dark'&&!s.themeMigratedM72)t='light';var r=t==='dark'?'dark':(t==='system'&&window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');d.setAttribute('data-theme',r);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',r==='dark'?'${GRUND_DUNKEL}':'${GRUND_HELL}');var p=s.splash||'v3';if(p!=='aus'){var v=p==='zufall'?'v'+(1+Math.floor(Math.random()*3)):p;window.__sp0=performance.now();d.setAttribute('data-splash',v);setTimeout(function(){d.setAttribute('data-splash','weg')},4000);}}catch(e){}})();`,
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
