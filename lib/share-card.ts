import type { PhasenFigurDef, PhasenPrimitive } from "@/lib/phasen/figuren";
import type { Region } from "@/lib/phasen/band";
import type { RecordKind } from "@/lib/records";
import { MARKE, TINTE_HELL } from "@/lib/grundfarben";
import { BLASE_D, SCHEIBEN_SPOTTER } from "@/lib/marke-art";
import { APP_NAME } from "@/lib/marke";

/**
 * Teilen-Poster im Look „spotter“: 1080 × 1350 (4:5). Rekord auf Signalorange,
 * erledigtes Training auf Elektroblau (ein Bild kennt keinen App-Modus,
 * deshalb feste Farben aus `lib/grundfarben.ts`). In der Mitte eine weiße,
 * leicht gedrehte Karte mit dickem Tinte-Rand und hartem Schatten: „PR!“ bzw.
 * „Erledigt!“, die Figur der Übung und ihr Name. Darunter der gehobene Satz
 * groß und — bei Gewichtsrekorden — das geschätzte 1RM beschriftet, nie als
 * nackte Zahl. Schriften aus den next/font-Variablen (document.fonts.load;
 * der System-Fallback zeichnet trotzdem); Zahlen de-DE.
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

/** Das Zeichen (Sprechblase mit Hantel) in die Kopfzeile, 64er-Zeichnung. */
function drawMarke(ctx: CanvasRenderingContext2D, x: number, y: number, groesse: number) {
  const s = groesse / 64;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = TINTE_HELL;
  ctx.lineWidth = 4;
  if (typeof Path2D === "function") {
    const blase = new Path2D(BLASE_D);
    ctx.fillStyle = "#ffffff";
    ctx.fill(blase);
    ctx.stroke(blase);
  }
  ctx.beginPath();
  ctx.moveTo(14, 29);
  ctx.lineTo(50, 29);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.fillStyle = MARKE.blau;
  for (const [sx, sy, w, h] of SCHEIBEN_SPOTTER) {
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") ctx.roundRect(sx, sy, w, h, 2.5);
    else ctx.rect(sx, sy, w, h);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/** Abgerundetes Rechteck mit dickem Rand und hartem Versatz-Schatten. */
function kasten(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  flaeche: string,
  rand: number,
  schatten: number,
) {
  const pfad = () => {
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
  };
  if (schatten > 0) {
    ctx.save();
    ctx.translate(schatten, schatten);
    ctx.fillStyle = TINTE_HELL;
    pfad();
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = flaeche;
  pfad();
  ctx.fill();
  ctx.lineWidth = rand;
  ctx.strokeStyle = TINTE_HELL;
  pfad();
  ctx.stroke();
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
  const display = cssVar("--font-display", "'Bricolage Grotesque', system-ui, sans-serif");
  const body = cssVar("--font-body", "Onest, system-ui, sans-serif");

  // Schriften anwärmen (best effort).
  if (typeof document !== "undefined" && document.fonts?.load) {
    try {
      await Promise.all([
        document.fonts.load(`800 120px ${display}`),
        document.fonts.load(`600 32px ${body}`),
        document.fonts.load(`700 36px ${body}`),
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

  const rekord = data.kind === "maximum";
  // Rekord: Tinte auf Orange (6,1:1); Training: Weiß auf Blau (6,2:1).
  const grund = rekord ? MARKE.orange : MARKE.blau;
  const schrift = rekord ? TINTE_HELL : "#ffffff";
  ctx.fillStyle = grund;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = "alphabetic";

  // Kopfzeile: Zeichen + Wortmarke links, Datum rechts.
  drawMarke(ctx, 60, 52, 88);
  ctx.fillStyle = schrift;
  ctx.textAlign = "left";
  ctx.font = `800 52px ${display}`;
  ctx.fillText(APP_NAME, 168, 118);
  const datum = new Date(data.dateISO).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  ctx.textAlign = "right";
  ctx.font = `600 32px ${body}`;
  ctx.fillText(datum, W - 60, 114);

  // Die Karte: weiß, gedreht, Rand und harter Schatten.
  const kx = 110;
  const ky = 250;
  const kw = W - 220;
  const kh = 560;
  ctx.save();
  ctx.translate(kx + kw / 2, ky + kh / 2);
  ctx.rotate((-4 * Math.PI) / 180);
  ctx.translate(-(kx + kw / 2), -(ky + kh / 2));
  kasten(ctx, kx, ky, kw, kh, 52, "#ffffff", 9, 18);

  ctx.fillStyle = MARKE.blau;
  ctx.textAlign = "left";
  const ruf = rekord ? "PR!" : "Erledigt!";
  let rufPx = rekord ? 230 : 150;
  ctx.font = `800 ${rufPx}px ${display}`;
  const rufMax = data.figur ? kw - 112 - 300 : kw - 112;
  while (rufPx > 90 && ctx.measureText(ruf).width > rufMax) {
    rufPx -= 8;
    ctx.font = `800 ${rufPx}px ${display}`;
  }
  ctx.fillText(ruf, kx + 56, ky + 56 + rufPx * 0.8);

  if (data.figur) {
    const fw = 280;
    drawFigur(ctx, data.figur, kx + kw - fw - 40, ky + 40, fw, TINTE_HELL);
  }

  const name = rekord ? (data.exName ?? "") : (data.titel ?? "Einheit");
  const { zeilen, px } = zweiZeilen(ctx, name, kw - 112, (p) => `800 ${p}px ${display}`, 64, 40);
  ctx.fillStyle = TINTE_HELL;
  ctx.textAlign = "left";
  zeilen.forEach((z, i) => {
    ctx.fillText(z, kx + 56, ky + kh - 52 - (zeilen.length - 1 - i) * (px * 1.12));
  });
  ctx.restore();

  // Sticker an der Kartenecke: Sprung über dem alten Bestwert bzw. Dauer.
  const sticker =
    rekord && data.delta != null && data.delta > 0
      ? `+${fmtDe(data.delta)} ${data.einheit ?? ""}`.trim()
      : !rekord && data.dauerMin
        ? `${data.dauerMin} Min`
        : null;
  if (sticker) {
    ctx.save();
    ctx.font = `800 50px ${display}`;
    const sw = ctx.measureText(sticker).width + 56;
    const sx = W - 90 - sw;
    const sy = ky - 46;
    ctx.translate(sx + sw / 2, sy + 44);
    ctx.rotate((8 * Math.PI) / 180);
    ctx.translate(-(sx + sw / 2), -(sy + 44));
    kasten(ctx, sx, sy, sw, 88, 22, MARKE.sonne, 6, 0);
    ctx.fillStyle = TINTE_HELL;
    ctx.textAlign = "center";
    ctx.fillText(sticker, sx + sw / 2, sy + 62);
    ctx.restore();
  }

  // Der große Wert unter der Karte.
  const gross = rekord
    ? data.rekordArt === "weight" && data.satz
      ? data.satz
      : `${fmtDe(data.wert ?? 0)} ${data.einheit ?? ""}`.trim()
    : `${data.kaderZahl ?? 0} ${(data.kaderZahl ?? 0) === 1 ? "Satz" : "Sätze"} · ${fmtDe(
        (data.tonnage ?? 0) / 1000,
      )} t`;
  ctx.fillStyle = schrift;
  ctx.textAlign = "left";
  let grad = 140;
  ctx.font = `800 ${grad}px ${display}`;
  while (grad > 60 && ctx.measureText(gross).width > W - 120) {
    grad -= 6;
    ctx.font = `800 ${grad}px ${display}`;
  }
  const wertY = ky + kh + 90 + grad;
  ctx.fillText(gross, 60, wertY);

  // Zeile darunter: 1RM beschriftet bzw. Bezug zum alten Bestwert.
  const teile: string[] = [];
  if (rekord) {
    if (data.rekordArt === "weight" && data.satz)
      teile.push(`Geschätztes 1RM ${fmtDe(data.wert ?? 0)} kg`);
    if (data.delta != null && data.delta > 0 && data.prevNr != null)
      teile.push(`alter Bestwert aus Einheit ${data.prevNr}`);
  }
  if (teile.length) {
    ctx.font = `600 38px ${body}`;
    ctx.fillText(teile.join(" · "), 60, wertY + 66);
  }

  // Fußzeile: Einheit links, Körpergewicht rechts.
  ctx.font = `700 32px ${body}`;
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
