/**
 * Aicher-Share-Card: das Poster nach dem Training. Flaches Farbfeld im
 * Laufzeit-Akzent (respektiert accentOverride und Theme), Scoreboard mit
 * Hairline-Spalten, Wochenbalken, Rekordzeile in Grün — 1080×1350 (4:5),
 * gerendert auf <canvas> und als PNG-Blob exportiert. Schriften kommen aus
 * den next/font-Variablen (--font-archivo/--font-jbmono); ist die Familie
 * (noch) nicht geladen, zeichnet der System-Grotesk-Fallback.
 */

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

  // ── Fuß: Wochenbalken + Rekordzeile ──
  setSpacing(ctx, 5);
  ctx.font = `500 30px ${mono}`;
  ctx.fillStyle = muted;
  ctx.fillText("DIESE WOCHE", M, 1000);
  ctx.textAlign = "right";
  ctx.fillText(
    `${data.weekSets}/${data.weekTarget} SÄTZE`,
    W - M,
    1000,
  );
  ctx.textAlign = "left";
  setSpacing(ctx, 0);

  const barY = 1032;
  const barH = 24;
  ctx.fillStyle = surface2;
  roundRect(ctx, M, barY, W - 2 * M, barH, barH / 2);
  const frac =
    data.weekTarget > 0 ? Math.min(1, data.weekSets / data.weekTarget) : 0;
  if (frac > 0) {
    ctx.fillStyle = accent;
    roundRect(ctx, M, barY, Math.max(barH, (W - 2 * M) * frac), barH, barH / 2);
  }

  if (data.prs > 0) {
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
  ctx.moveTo(M, 1240);
  ctx.lineTo(W - M, 1240);
  ctx.stroke();

  setSpacing(ctx, 6);
  ctx.font = `500 30px ${mono}`;
  ctx.fillStyle = muted;
  ctx.fillText("TRAINING", M, 1296);
  setSpacing(ctx, 0);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("PNG-Export fehlgeschlagen"))),
      "image/png",
    );
  });
}
