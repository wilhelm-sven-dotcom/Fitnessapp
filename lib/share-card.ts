import type { PhasenFigurDef, PhasenPrimitive } from "@/lib/phasen/figuren";
import type { Region } from "@/lib/phasen/band";
import type { RecordKind } from "@/lib/records";
import {
  GRUND_DUNKEL,
  KARTE_DUNKEL,
  NEBEN_DUNKEL,
  SCHEIBE,
  TINTE_DUNKEL,
  TINTE_HELL,
} from "@/lib/grundfarben";

/**
 * Teilen-Poster im Look „Regionen“: 1080 × 1350 (4:5), immer auf warmem
 * Dunkel (ein Bild kennt keinen App-Modus, deshalb feste Farben aus
 * `lib/grundfarben.ts`). In der Mitte eine Karte in der Regionsfarbe der
 * Übung mit der Figur (Endphase), darunter der gehobene Satz groß und — bei
 * Gewichtsrekorden — das geschätzte 1RM beschriftet darunter, nie als nackte
 * Zahl. Schriften aus den next/font-Variablen (document.fonts.load; der
 * System-Fallback zeichnet trotzdem); Zahlen de-DE.
 */

export interface ShareCardData {
  kind: "maximum" | "studie";
  /** Laufende Nummer der Einheit („Einheit 132“). */
  plattenNr: number;
  dateISO: string;
  /** Figur der Übung (maximum) bzw. der Hauptübung (studie). */
  figur?: PhasenFigurDef;
  /** Region der Übung → Farbe der Karte. */
  region?: Region;
  /** maximum: Übungsname, Kennzahl, Art, gehobener Satz, Sprung. */
  exName?: string;
  wert?: number;
  einheit?: string;
  rekordArt?: RecordKind;
  satz?: string;
  delta?: number;
  prevNr?: number;
  /** studie: Titel und Kennzahlen. */
  titel?: string;
  kaderZahl?: number;
  tonnage?: number;
  dauerMin?: number;
  /** Körpergewicht für die Fußzeile, optional. */
  koerperKg?: number;
}

const W = 1080;
const H = 1350;

const KARTE: Record<Region, { flaeche: string; schrift: string }> = {
  unterkoerper: { flaeche: SCHEIBE.rot, schrift: "#ffffff" },
  push: { flaeche: SCHEIBE.blau, schrift: "#ffffff" },
  pull: { flaeche: SCHEIBE.gelb, schrift: TINTE_HELL },
  core: { flaeche: SCHEIBE.gruen, schrift: "#ffffff" },
  cardio: { flaeche: KARTE_DUNKEL, schrift: TINTE_DUNKEL },
};

function cssVar(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

const fmtDe = (n: number, digits = 1) =>
  n.toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: digits });

/** Endphase einer Phasenfigur direkt auf den Canvas (Primitive → Striche). */
function drawFigur(
  ctx: CanvasRenderingContext2D,
  figur: PhasenFigurDef,
  x: number,
  y: number,
  breite: number,
  farbe: string,
) {
  const s = breite / 48;
  const phase = figur.phases[figur.phases.length - 1];
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = farbe;
  ctx.fillStyle = farbe;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const line = (a: readonly [number, number], b: readonly [number, number], w: number) => {
    ctx.lineWidth = w * s;
    ctx.beginPath();
    ctx.moveTo(a[0] * s, a[1] * s);
    ctx.lineTo(b[0] * s, b[1] * s);
    ctx.stroke();
  };
  const kreis = (c: readonly [number, number], r: number) => {
    ctx.beginPath();
    ctx.arc(c[0] * s, c[1] * s, r * s, 0, Math.PI * 2);
    ctx.fill();
  };
  const prim = (p: PhasenPrimitive) => {
    switch (p.t) {
      case "torso":
        line(p.a, p.b, 9);
        break;
      case "limb": {
        ctx.lineWidth = 5 * s;
        ctx.beginPath();
        p.pts.forEach(([px, py], i) =>
          i === 0 ? ctx.moveTo(px * s, py * s) : ctx.lineTo(px * s, py * s),
        );
        ctx.stroke();
        break;
      }
      case "head":
        kreis(p.c, 3.5);
        break;
      case "bar":
        line(p.a, p.b, 2);
        kreis(p.a, 2.5);
        kreis(p.b, 2.5);
        break;
      case "strich":
        line(p.a, p.b, p.w ?? 2);
        break;
      case "scheibe":
        kreis(p.c, p.r ?? 2.5);
        break;
    }
  };
  phase.forEach(prim);
  ctx.restore();
}

