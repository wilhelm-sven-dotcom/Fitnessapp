/**
 * Aicher-Share-Card: das Poster nach dem Training. Flaches Farbfeld im
 * Laufzeit-Akzent (respektiert accentOverride und Theme), Scoreboard mit
 * Hairline-Spalten, Wochen-Heatmap-Figuren (der grüne Athlet), Wochenbalken
 * — 1080×1350 (4:5), gerendert auf <canvas> und als PNG-Blob exportiert.
 * Schriften kommen aus den next/font-Variablen (--font-archivo/--font-jbmono);
 * ist die Familie (noch) nicht geladen, zeichnet der System-Grotesk-Fallback.
 */

import { FIG, boneWidth, type Bone } from "@/components/figures/figureData";
import { boneHeatSteps, HEAT_STEPS, mixHex, type HeatStep } from "@/lib/heat";
import type { MuscleVolume } from "@/lib/volume";

export interface ShareCardData {
  /** Session-Name („Ganzkörper A") — Kopfzeile des Farbfelds. */
  name: string;
  dateISO: string;
  sets: number;
  /** Bewegtes Gewicht in kg (Poster zeigt Tonnen, de-DE, 1 Dezimale). */
  tonnage: number;
  prs: number;
  weekSets: number;
  weekTarget: number;
  /** Wochensätze je Muskel — vorhanden ⇒ das Poster zeigt die zwei
   *  Heatmap-Figuren; ohne bleibt das kompakte Alt-Layout. */
  muscleVolumes?: MuscleVolume[];
}

const W = 1080;
const H = 1350;
const M = 84; // Außenraster

/** Manuelles rounded-rect via arcTo (ctx.roundRect fehlt auf älterem iOS). */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
  ctx.fill();
}

