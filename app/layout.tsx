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
    <html lang="de" className={`dark ${display.variable}`}>
      <body>
        <TrainingProvider>
          <AppShell>{children}</AppShell>
        </TrainingProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