/** Das Zeichen (Scheiben auf der Stange) klein in die Kopfzeile. */
function drawMarke(ctx: CanvasRenderingContext2D, x: number, y: number, groesse: number) {
  const s = groesse / 48;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineCap = "round";
  const strich = (x1: number, y1: number, x2: number, y2: number, w: number, farbe: string) => {
    ctx.strokeStyle = farbe;
    ctx.lineWidth = w * s;
    ctx.beginPath();
    ctx.moveTo(x1 * s, y1 * s);
    ctx.lineTo(x2 * s, y2 * s);
    ctx.stroke();
  };
  strich(6.5, 24, 41.5, 24, 2.6, TINTE_DUNKEL);
  strich(13.5, 18.5, 13.5, 29.5, 2.6, TINTE_DUNKEL);
  (
    [
      [18.5, 13, 5.2, SCHEIBE.rot],
      [24.6, 11, 5.2, SCHEIBE.blau],
      [30.4, 8.8, 4.6, SCHEIBE.gelb],
      [35.6, 6.4, 4.2, SCHEIBE.gruen],
    ] as const
  ).forEach(([sx, h, w, f]) => strich(sx, 24 - h, sx, 24 + h, w, f));
  ctx.restore();
}

/** Text auf höchstens zwei Zeilen umbrechen; Schrift wird kleiner, bis es passt. */
function zweiZeilen(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxBreite: number,
  font: (px: number) => string,
  start: number,
  min: number,
): { zeilen: string[]; px: number } {
  for (let px = start; px >= min; px -= 4) {
    ctx.font = font(px);
    const woerter = text.split(/\s+/);
    const zeilen: string[] = [];
    let akt = "";
    for (const w of woerter) {
      const probe = akt ? `${akt} ${w}` : w;
      if (ctx.measureText(probe).width <= maxBreite) akt = probe;
      else {
        if (akt) zeilen.push(akt);
        akt = w;
      }
    }
    if (akt) zeilen.push(akt);
    if (zeilen.length <= 2 && zeilen.every((z) => ctx.measureText(z).width <= maxBreite))
      return { zeilen, px };
  }
  ctx.font = font(min);
  return { zeilen: [text], px: min };
}

