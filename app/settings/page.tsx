"use client";

import { Camera, Download, Plus, RotateCcw, Trash2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { Pressable } from "@/components/ui/pressable";
import { Toggle } from "@/components/ui/Toggle";
import { PageHeader } from "@/components/ui/PageHeader";
import { CloudSyncSection } from "@/components/settings/CloudSyncSection";
import { StravaSection } from "@/components/settings/StravaSection";
import { AppearanceSection } from "@/components/settings/AppearanceSection";
import { AppIconSection } from "@/components/settings/AppIconSection";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { useTraining } from "@/components/providers/TrainingProvider";
import { downscaleImage, genPhotoId, putPhoto, uploadPhoto } from "@/lib/photo-store";
import { fmtDateShort } from "@/lib/format";

export default function SettingsPage() {
  const {
    resetAll,
    body,
    addBodyMetric,
    deleteBodyMetric,
    exportData,
    importData,
    settings,
    setVoiceCues,
    setSuperset,
    setWeightStep,
    setBikeWarmup,
    setCardioFinisher,
    setCoachMotivation,
  } = useTraining();

  const [confirmReset, setConfirmReset] = useState(false);
  const [bw, setBw] = useState("");
  const [waist, setWaist] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const photoRef = useRef<HTMLInputElement>(null);
  const [photoId, setPhotoId] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  const clearPhoto = () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(null);
    setPhotoId(null);
  };

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoBusy(true);
    try {
      const blob = await downscaleImage(file);
      const id = genPhotoId();
      await putPhoto(id, blob);
      void uploadPhoto(id, blob);
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      setPhotoId(id);
      setPhotoUrl(URL.createObjectURL(blob));
    } finally {
      setPhotoBusy(false);
    }
  };

  const addBody = () => {
    if (!bw.trim() && !waist.trim() && !photoId) return;
    void addBodyMetric({
      date: new Date().toISOString(),
      weightKg: bw.trim() ? Number(bw) : undefined,
      waistCm: waist.trim() ? Number(waist) : undefined,
      photoId: photoId ?? undefined,
    });
    setBw("");
    setWaist("");
    clearPhoto();
  };

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
  };

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const ok = await importData(JSON.parse(await file.text()));
      setImportMsg(ok ? "Import erfolgreich." : "Datei nicht erkannt.");
    } catch {
      setImportMsg("Datei konnte nicht gelesen werden.");
    }
  };

  return (
    <div>
      <PageHeader title="Einstellungen" eyebrow="App" />

      <AppearanceSection />

      <AppIconSection />

      <ProfileSection />

      <section className="mb-4 rounded-card border border-surface-3 bg-surface-1 shadow-card p-5">
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">
          Körperdaten
        </p>
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={bw}
            onChange={(e) => setBw(e.target.value)}
            placeholder="Gewicht kg"
            aria-label="Körpergewicht in kg"
            className="min-w-0 flex-1 rounded-card bg-surface-2 px-3 py-2.5 text-center font-mono tabular-nums text-fg placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent-sessions"
          />
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={waist}
            onChange={(e) => setWaist(e.target.value)}
            placeholder="Bauch cm"
            aria-label="Bauchumfang in cm"
            className="min-w-0 flex-1 rounded-card bg-surface-2 px-3 py-2.5 text-center font-mono tabular-nums text-fg placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent-sessions"
          />
        </div>
        <input
          ref={photoRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onPhoto}
          className="hidden"
        />
        {photoUrl ? (
          <div className="mt-2 flex items-center gap-3 rounded-card bg-surface-2 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt="Vorschau"
              className="h-14 w-14 rounded-card object-cover"
            />
            <span className="flex-1 text-sm text-muted">Foto angehängt</span>
            <Pressable
              onClick={clearPhoto}
              aria-label="Foto entfernen"
              className="rounded-card p-1.5 text-muted focus:outline-none"
            >
              <X size={16} />
            </Pressable>
          </div>
        ) : (
          <Pressable
            onClick={() => photoRef.current?.click()}
            disabled={photoBusy}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-card bg-surface-2 py-2.5 text-sm font-medium text-fg focus:outline-none disabled:opacity-50"
          >
            <Camera size={16} /> {photoBusy ? "Lädt…" : "Fortschritts-Foto"}
          </Pressable>
        )}
        <Pressable
          onClick={addBody}
          disabled={!bw.trim() && !waist.trim() && !photoId}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-card bg-strong py-2.5 text-sm font-medium text-on-strong focus:outline-none disabled:opacity-40"
        >
          <Plus size={16} strokeWidth={2.5} /> Eintragen
        </Pressable>
        {body.length > 0 && (
          <div className="mt-3 space-y-1">
            {[...body]
              .map((m, i) => ({ m, i }))
              .reverse()
              .map(({ m, i }) => (
                <div
                  key={m.date + i}
                  className="flex items-center justify-between gap-2 rounded-card bg-base px-3 py-2"
                >
                  <span className="flex items-center gap-1.5 text-sm text-muted">
                    {fmtDateShort(m.date)}
                    {m.weightKg != null ? ` · ${m.weightKg} kg` : ""}
                    {m.waistCm != null ? ` · ${m.waistCm} cm` : ""}
                    {m.photoId && <Camera size={13} className="text-muted" />}
                  </span>
                  <Pressable
                    onClick={() => deleteBodyMetric(i)}
                    aria-label="Eintrag löschen"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card text-muted focus:outline-none"
                  >
                    <Trash2 size={14} />
                  </Pressable>
                </div>
              ))}
          </div>
        )}
      </section>

      <section className="mb-4 rounded-card border border-surface-3 bg-surface-1 shadow-card p-5">
        <p className="mb-4 font-mono text-xs uppercase tracking-widest text-muted">
          Gym-Modus
        </p>
        <div className="space-y-5">
          <Toggle
            checked={!!settings.voiceCues}
            onChange={setVoiceCues}
            label="Sprach-Ansagen"
            hint="Sagt Satzpause-Countdown und neue Rekorde an — freihändig im Gym. Browser muss Sprachausgabe unterstützen."
          />
          <Toggle
            checked={!!settings.superset}
            onChange={setSuperset}
            label="Supersätze"
            hint="Die letzten zwei Übungen im Wechsel — spart Pausenzeit, mehr passt ins Zeitfenster."
          />
          <Toggle
            checked={!!settings.bikeWarmup}
            onChange={setBikeWarmup}
            label="Auf dem Bike aufwärmen"
            hint="Stellt jeder Einheit ein lockeres 3-Minuten-Einrollen auf dem Peloton voran (Bike muss im Gym aktiv sein)."
          />
          <Toggle
            checked={!!settings.cardioFinisher}
            onChange={setCardioFinisher}
            label="Cardio-Finisher"
            hint="Hängt an A/B/C einen kurzen Peloton-Sprintblock ans Ende — extra Kondition, jederzeit abschaltbar."
          />
          <Toggle
            checked={settings.coachMotivation !== false}
            onChange={setCoachMotivation}
            label="Coach-Motivation im Training"
            hint="ATLAS spornt dich zwischen den Sätzen kurz an — nur als Text, stört die Musik nie. Jederzeit abschaltbar."
          />
          <div>
            <p className="text-sm font-medium text-fg">Gewichtsstufe</p>
            <p className="mb-2 mt-0.5 text-xs leading-relaxed text-muted">
              Kleinste Hantelstufe, die du laden kannst — die Vorschläge runden darauf.
            </p>
            <div className="flex gap-1 rounded-card bg-surface-2 p-1">
              {[1.25, 2.5, 5].map((s) => {
                const active = (settings.weightStep ?? 2.5) === s;
                return (
                  <Pressable
                    key={s}
                    onClick={() => setWeightStep(s)}
                    className={
                      "flex-1 rounded-card py-2 text-sm font-medium tabular-nums focus:outline-none " +
                      (active ? "bg-strong text-on-strong" : "text-muted")
                    }
                  >
                    {`${s}`.replace(".", ",")} kg
                  </Pressable>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <CloudSyncSection />

      <StravaSection />

      <section className="mb-4 rounded-card border border-surface-3 bg-surface-1 shadow-card p-5">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted">
          Als App installieren
        </p>
        <p className="text-xs leading-relaxed text-muted">
          iPhone: in Safari unten auf „Teilen“ tippen → „Zum Home-Bildschirm“.
          Android: im Chrome-Menü „App installieren“. Danach startet Training im
          Vollbild mit eigenem Icon — und läuft auch offline.
        </p>
      </section>

      <section className="rounded-card border border-surface-3 bg-surface-1 shadow-card p-5">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted">Daten</p>
        <p className="mb-3 text-xs leading-relaxed text-muted">
          Alle Einheiten werden auf diesem Gerät gespeichert. Sichere sie als
          Datei oder spiele ein Backup zurück.
        </p>
        <div className="mb-4 flex flex-col gap-2">
          <Pressable
            onClick={exportFile}
            className="flex items-center justify-center gap-2 rounded-card bg-surface-2 py-2.5 text-sm font-medium text-fg focus:outline-none"
          >
            <Download size={16} /> Export (JSON)
          </Pressable>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={onImport}
            className="hidden"
          />
          <Pressable
            onClick={() => fileRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-card bg-surface-2 py-2.5 text-sm font-medium text-fg focus:outline-none"
          >
            <Upload size={16} /> Import (JSON)
          </Pressable>
          {importMsg && <p className="text-xs text-muted">{importMsg}</p>}
        </div>
        {!confirmReset ? (
          <Pressable
            onClick={() => setConfirmReset(true)}
            className="flex items-center gap-2 rounded-card px-1 py-1 text-sm text-muted focus:outline-none"
          >
            <RotateCcw size={15} /> Ganzen Verlauf zurücksetzen
          </Pressable>
        ) : (
          <div className="flex items-center gap-2">
            <Pressable
              onClick={() => {
                void resetAll();
                setConfirmReset(false);
              }}
              className="rounded-card bg-rose-950 px-3 py-2 text-sm text-rose-300 focus:outline-none"
            >
              Wirklich löschen
            </Pressable>
            <Pressable
              onClick={() => setConfirmReset(false)}
              className="rounded-card px-3 py-2 text-sm text-muted focus:outline-none"
            >
              Abbrechen
            </Pressable>
          </div>
        )}
      </section>
    </div>
  );
}
