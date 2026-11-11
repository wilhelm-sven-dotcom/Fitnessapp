"use client";

import { Download, History, RotateCcw, Upload } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Kicker } from "@/components/ui/Kicker";
import { Segment } from "@/components/ui/Segment";
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
import type { ImportModus } from "@/lib/datensicherung";
import { KEYS, storage, type Sicherung } from "@/lib/storage";
import { toast } from "@/lib/toast";

/** „2026-11-09“ oder ISO-Zeit → „09.11.2026“; leer bei Unlesbarem. */
const alsDatum = (wert: string) => {
  const d = new Date(wert.length === 10 ? `${wert}T12:00:00` : wert);
  return Number.isFinite(d.getTime())
    ? d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "";
};
const einheiten = (n: number) => (n === 1 ? "1 Einheit" : `${n} Einheiten`);

/** Vier ruhige Segmente statt zwölf gestapelter Karten (Muster: Fortschritt).
 *  Körperdaten werden nicht mehr hier erfasst — das lebt bei Fortschritt →
 *  Körper, wo sie auch angezeigt werden. */
type Segment = "training" | "aussehen" | "verbindungen" | "daten";

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: "training", label: "Training" },
  { key: "aussehen", label: "Aussehen" },
  { key: "verbindungen", label: "Dienste" },
  { key: "daten", label: "Daten" },
];

