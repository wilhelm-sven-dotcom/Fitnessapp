import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { TrainingProvider } from "@/components/providers/TrainingProvider";
import { AppShell } from "@/components/layout/AppShell";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";

// Self-hosted display face (Space Grotesk, variable) — big numbers, headings, wordmark.
const display = localFont({
  src: "./fonts/SpaceGrotesk.woff2",
  variable: "--font-display",
  weight: "300 700",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Training",
  description: "Dein persönlicher Trainingsplan — Muskelaufbau, 3× pro Woche.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
    title: "Training",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" data-theme="dark" className={display.variable}>
      <body>
        {/* Apply saved theme + accent before paint (no flash of the wrong theme). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=JSON.parse(localStorage.getItem('wilhelm-training-settings')||'{}');var t=s.theme||'dark';var r=t==='light'?'light':(t==='system'&&window.matchMedia&&matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');var d=document.documentElement;d.setAttribute('data-theme',r);var a={red:'#ff375f',orange:'#ff9f0a',green:'#30d158',blue:'#0a84ff',purple:'#bf5af2',pink:'#ff2d92'};d.style.setProperty('--accent',a[s.accentColor]||'#ff375f');}catch(e){}})();`,
          }}
        />
        <TrainingProvider>
          <AppShell>{children}</AppShell>
        </TrainingProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
