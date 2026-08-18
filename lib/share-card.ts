import type { PhasenFigurDef, PhasenPrimitive } from "@/lib/phasen/figuren";

/**
 * Share-Poster „Platte 311" — die Cyanotypie (Poster.dc): 1080 × 1350 (4:5),
 * kompletter Blaudruck mit FESTEN Farben (modusunabhängig — ein physischer
 * Abzug kennt kein Theme, deshalb kein getComputedStyle für Farben):
 * Grund Blaupause #1F5C86, Figur/Raster/Schrift Kreide #F4F9FC,
 * Plattennummer Messing #D4A649. Die Phasenfigur wird direkt aus den
 * Primitiven auf den Canvas gezeichnet (Endphase). Schriften kommen aus den
 * next/font-Variablen (document.fonts.load, System-Fallback zeichnet
 * trotzdem); Zahlen de-DE; rounded-rect unnötig — das Poster ist randlos.
 */

export interface ShareCardData {
  kind: "maximum" | "studie";
  /** Plattennummer fürs Messing-Schild („PLATTE Nr. 132"). */
  plattenNr: number;
  dateISO: string;
  /** Figur der Übung (maximum) bzw. der Hauptübung (studie). */
  figur?: PhasenFigurDef;
  /** maximum: Übungsname + Bestwert. */
  exName?: string;
  wert?: number;
  einheit?: string;
  /** studie: Studien-Titel + Kennzahlen. */
  titel?: string;
  kaderZahl?: number;
  tonnage?: number;
  /** Körpermasse fürs Fußzeilen-Etikett („82,4 KG KM"), optional. */
  koerperKg?: number;
}

const W = 1080;
const H = 1350;
/** Referenzlayout 400×500 (Poster.dc) → Export-Skala. */
const S = W / 400;

const BLAUPAUSE = "#1f5c86";
const KREIDE = "#f4f9fc";
const MESSING = "#d4a649";

