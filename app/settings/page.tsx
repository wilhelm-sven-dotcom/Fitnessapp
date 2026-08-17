"use client";

import { Download, RotateCcw, Upload } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pressable } from "@/components/ui/pressable";
import { CloudSyncSection } from "@/components/settings/CloudSyncSection";
import { StravaSection } from "@/components/settings/StravaSection";
import { SpotifySection } from "@/components/settings/SpotifySection";
import { AtlasSection } from "@/components/settings/AtlasSection";
import { EquipmentSection } from "@/components/settings/EquipmentSection";
import { AppearanceSection } from "@/components/settings/AppearanceSection";
import { GymSection } from "@/components/settings/GymSection";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { useTraining } from "@/components/providers/TrainingProvider";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

/** Vier ruhige Segmente statt zwölf gestapelter Karten (Muster: Fortschritt).
 *  Körperdaten werden nicht mehr hier erfasst — das lebt bei Fortschritt →
 *  Körper, wo sie auch angezeigt werden. */
type Segment = "training" | "aussehen" | "verbindungen" | "daten";

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: "training", label: "Training" },
  { key: "aussehen", label: "Aussehen" },
  { key: "verbindungen", label: "Verbindungen" },
  { key: "daten", label: "Daten" },
];

function SettingsContent() {
  const { resetAll, exportData, importData } = useTraining();
  const sp = useSearchParams();

  // Segment-Wechsel bleibt lokaler State (keine History-Einträge); nur der
  // EINSTIEG liest die URL: ?seg=verbindungen (Cloud-Icon, OAuth-Callbacks)
  // bzw. der Supabase-Magic-Link, der mit #access_token hierher zurückkehrt.
  const [seg, setSeg] = useState<Segment>(() => {
    const q = sp.get("seg");
    if (q === "training" || q === "aussehen" || q === "verbindungen" || q === "daten")
      return q;
    if (
      typeof window !== "undefined" &&
      /access_token|error_description/.test(window.location.hash)
    )
      return "verbindungen";
    return "training";
  });

  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const exportFile = () => {
    const blob = new Blob([JSON.stringify(exportData(), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `training-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Backup heruntergeladen.", { kind: "success" });
  };

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const ok = await importData(JSON.parse(await file.text()));
      if (ok) toast("Import erfolgreich.", { kind: "success" });
      else toast("Datei nicht erkannt.", { kind: "error" });
    } catch {
      toast("Datei konnte nicht gelesen werden.", { kind: "error" });
    }
  };

  return (
    <div>
      <PageHeader title="Einstellungen" eyebrow="Apparatur · Konfiguration" />

      <div className="mb-4 flex overflow-hidden rounded-card border border-line-card bg-surface-1 p-1">
        {SEGMENTS.map((s) => (
          <Pressable
            key={s.key}
            onClick={() => setSeg(s.key)}
            aria-pressed={seg === s.key}
            className={cn(
              "min-w-0 flex-1 truncate rounded-card py-2 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ink",
              seg === s.key ? "bg-surface-2 text-fg" : "text-muted",
            )}
          >
            {s.label}
          </Pressable>
        ))}
      </div>

      {seg === "training" && (
        <>
          <ProfileSection />
          <AtlasSection />
          <EquipmentSection />
          <GymSection />
        </>
      )}

      {seg === "aussehen" && <AppearanceSection />}

      {seg === "verbindungen" && (
        <>
          <CloudSyncSection />
          <StravaSection />
          <SpotifySection />
        </>
      )}

      {seg === "daten" && (
        <>
          <section className="mb-4 rounded-card border border-line-card bg-surface-1 p-5">
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted">
              Archiv · Daten
            </p>
            <p className="mb-3 text-xs leading-relaxed text-muted">
              Alle Platten liegen auf diesem Gerät. Sichere das Archiv als Datei
              oder spiele ein Backup zurück.
            </p>
            <div className="mb-4 flex flex-col gap-2">
              <Button variant="secondary" full onClick={exportFile}>
                <Download size={16} /> Archiv exportieren
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                onChange={onImport}
                className="hidden"
              />
              <Button variant="secondary" full onClick={() => fileRef.current?.click()}>
                <Upload size={16} /> Backup einspielen
              </Button>
            </div>
            <Button variant="danger" onClick={() => setConfirmReset(true)}>
              <RotateCcw size={15} /> Alle Platten löschen
            </Button>
          </section>

          {/* Destruktives bestätigt ein Sheet — nie inline (Handoff-Rezept). */}
          <Sheet
            open={confirmReset}
            onClose={() => setConfirmReset(false)}
            title="Alle Platten löschen?"
          >
            <p className="mb-4 text-sm leading-relaxed text-muted">
              Das gesamte Archiv — alle Platten, Rekorde und Messreihen — wird
              unwiderruflich gelöscht. Ein Export vorher sichert alles als Datei.
            </p>
            <div className="flex flex-col gap-2 pb-2">
              <Button
                variant="danger"
                full
                onClick={() => {
                  void resetAll().then(() => toast("Alle Platten gelöscht."));
                  setConfirmReset(false);
                }}
              >
                Unwiderruflich löschen
              </Button>
              <Button variant="ghost" full onClick={() => setConfirmReset(false)}>
                Abbrechen
              </Button>
            </div>
          </Sheet>

          <section className="rounded-card border border-line-card bg-surface-1 p-5">
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted">
              Als App installieren
            </p>
            <p className="text-xs leading-relaxed text-muted">
              iPhone: in Safari unten auf „Teilen“ tippen → „Zum Home-Bildschirm“.
              Android: im Chrome-Menü „App installieren“. Danach startet Training im
              Vollbild mit eigenem Icon — und läuft auch offline.
            </p>
          </section>
        </>
      )}
    </div>
  );
}

/** useSearchParams verlangt beim statischen Prerender eine Suspense-Grenze. */
export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsContent />
    </Suspense>
  );
}
