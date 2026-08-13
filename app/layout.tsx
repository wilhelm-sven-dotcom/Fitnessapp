import type { Metadata, Viewport } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { TrainingProvider } from "@/components/providers/TrainingProvider";
import { AppShell } from "@/components/layout/AppShell";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { AppIconInstaller } from "@/components/pwa/AppIconInstaller";

// Zwei Schriften, ein System: Archivo (variable, inkl. Weiten-Achse für
// Scoreboard-Ziffern) für Display/Body, JetBrains Mono nur für Messwerte.
// Self-hosted at build by next/font (no runtime fetch).
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});
const jbmono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jbmono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Training",
  description: "Dein persönlicher Trainingsplan — Muskelaufbau mit ATLAS.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Training",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#f2f4f2",
  width: "device-width",
  initialScale: 1,
  // Kein maximumScale: Pinch-Zoom bleibt möglich (WCAG 1.4.4).
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="de"
      data-theme="light"
      // The pre-paint script below rewrites data-theme/--accent on <html> from
      // localStorage before hydration, so React would flag an attribute
      // mismatch on this element. Suppress it (scoped to <html>'s own
      // attributes only; descendant mismatches still surface).
      suppressHydrationWarning
      className={`${archivo.variable} ${jbmono.variable}`}
    >
      <body>
        {/*
          THESIS: Training als System, nicht als Nachtclub — deutsches
          Sportsystemdesign (Aicher, München 1972); verweigert wird die
          Kategorie-Schablone „dunkel + Neonakzent + Glow".
          OWN-WORLD: Silberweißer Grund, 1px-Hairline-Raster, flache satte
          Farbfelder; Farbcode je Bereich: Blau=Heute/Session, Orange=ATLAS,
          Grün=Fortschritt, Gelb=Warnung, Rot=Gefahr. Archivo (wdth-Achse für
          Scoreboard-Ziffern) + JetBrains Mono nur für Messwerte; Radius 12,
          Elevation als Hairline + ein leiser Offset-Schatten.
          STORY: öffnen → Zustand und Tagesauftrag in Sekunden lesen →
          starten → Sätze gegen große Tabellenziffern loggen → präzises,
          knappes Feedback; Feier nur nach dem Speichern.
          FIRST VIEWPORT: blaues Farbfeld-Hero (Datum/Zustand, Direktive),
          darunter gerasterte Zeilenliste; Primäraktion als blaues Vollfeld.
          FORM: Aicher-Systemraster; Hell ist Default (helles Gym), Dunkel
          ist die Anthrazit-Variante über data-theme.
          FINISH: unreviewed and undocumented is unfinished; this build ends
          with the finish review, the verdict, and DESIGN.md (ui-style).
        */}
        {/* Apply saved theme before paint (no flash of the wrong look).
            Enthält die Einmal-Migration auf den hellen Default: ein gespeichertes
            "dark" ohne themeMigratedM72-Flag stammt vom alten Dunkel-Default und
            wird wie "light" behandelt (loadAll persistiert die Migration). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=JSON.parse(localStorage.getItem('wilhelm-training-settings')||'{}');var d=document.documentElement;var t=s.theme||'light';if(t==='dark'&&!s.themeMigratedM72)t='light';var r=t==='dark'?'dark':(t==='system'&&window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');d.setAttribute('data-theme',r);if(s.accentOverride)d.style.setProperty('--accent',s.accentOverride);}catch(e){}})();`,
          }}
        />
        <TrainingProvider>
          <AppShell>{children}</AppShell>
          <AppIconInstaller />
        </TrainingProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