function cssVar(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

const fmtDe = (n: number, digits = 1) =>
  n.toLocaleString("de-DE", { minimumFractionDigits: digits, maximumFractionDigits: digits });

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

export async function renderShareCard(data: ShareCardData): Promise<Blob> {
  const display = cssVar("--font-oldstandard", "'Old Standard TT', Georgia, serif");
  const mono = cssVar("--font-plexmono", "'IBM Plex Mono', ui-monospace, monospace");

  // Schriften anwärmen (best effort) — load() akzeptiert die Familien-Stacks.
  if (typeof document !== "undefined" && document.fonts?.load) {
    try {
      await Promise.all([
        document.fonts.load(`italic 400 92px ${display}`),
        document.fonts.load(`700 151px ${mono}`),
        document.fonts.load(`600 30px ${mono}`),
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

  // Blaudruck-Grund + Kreide-Raster (0,5 px alle 40 im Referenzmaß).
  ctx.fillStyle = BLAUPAUSE;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(244, 249, 252, 0.22)";
  ctx.lineWidth = 0.5 * S;
  for (let x = 40 * S; x < W; x += 40 * S) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 40 * S; y < H; y += 40 * S) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  const padX = 22 * S;
  ctx.textBaseline = "alphabetic";

  // Kopfzeile: PLATTE 311 | CYANOTYPIE (gesperrt via manuellem Spacing
  // unnötig — Canvas kennt letterSpacing als ctx-Property in neuen Browsern,
  // Fallback: einfach setzen, sonst normal zeichnen).
  const setSpacing = (em: number, px: number) => {
    try {
      (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing =
        `${Math.round(em * px)}px`;
    } catch {
      /* ältere Engines: ohne Sperrung */
    }
  };
  ctx.fillStyle = "rgba(244, 249, 252, 0.85)";
  ctx.font = `600 ${9 * S}px ${mono}`;
  setSpacing(0.24, 9 * S);
  ctx.textAlign = "left";
  ctx.fillText("PLATTE 311", padX, 26 * S + 9 * S);
  ctx.textAlign = "right";
  ctx.fillText("CYANOTYPIE", W - padX, 26 * S + 9 * S);

  // Tafel-Kicker + Messlinie.
  ctx.fillStyle = KREIDE;
  ctx.textAlign = "center";
  ctx.font = `600 ${11 * S}px ${mono}`;
  setSpacing(0.34, 11 * S);
  ctx.fillText(
    data.kind === "maximum" ? "PERSÖNLICHER REKORD" : "TRAINING ERLEDIGT",
    W / 2,
    64 * S,
  );
  setSpacing(0, 0);
  ctx.strokeStyle = "rgba(244, 249, 252, 0.7)";
  ctx.lineWidth = 1 * S;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 55 * S, 74 * S);
  ctx.lineTo(W / 2 + 55 * S, 74 * S);
  ctx.stroke();

  // Figur (Endphase) in Kreide.
  if (data.figur) {
    const fw = 170 * S;
    drawFigur(ctx, data.figur, (W - fw) / 2, 88 * S, fw, KREIDE);
  }

  // Name / Titel in Old-Standard-Kursive — lange Studien-Titel werden auf
  // Plattenbreite eingepasst (Canvas kennt keinen Zeilenumbruch).
  ctx.fillStyle = KREIDE;
  const name = data.kind === "maximum" ? (data.exName ?? "") : (data.titel ?? "");
  let nameGrad = 34;
  ctx.font = `italic 400 ${nameGrad * S}px ${display}`;
  while (nameGrad > 18 && ctx.measureText(name).width > W - 2 * padX) {
    nameGrad -= 2;
    ctx.font = `italic 400 ${nameGrad * S}px ${display}`;
  }
  ctx.fillText(name, W / 2, 300 * S);

  // Der große Wert (Plex bold) + Einheit — ganze Zahlen ohne Dezimalstelle
  // (e1RM ist gerundet; „127,0" gaukelt Präzision vor, die es nicht gibt).
  const wertText =
    data.kind === "maximum"
      ? fmtDe(data.wert ?? 0, (data.wert ?? 0) % 1 === 0 ? 0 : 1)
      : fmtDe((data.tonnage ?? 0) / 1000, 1);
  const einheit = data.kind === "maximum" ? (data.einheit ?? "kg").toUpperCase() : "T";
  ctx.font = `700 ${56 * S}px ${mono}`;
  const wertBreite = ctx.measureText(wertText).width;
  ctx.textAlign = "left";
  const wertX = (W - wertBreite) / 2 - 10 * S;
  ctx.fillText(wertText, wertX, 356 * S);
  ctx.font = `500 ${13 * S}px ${mono}`;
  ctx.fillText(einheit, wertX + wertBreite + 6 * S, 356 * S);

  // studie: Kader-Zeile unter dem Wert.
  if (data.kind === "studie" && data.kaderZahl != null) {
    ctx.textAlign = "center";
    ctx.font = `500 ${10 * S}px ${mono}`;
    setSpacing(0.2, 10 * S);
    ctx.fillStyle = "rgba(244, 249, 252, 0.85)";
    ctx.fillText(`${data.kaderZahl} SÄTZE · ERLEDIGT`, W / 2, 382 * S);
    setSpacing(0, 0);
  }

  // Fußzeile: Messing-Plattenschild links, Datum (+ Körpermasse) rechts.
  const datum = new Date(data.dateISO)
    .toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })
    .replace(".", "")
    .toUpperCase();
  ctx.textAlign = "left";
  ctx.fillStyle = MESSING;
  ctx.font = `600 ${10 * S}px ${mono}`;
  setSpacing(0.2, 10 * S);
  ctx.fillText(`EINHEIT ${data.plattenNr}`, padX, H - 26 * S);
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(244, 249, 252, 0.85)";
  ctx.font = `500 ${9 * S}px ${mono}`;
  setSpacing(0.2, 9 * S);
  ctx.fillText(
    data.koerperKg != null ? `${datum} · ${fmtDe(data.koerperKg)} KG KM` : datum,
    W - padX,
    H - 26 * S,
  );
  setSpacing(0, 0);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("no blob"))), "image/png");
  });
}
