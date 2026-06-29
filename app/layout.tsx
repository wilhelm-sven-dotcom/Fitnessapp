import type { Metadata, Viewport } from "next";
import { Archivo, Sora, JetBrains_Mono, Anton, Newsreader, Inter } from "next/font/google";
import "./globals.css";
import { TrainingProvider } from "@/components/providers/TrainingProvider";
import { AppShell } from "@/components/layout/AppShell";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";

// Skin display/body faces. The active skin maps --font-display/--font-body to
// one of these (blueprint → Archivo, tactile → Sora); JetBrains Mono is the
// shared data/label face. Self-hosted at build by next/font (no runtime fetch).
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-archivo",
  display: "swap",
});
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
// Editorial skin: condensed poster display + editorial serif body + clean labels.
const anton = Anton({ subsets: ["latin"], weight: ["400"], variable: "--font-anton", display: "swap" });
const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
  variable: "--font-newsreader",
  display: "swap",
});
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-inter", display: "swap" });

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
  themeColor: "#0c0e12",
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
      data-skin="tactile"
      className={`${archivo.variable} ${sora.variable} ${jbmono.variable} ${anton.variable} ${newsreader.variable} ${inter.variable}`}
    >
      <body>
        {/* Apply saved theme + skin before paint (no flash of the wrong look).
            --accent is owned by the skin's CSS, so nothing is set inline here. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=JSON.parse(localStorage.getItem('wilhelm-training-settings')||'{}');var d=document.documentElement;var t=s.theme||'dark';var r=t==='light'?'light':(t==='system'&&window.matchMedia&&matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');d.setAttribute('data-theme',r);var sk=s.skin;d.setAttribute('data-skin',sk==='blueprint'||sk==='editorial'?sk:'tactile');}catch(e){}})();`,
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
