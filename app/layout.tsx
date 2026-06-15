import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TrainingProvider } from "@/components/providers/TrainingProvider";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Training",
  description: "Dein persönlicher Trainingsplan — Muskelaufbau, 3× pro Woche.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" className="dark">
      <body>
        <TrainingProvider>
          <AppShell>{children}</AppShell>
        </TrainingProvider>
      </body>
    </html>
  );
}