function SettingsContent() {
  const { resetAll, exportData, importData, holeSicherung, log } = useTraining();
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
  const [loescht, setLoescht] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  /** Eine gewählte, lesbare Export-Datei wartet auf die Frage „ergänzen oder
   *  ersetzen“. */
  const [datei, setDatei] = useState<{ inhalt: unknown; vom: string; anzahl: number } | null>(null);
  /** Die Sicherung des Verlaufs (Stand vor der ersten Änderung des Tages). */
  const [sicherung, setSicherung] = useState<Sicherung | null>(null);
  const [confirmSicherung, setConfirmSicherung] = useState(false);
  const leseSicherung = useCallback(() => {
    void storage.sicherung(KEYS.log).then(setSicherung);
  }, []);
  // Nach jeder Änderung am Verlauf neu nachsehen (Import, Löschen, Tausch).
  useEffect(leseSicherung, [leseSicherung, log]);

  const exportFile = async () => {
    const blob = new Blob([JSON.stringify(await exportData(), null, 2)], {
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
      const inhalt = JSON.parse(await file.text()) as { log?: unknown; exportedAt?: unknown } | null;
      if (!inhalt || typeof inhalt !== "object" || !Array.isArray(inhalt.log)) {
        toast("Datei nicht erkannt.", { kind: "error" });
        return;
      }
      setDatei({
        inhalt,
        vom: typeof inhalt.exportedAt === "string" ? alsDatum(inhalt.exportedAt) : "",
        anzahl: inhalt.log.length,
      });
    } catch {
      toast("Datei konnte nicht gelesen werden.", { kind: "error" });
    }
  };
  const spieleEin = async (modus: ImportModus) => {
    if (!datei) return;
    const inhalt = datei.inhalt;
    setDatei(null);
    const ok = await importData(inhalt, modus);
    if (ok) toast(modus === "ergaenzen" ? "Backup ergänzt." : "Backup eingespielt.", { kind: "success" });
    else toast("Das Backup ließ sich nicht vollständig speichern.", { kind: "error" });
  };
  const tauscheSicherung = async () => {
    setConfirmSicherung(false);
    const ok = await holeSicherung();
    toast(ok ? "Verlauf zurückgeholt." : "Keine Sicherung vorhanden.", { kind: ok ? "success" : "error" });
  };

  return (
    <div>
      <PageHeader title="Einstellungen" eyebrow="Deine App" />

      <Segment
        label="Bereich"
        options={SEGMENTS.map((s) => ({ value: s.key, label: s.label }))}
        value={seg}
        onChange={setSeg}
        className="mb-4"
      />

      {/* Orte zuerst: die meistgebrauchte Einstellung seit der Ortswahl. */}
      {seg === "training" && (
        <>
          <EquipmentSection />
          <AtlasSection />
          <GymSection />
          <ProfileSection />
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
          <section className="mb-4 rounded-card border-dick border-rand bg-surface-1 p-5">
            <Kicker as="h2" className="mb-2">
              Daten
            </Kicker>
            <p className="mb-3 text-xs leading-relaxed text-muted">
              Alle Einheiten liegen auf diesem Gerät. Sichere sie als Datei
              oder spiele ein Backup zurück.
            </p>
            <div className="mb-4 flex flex-col gap-2">
              <Button variant="secondary" full onClick={() => void exportFile()}>
                <Download size={16} /> Daten exportieren
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
            {sicherung && (
              <div className="mb-4 border-t border-dashed border-line-card pt-4">
                <p className="mb-2 text-xs leading-relaxed text-muted">
                  Sicherung des Verlaufs{sicherung.tag ? ` vom ${alsDatum(sicherung.tag)}` : ""}:{" "}
                  {einheiten(sicherung.anzahl)}. Sie entsteht von selbst vor der ersten
                  Änderung eines Tages.
                </p>
                <Button variant="secondary" full onClick={() => setConfirmSicherung(true)}>
                  <History size={16} /> Sicherung zurückholen
                </Button>
              </div>
            )}
            <Button variant="danger" onClick={() => setConfirmReset(true)}>
              <RotateCcw size={15} /> Alle Daten löschen
            </Button>
          </section>

          <Sheet open={!!datei} onClose={() => setDatei(null)} title="Backup einspielen">
            <p className="mb-4 text-sm leading-relaxed text-muted">
              Die Datei{datei?.vom ? ` vom ${datei.vom}` : ""} enthält{" "}
              {einheiten(datei?.anzahl ?? 0)}.
            </p>
            <div className="flex flex-col gap-2 pb-2">
              <Button variant="strong" full onClick={() => void spieleEin("ergaenzen")}>
                Ergänzen
              </Button>
              <p className="mb-2 text-xs leading-relaxed text-muted">
                Fügt hinzu, was auf diesem Gerät fehlt. Nichts wird überschrieben oder
                gelöscht.
              </p>
              <Button variant="danger" full onClick={() => void spieleEin("ersetzen")}>
                Ersetzen
              </Button>
              <p className="mb-2 text-xs leading-relaxed text-muted">
                Setzt das Gerät auf den Stand der Datei. Der jetzige Verlauf bleibt als
                Sicherung liegen.
              </p>
              <Button variant="ghost" full onClick={() => setDatei(null)}>
                Abbrechen
              </Button>
            </div>
          </Sheet>

          <Sheet
            open={confirmSicherung}
            onClose={() => setConfirmSicherung(false)}
            title="Sicherung zurückholen?"
          >
            <p className="mb-4 text-sm leading-relaxed text-muted">
              Der Verlauf wird auf den Stand
              {sicherung?.tag ? ` vom ${alsDatum(sicherung.tag)}` : " der Sicherung"} gesetzt (
              {einheiten(sicherung?.anzahl ?? 0)}). Der jetzige Verlauf wird dabei zur neuen
              Sicherung, du kannst also zurücktauschen.
            </p>
            <div className="flex flex-col gap-2 pb-2">
              <Button variant="strong" full onClick={() => void tauscheSicherung()}>
                Zurückholen
              </Button>
              <Button variant="ghost" full onClick={() => setConfirmSicherung(false)}>
                Abbrechen
              </Button>
            </div>
          </Sheet>

          {/* Destruktives bestätigt ein Sheet — nie inline (Handoff-Rezept). */}
          <Sheet
            open={confirmReset}
            onClose={() => setConfirmReset(false)}
            title="Wirklich alles löschen?"
          >
            <p className="mb-4 text-sm leading-relaxed text-muted">
              Einheiten, Körperwerte, Cardio, eigene Übungen, Orte, Fotos und
              Einstellungen werden unwiderruflich gelöscht: auf diesem Gerät und,
              wenn du angemeldet bist, auch in der Cloud. Die App startet danach
              wie neu. Ein Export vorher sichert alles als Datei.
            </p>
            <div className="flex flex-col gap-2 pb-2">
              <Button
                variant="danger"
                full
                disabled={loescht}
                onClick={() => {
                  // Lädt die App am Ende neu — das Blatt bleibt bis dahin stehen.
                  setLoescht(true);
                  void resetAll();
                }}
              >
                {loescht ? "Lösche …" : "Unwiderruflich löschen"}
              </Button>
              <Button variant="ghost" full onClick={() => setConfirmReset(false)}>
                Abbrechen
              </Button>
            </div>
          </Sheet>

          <section className="rounded-card border-dick border-rand bg-surface-1 p-5">
            <Kicker as="h2" className="mb-2">
              Als App installieren
            </Kicker>
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
