"use client";

import { Activity } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Kicker } from "@/components/ui/Kicker";
import { Toggle } from "@/components/ui/Toggle";
import { useTraining } from "@/components/providers/TrainingProvider";
import { atlasCode, atlasKopf, fehlerAus, setzeAtlasCode } from "@/lib/atlas/client";
import { ATLAS_FEHLER_TEXT, type AtlasFehlerArt } from "@/lib/atlas/fehler";

const inputCls =
  "min-h-11 rounded-inner border-dick border-rand bg-surface-1 px-3 text-base text-fg placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus";

interface Status {
  configured: boolean;
  modelle?: {
    haupt: string;
    schnell: string;
    ersatz: string;
    ueberschrieben: { haupt: boolean; schnell: boolean; ersatz: boolean };
  };
  zugang?: "frei" | "ok" | "noetig" | "falsch";
}

interface Probe {
  ok: boolean;
  angefragt: string;
  geantwortet?: string;
  ms: number;
  ersatz?: boolean;
  fehler?: AtlasFehlerArt;
  grund?: string;
}

const sek = (ms: number) => `${(ms / 1000).toFixed(1).replace(".", ",")} s`;

/** Ein Satz je geprüftem Modell: wer antwortet, wie schnell, oder woran es hängt. */
function probeSatz(rolle: string, p: Probe): string {
  if (!p.ok) return `${rolle}: ${ATLAS_FEHLER_TEXT[p.fehler ?? "netz"]}${p.grund ? ` Grund: ${p.grund}` : ""}`;
  if (p.ersatz)
    return `${rolle}: ${p.angefragt} nimmt die Anfrage nicht an, der Ersatz ${p.geantwortet} antwortet (${sek(p.ms)}).${p.grund ? ` Grund: ${p.grund}` : ""}`;
  return `${rolle}: ${p.geantwortet ?? p.angefragt} antwortet (${sek(p.ms)}).`;
}

/**
 * ATLAS-Einstellungen: Komposition und ATLAS im Training an/aus, dazu der
 * Stand des Servers — Schlüssel, Modelle, Zugangscode — und ein Selbsttest.
 * Ohne Schlüssel läuft alles über den eingebauten Basisplan.
 * „Im Training“ war früher zweimal da (Zuspruch im Gym-Modus, Live-Coaching
 * hier) — für den Nutzer ist das EINE Frage: redet ATLAS im Training mit?
 */
export function AtlasSection() {
  const { settings, setAiPlanning, setAtlasImTraining } = useTraining();
  const [status, setStatus] = useState<Status | null>(null);
  const [code, setCode] = useState("");
  const [test, setTest] = useState<{ laeuft: boolean; zeilen: string[] }>({ laeuft: false, zeilen: [] });

  const ladeStatus = useCallback(async () => {
    try {
      const r = await fetch("/api/atlas/status", { headers: atlasKopf(), cache: "no-store" });
      setStatus((await r.json()) as Status);
    } catch {
      setStatus(null);
    }
  }, []);
  useEffect(() => {
    setCode(atlasCode());
    void ladeStatus();
  }, [ladeStatus]);

  const speichereCode = async () => {
    setzeAtlasCode(code);
    await ladeStatus();
  };

  const teste = async () => {
    setTest({ laeuft: true, zeilen: [] });
    try {
      const r = await fetch("/api/atlas/status", { method: "POST", headers: atlasKopf() });
      const j = (await r.json().catch(() => null)) as
        | { haupt?: Probe; schnell?: Probe; configured?: unknown; fehler?: unknown }
        | null;
      if (j?.haupt && j.schnell) {
        setTest({
          laeuft: false,
          zeilen: [probeSatz("Plan und Chat", j.haupt), probeSatz("Im Training", j.schnell)],
        });
      } else {
        setTest({ laeuft: false, zeilen: [ATLAS_FEHLER_TEXT[fehlerAus(r.status, j)]] });
      }
    } catch {
      setTest({ laeuft: false, zeilen: [ATLAS_FEHLER_TEXT.netz] });
    }
  };

  const m = status?.modelle;
  const codeNoetig = !!status && status.zugang !== undefined && status.zugang !== "frei";

  return (
    <section className="mb-4 rounded-card border-dick border-rand bg-surface-1 p-5">
      <Kicker as="h2" className="mb-1">
        ATLAS
      </Kicker>
      <p className="mb-4 text-xs leading-relaxed text-muted">
        {status?.configured === false
          ? "Auf dem Server ist kein Schlüssel hinterlegt. ATLAS nutzt den eingebauten Basisplan; für die KI braucht der Server ANTHROPIC_API_KEY."
          : "Stellt deine Einheiten zusammen und begleitet dich im Training."}
      </p>

      <div className="space-y-3">
        <Toggle
          label="Einheiten von ATLAS komponieren"
          hint="Jeden Tag frisch aus dem ganzen Katalog, passend zu Bedarf und Tagesform."
          checked={settings.aiPlanning !== false}
          onChange={setAiPlanning}
        />
        <Toggle
          label="ATLAS im Training"
          hint="Kurzer Zuspruch zwischen den Sätzen und eine Reaktion auf jeden Satz in der Pause — nur als Text, die Musik bleibt."
          checked={settings.coachLive !== false && settings.coachMotivation !== false}
          onChange={setAtlasImTraining}
        />
      </div>

      {status?.configured && (
        <div className="mt-4 border-t border-dashed border-line-card pt-4">
          {codeNoetig && (
            <div className="mb-4">
              <label htmlFor="atlas-code" className="mb-1.5 block text-3xs font-bold text-muted">
                Zugangscode
              </label>
              <div className="flex gap-2">
                <input
                  id="atlas-code"
                  type="password"
                  autoComplete="off"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className={`min-w-0 flex-1 ${inputCls}`}
                />
                <Button variant="secondary" onClick={() => void speichereCode()}>
                  Speichern
                </Button>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted" role="status">
                {status.zugang === "ok"
                  ? "Der Code stimmt."
                  : status.zugang === "falsch"
                    ? "Der Code stimmt nicht."
                    : "Der Server nimmt ATLAS-Anfragen nur mit Code an. Er steht in Vercel unter ATLAS_ZUGANGSCODE."}
              </p>
            </div>
          )}

          {m && (
            <p className="mb-3 text-xs leading-relaxed text-muted">
              Plan, Chat, Auswertung: {m.haupt}
              {m.ueberschrieben.haupt ? " (in Vercel gesetzt)" : ""}. Im Training: {m.schnell}
              {m.ueberschrieben.schnell ? " (in Vercel gesetzt)" : ""}. Ersatz: {m.ersatz}
              {m.ueberschrieben.ersatz ? " (in Vercel gesetzt)" : ""}.
            </p>
          )}
          <Button variant="secondary" full disabled={test.laeuft} onClick={() => void teste()}>
            <Activity size={16} aria-hidden /> {test.laeuft ? "Teste …" : "ATLAS testen"}
          </Button>
          {test.zeilen.length > 0 && (
            <ul className="mt-3 space-y-1.5" role="status">
              {test.zeilen.map((z) => (
                <li key={z} className="break-words text-xs leading-relaxed text-fg">
                  {z}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