export async function renderShareCard(data: ShareCardData): Promise<Blob> {
  const display = cssVar("--font-display", "Archivo, system-ui, sans-serif");
  const body = cssVar("--font-body", "Archivo, system-ui, sans-serif");

  // Schriften anwärmen (best effort).
  if (typeof document !== "undefined" && document.fonts?.load) {
    try {
      await Promise.all([
        document.fonts.load(`800 120px ${display}`),
        document.fonts.load(`600 32px ${body}`),
        document.fonts.load(`500 36px ${body}`),
      ]);
    } catch {
      /* Systemfallback zeichnet trotzdem */
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  // Die breite Schnittbreite der Titelschrift (wo der Browser sie kennt).
  const breit = (on: boolean) => {
    try {
      (ctx as CanvasRenderingContext2D & { fontStretch?: string }).fontStretch = on
        ? "expanded"
        : "normal";
    } catch {
      /* ältere Engines: normale Breite */
    }
  };
  const sperren = (px: number) => {
    try {
      (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${px}px`;
    } catch {
      /* ältere Engines: ohne Sperrung */
    }
  };

  ctx.fillStyle = GRUND_DUNKEL;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = "alphabetic";

  // Kopfzeile: Zeichen + Wortmarke links, Datum rechts.
  drawMarke(ctx, 60, 64, 76);
  ctx.fillStyle = TINTE_DUNKEL;
  ctx.textAlign = "left";
  breit(true);
  ctx.font = `800 40px ${display}`;
  ctx.fillText("Platte 311", 150, 116);
  breit(false);
  const datum = new Date(data.dateISO).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  ctx.fillStyle = NEBEN_DUNKEL;
  ctx.textAlign = "right";
  ctx.font = `500 32px ${body}`;
  ctx.fillText(datum, W - 60, 114);

  // Karte in der Regionsfarbe.
  const farbe = KARTE[data.region ?? "cardio"];
  const kx = 60;
  const ky = 180;
  const kw = W - 120;
  const kh = 700;
  ctx.fillStyle = farbe.flaeche;
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") ctx.roundRect(kx, ky, kw, kh, 56);
  else ctx.rect(kx, ky, kw, kh);
  ctx.fill();

  ctx.fillStyle = farbe.schrift;
  ctx.textAlign = "left";
  ctx.font = `600 30px ${body}`;
  sperren(5);
  ctx.fillText(
    data.kind === "maximum" ? "PERSÖNLICHER REKORD" : "TRAINING ERLEDIGT",
    kx + 56,
    ky + 86,
  );
  sperren(0);

  if (data.figur) {
    const fw = 360;
    drawFigur(ctx, data.figur, (W - fw) / 2, ky + 120, fw, farbe.schrift);
  }

  const name = data.kind === "maximum" ? (data.exName ?? "") : (data.titel ?? "Einheit");
  breit(true);
  const { zeilen, px } = zweiZeilen(ctx, name, kw - 112, (p) => `800 ${p}px ${display}`, 68, 40);
  ctx.fillStyle = farbe.schrift;
  ctx.textAlign = "left";
  zeilen.forEach((z, i) => {
    ctx.fillText(z, kx + 56, ky + kh - 56 - (zeilen.length - 1 - i) * (px * 1.12));
  });

  // Der große Wert unter der Karte.
  const gross =
    data.kind === "maximum"
      ? data.rekordArt === "weight" && data.satz
        ? data.satz
        : `${fmtDe(data.wert ?? 0)} ${data.einheit ?? ""}`.trim()
      : `${data.kaderZahl ?? 0} ${(data.kaderZahl ?? 0) === 1 ? "Satz" : "Sätze"} · ${fmtDe(
          (data.tonnage ?? 0) / 1000,
        )} t`;
  ctx.fillStyle = TINTE_DUNKEL;
  ctx.textAlign = "left";
  let grad = 120;
  ctx.font = `800 ${grad}px ${display}`;
  while (grad > 60 && ctx.measureText(gross).width > W - 120) {
    grad -= 6;
    ctx.font = `800 ${grad}px ${display}`;
  }
  ctx.fillText(gross, 60, ky + kh + 40 + grad);
  breit(false);

  // Zeile darunter: 1RM beschriftet bzw. Dauer/Sprung.
  const teile: string[] = [];
  if (data.kind === "maximum") {
    if (data.rekordArt === "weight" && data.satz)
      teile.push(`Geschätztes 1RM ${fmtDe(data.wert ?? 0)} kg`);
    if (data.delta != null && data.delta > 0)
      teile.push(
        `+${fmtDe(data.delta)} ${data.einheit ?? ""} über ${
          data.prevNr != null ? `Einheit ${data.prevNr}` : "dem Bestwert"
        }`,
      );
  } else if (data.dauerMin) {
    teile.push(`${data.dauerMin} Min`);
  }
  if (teile.length) {
    ctx.fillStyle = NEBEN_DUNKEL;
    ctx.font = `500 38px ${body}`;
    ctx.fillText(teile.join(" · "), 60, ky + kh + 40 + grad + 64);
  }

  // Fußzeile: Einheit links, Körpergewicht rechts.
  ctx.fillStyle = NEBEN_DUNKEL;
  ctx.font = `600 30px ${body}`;
  ctx.textAlign = "left";
  ctx.fillText(`Einheit ${data.plattenNr}`, 60, H - 64);
  if (data.koerperKg != null) {
    ctx.textAlign = "right";
    ctx.fillText(`${fmtDe(data.koerperKg)} kg Körpergewicht`, W - 60, H - 64);
  }

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("no blob"))), "image/png");
  });
}
