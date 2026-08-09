import type { Metadata, Viewport } from "next";
import { Sora, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { TrainingProvider } from "@/components/providers/TrainingProvider";
import { AppShell } from "@/components/layout/AppShell";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { AppIconInstaller } from "@/components/pwa/AppIconInstaller";

// Zwei Schriften, ein Design: Sora für Display/Body, JetBrains Mono für
// Labels/Daten. Self-hosted at build by next/font (no runtime fetch).
const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sora",
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
    statusBarStyle: "black",
    title: "Training",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0e0f12",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="de"
      data-theme="dark"
      // The pre-paint script below rewrites data-theme/--accent on <html> from
      // localStorage before hydration, so React would flag an attribute
      // mismatch on this element. Suppress it (scoped to <html>'s own
      // attributes only; descendant mismatches still surface).
      suppressHydrationWarning
      className={`${sora.variable} ${jbmono.variable}`}
    >
      <body>
        {/* Apply saved theme before paint (no flash of the wrong look). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=JSON.parse(localStorage.getItem('wilhelm-training-settings')||'{}');var d=document.documentElement;var t=s.theme||'dark';var r=t==='light'?'light':(t==='system'&&window.matchMedia&&matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');d.setAttribute('data-theme',r);if(s.accentOverride)d.style.setProperty('--accent',s.accentOverride);}catch(e){}})();`,
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