function cssVar(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function setSpacing(ctx: CanvasRenderingContext2D, px: number): void {
  // letterSpacing ist jung (Chrome 99+/Safari 17) — best effort, kein Muss.
  try {
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing =
      `${px}px`;
  } catch {
    /* ohne Sperrung ebenso lesbar */
  }
}

/**
 * FigurePanel-Rezept auf Canvas: Outline (boneWidth+6, Grundfarbe) → Fill
 * (boneWidth, Heat-Tint) → Spine-Hairline → Kopf (zwei Kreise). Frame A der
 * stehenden Figur, ohne Boden und Gerät (Poster-Reinheit); alles round caps.
 */
function drawFigure(
  ctx: CanvasRenderingContext2D,
  view: "front" | "side",
  tints: Record<string, string>,
  x: number,
  y: number,
  s: number,
  colors: { base: string; line: string; fg: string },
): void {
  const v = view === "front" ? FIG.squat_bw?.front : FIG.squat_bw?.side;
  if (!v) return;
  const P = v.A;
  const pt = (k: string): [number, number] | null => {
    const p = P[k];
    return p ? [x + p[0] * s, y + p[1] * s] : null;
  };
  const seg = (bn: Bone, w: number, color: string) => {
    const a = pt(bn[0]);
    const b = pt(bn[1]);
    if (!a || !b) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  };
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // Outline zuerst — überlappende Gliedmaßen lesen getrennt.
  for (const bn of v.bones) seg(bn, (boneWidth(bn) + 6) * s, colors.base);
  for (const bn of v.bones)
    seg(bn, boneWidth(bn) * s, tints[`${bn[0]}>${bn[1]}`] ?? colors.fg);
  for (const sp of v.spine) seg(sp, 3.5 * s, colors.line);
  const head = pt(v.head ?? "head");
  if (head) {
    ctx.fillStyle = colors.base;
    ctx.beginPath();
    ctx.arc(head[0], head[1], 12 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.fg;
    ctx.beginPath();
    ctx.arc(head[0], head[1], 10.5 * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

export async function renderShareCard(data: ShareCardData): Promise<Blob> {
  const display = cssVar("--font-archivo", "'Archivo', system-ui, sans-serif");
  const mono = cssVar("--font-jbmono", "'JetBrains Mono', ui-monospace, monospace");

  // Schriften anwärmen (best effort) — load() akzeptiert die Familien-Stacks.
  if (typeof document !== "undefined" && document.fonts?.load) {
    try {
      await Promise.all([
        document.fonts.load(`700 128px ${display}`),
        document.fonts.load(`500 34px ${mono}`),
      ]);
    } catch {
      /* Systemfallback zeichnet trotzdem */
    }
  }

  const accent = cssVar("--accent", "#0c6a99");
  const inkOnColor = cssVar("--ink-on-color", "#ffffff");
  const base = cssVar("--base", "#f2f4f2");
  const fg = cssVar("--fg", "#121619");
  const muted = cssVar("--muted", "#4d5a5e");
  const line = cssVar("--line", "#d4d9d4");
  const surface2 = cssVar("--surface-2", "#e8ebe8");
  const gruen = cssVar("--gruen", "#0a7248");

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D nicht verfügbar");

  // ── Grund ──
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  // ── Farbfeld oben: Datum + Session-Name ──
  const FIELD_H = 440;
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, W, FIELD_H);

  ctx.fillStyle = inkOnColor;
  ctx.textBaseline = "alphabetic";
  setSpacing(ctx, 6);
  ctx.font = `500 34px ${mono}`;
  const dateLabel = new Date(data.dateISO)
    .toLocaleDateString("de-DE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    .toUpperCase();
  ctx.fillText(dateLabel, M, 140);
  setSpacing(ctx, 0);

  // Name einzeilig, schrumpft bis er ins Raster passt.
  const name = (data.name || "Training").trim() || "Training";
  let nameSize = 112;
  ctx.font = `700 ${nameSize}px ${display}`;
  while (ctx.measureText(name).width > W - 2 * M && nameSize > 56) {
    nameSize -= 4;
    ctx.font = `700 ${nameSize}px ${display}`;
  }
  ctx.fillText(name, M, 296);

  setSpacing(ctx, 6);
  ctx.font = `500 34px ${mono}`;
  ctx.fillText("TRAINING GESPEICHERT", M, 386);
  setSpacing(ctx, 0);

  // ── Scoreboard: drei Spalten mit Hairlines ──
  const colW = (W - 2 * M) / 3;
  const cols: { eyebrow: string; value: string; unit?: string; tone?: string }[] = [
    { eyebrow: "SÄTZE", value: String(data.sets) },
    {
      eyebrow: "BEWEGT",
      value: (data.tonnage / 1000).toLocaleString("de-DE", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
      unit: "t",
    },
    {
      eyebrow: data.prs === 1 ? "REKORD" : "REKORDE",
      value: String(data.prs),
      tone: data.prs > 0 ? gruen : fg,
    },
  ];

  ctx.strokeStyle = line;
  ctx.lineWidth = 2;
  for (let i = 1; i < 3; i++) {
    const x = M + colW * i;
    ctx.beginPath();
    ctx.moveTo(x, 560);
    ctx.lineTo(x, 840);
    ctx.stroke();
  }

  cols.forEach((c, i) => {
    const cx = M + colW * i + colW / 2;
    ctx.textAlign = "center";
    setSpacing(ctx, 5);
    ctx.font = `500 30px ${mono}`;
    ctx.fillStyle = muted;
    ctx.fillText(c.eyebrow, cx, 622);
    setSpacing(ctx, 0);

    ctx.font = `700 128px ${display}`;
    ctx.fillStyle = c.tone ?? fg;
    const numW = ctx.measureText(c.value).width;
    if (c.unit) {
      // Zahl + kleine Einheit als EIN zentrierter Block.
      ctx.font = `500 56px ${display}`;
      const unitW = ctx.measureText(` ${c.unit}`).width;
      const startX = cx - (numW + unitW) / 2;
      ctx.textAlign = "left";
      ctx.font = `700 128px ${display}`;
      ctx.fillText(c.value, startX, 790);
      ctx.font = `500 56px ${display}`;
      ctx.fillStyle = muted;
      ctx.fillText(` ${c.unit}`, startX + numW, 790);
      ctx.textAlign = "center";
    } else {
      ctx.fillText(c.value, cx, 790);
    }
  });
  ctx.textAlign = "left";

  // ── Wochen-Heatmap: der grüne Athlet (nur mit muscleVolumes) ──
  const heat = data.muscleVolumes ? boneHeatSteps(data.muscleVolumes) : null;
  if (heat) {
    // Stufen → Hex (Canvas kennt kein color-mix); Parse-Fehler → volles Grün.
    const tintFor = (step: HeatStep): string =>
      step <= 0 ? surface2 : (mixHex(gruen, surface2, step / 100) ?? gruen);
    const paint = (m: Record<string, HeatStep>) =>
      Object.fromEntries(Object.entries(m).map(([b, s]) => [b, tintFor(s)]));

    setSpacing(ctx, 5);
    ctx.font = `500 30px ${mono}`;
    ctx.fillStyle = muted;
    ctx.fillText("MUSKELN DIESE WOCHE", M, 886);
    setSpacing(ctx, 0);

    // Figuren größer und eng nebeneinander (die Piktogramme sind schmal —
    // Offsets zentrieren die Körperachse bei ~230 bzw. ~510 px).
    const FS = 1.5;
    drawFigure(ctx, "front", paint(heat.front), 80, 888, FS, { base, line, fg });
    drawFigure(ctx, "side", paint(heat.side), 360, 888, FS, { base, line, fg });

    // Rechte Spalte: 4-Stufen-Rampe + ehrliche Fußnote.
    const sq = 28;
    const sqGap = 10;
    const sqX = 724;
    HEAT_STEPS.forEach((step, i) => {
      ctx.fillStyle = tintFor(step);
      roundRect(ctx, sqX + i * (sq + sqGap), 946, sq, sq, 6);
    });
    setSpacing(ctx, 4);
    ctx.font = `500 22px ${mono}`;
    ctx.fillStyle = muted;
    ctx.fillText("SCHEMA,", sqX, 1022);
    ctx.fillText("KEINE ANATOMIE", sqX, 1054);
    setSpacing(ctx, 0);
  }

  // ── Fuß: Wochenbalken (+ Rekordzeile im Alt-Layout ohne Figuren) ──
  const weekY = heat ? 1180 : 1000;
  const barY = heat ? 1200 : 1032;
  const hairY = heat ? 1256 : 1240;
  const footY = heat ? 1304 : 1296;

  setSpacing(ctx, 5);
  ctx.font = `500 30px ${mono}`;
  ctx.fillStyle = muted;
  ctx.fillText("DIESE WOCHE", M, weekY);
  ctx.textAlign = "right";
  ctx.fillText(
    `${data.weekSets}/${data.weekTarget} SÄTZE`,
    W - M,
    weekY,
  );
  ctx.textAlign = "left";
  setSpacing(ctx, 0);

  const barH = 24;
  ctx.fillStyle = surface2;
  roundRect(ctx, M, barY, W - 2 * M, barH, barH / 2);
  const frac =
    data.weekTarget > 0 ? Math.min(1, data.weekSets / data.weekTarget) : 0;
  if (frac > 0) {
    ctx.fillStyle = accent;
    roundRect(ctx, M, barY, Math.max(barH, (W - 2 * M) * frac), barH, barH / 2);
  }

  // Mit Figuren trägt die grüne REKORDE-Spalte die Botschaft bereits.
  if (!heat && data.prs > 0) {
    ctx.fillStyle = gruen;
    ctx.font = `600 44px ${display}`;
    ctx.fillText(
      data.prs === 1
        ? "Neuer Rekord in dieser Einheit"
        : `${data.prs} neue Rekorde in dieser Einheit`,
      M,
      1150,
    );
  }

  ctx.strokeStyle = line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(M, hairY);
  ctx.lineTo(W - M, hairY);
  ctx.stroke();

  setSpacing(ctx, 6);
  ctx.font = `500 30px ${mono}`;
  ctx.fillStyle = muted;
  ctx.fillText("TRAINING", M, footY);
  setSpacing(ctx, 0);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("PNG-Export fehlgeschlagen"))),
      "image/png",
    );
  });
}
