/* Canvas-Cover fürs Magazin (1080×1350, Export/Share). Fonts kommen von den
   ROHEN next/font-Variablen auf <html> (--font-anton etc. — die gemangelten
   Familiennamen sind build-abhängig, niemals hardcoden); Farben von den aktiven
   Skin-Tokens, damit das Cover zum Theme passt. */

import type { MagazineIssue } from "@/lib/magazine";

export interface CoverFonts {
  display: string;
  body: string;
  mono: string;
}

/** Gemangelte next/font-Familien zur Laufzeit lesen und laden. `fonts.ready`
 *  reicht NICHT: Anton wird außerhalb des Editorial-Skins nie im DOM benutzt,
 *  display:swap lädt nur Benutztes — `fonts.load` erzwingt den Fetch. */
export async function loadCoverFonts(): Promise<CoverFonts> {
  const cs = getComputedStyle(document.documentElement);
  const read = (v: string, fb: string) => cs.getPropertyValue(v).trim() || fb;
  const display = read("--font-anton", "sans-serif");
  const body = read("--font-newsreader", "serif");
  const mono = read("--font-inter", "sans-serif");
  await Promise.all(
    [
      // Anton existiert NUR in weight 400 — nie 700 anfordern (Faux-Bold).
      document.fonts.load(`400 10px ${display}`),
      document.fonts.load(`400 10px ${body}`),
      document.fonts.load(`italic 500 10px ${body}`),
      document.fonts.load(`600 10px ${mono}`),
    ].map((p) => p.catch(() => undefined)), // offline → Fallback-Font zeichnet
  );
  return { display, body, mono };
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const probe = line ? `${line} ${w}` : w;
    if (ctx.measureText(probe).width <= maxWidth || !line) {
      line = probe;
    } else {
      lines.push(line);
      line = w;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

const fmtT = (t: number) => String(t).replace(".", ",");

/** Malt das Ausgaben-Cover und liefert es als PNG-Blob (null wenn Canvas fehlt). */
export async function renderCoverBlob(issue: MagazineIssue): Promise<Blob | null> {
  const fonts = await loadCoverFonts();
  const cs = getComputedStyle(document.documentElement);
  const col = (v: string, fb: string) => cs.getPropertyValue(v).trim() || fb;
  const base = col("--base", "#0f0f10");
  const fg = col("--fg", "#e8e2d6");
  const muted = col("--muted", "#b9b2a4");
  const faint = col("--faint", "#6e695f");
  const line = col("--line", "#2c2b27");
  const accent = col("--accent", "#ff375f");

  const W = 1080;
  const H = 1350;
  const M = 84; // Außensteg
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  // Nameplate
  ctx.fillStyle = fg;
  ctx.font = `400 148px ${fonts.display}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText("TRAINING", M, M + 128);
  ctx.fillStyle = fg;
  ctx.fillRect(M, M + 156, W - 2 * M, 5);

  // Ausgaben-Zeile
  ctx.font = `600 30px ${fonts.mono}`;
  ctx.fillStyle = muted;
  ctx.fillText(`AUSGABE ${String(issue.nr).padStart(2, "0")}`, M, M + 216);
  const right = `${issue.monthLabel.toUpperCase()}`;
  ctx.fillStyle = faint;
  ctx.fillText(right, W - M - ctx.measureText(right).width, M + 216);
  ctx.fillStyle = line;
  ctx.fillRect(M, M + 238, W - 2 * M, 2);

  // Headline (Anton, max 3 Zeilen)
  ctx.fillStyle = fg;
  ctx.font = `400 136px ${fonts.display}`;
  const hl = wrapText(ctx, issue.headline, W - 2 * M, 3);
  let y = M + 420;
  for (const l of hl) {
    ctx.fillText(l, M, y);
    y += 142;
  }
  // Sub (Newsreader kursiv)
  ctx.font = `italic 500 44px ${fonts.body}`;
  ctx.fillStyle = muted;
  y += 8;
  for (const l of wrapText(ctx, issue.headlineSub, W - 2 * M, 2)) {
    ctx.fillText(l, M, y);
    y += 58;
  }

  // Kennzahlen-Reihe unten
  const statsY = H - 330;
  ctx.fillStyle = line;
  ctx.fillRect(M, statsY - 78, W - 2 * M, 2);
  const stats: [string, string][] = [
    [String(issue.sessions), issue.sessions === 1 ? "EINHEIT" : "EINHEITEN"],
    [fmtT(issue.tonnageT), "TONNEN"],
    [String(issue.prs.length), issue.prs.length === 1 ? "REKORD" : "REKORDE"],
  ];
  const colW = (W - 2 * M) / 3;
  stats.forEach(([v, l], i) => {
    const x = M + i * colW;
    ctx.fillStyle = fg;
    ctx.font = `400 104px ${fonts.display}`;
    ctx.fillText(v, x, statsY + 40);
    ctx.fillStyle = faint;
    ctx.font = `600 26px ${fonts.mono}`;
    ctx.fillText(l, x, statsY + 92);
  });

  // Fußzeile: Sigil + VON ATLAS
  const fy = H - 108;
  ctx.strokeStyle = fg;
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(M + 17, fy - 34);
  ctx.lineTo(M + 4, fy);
  ctx.moveTo(M + 17, fy - 34);
  ctx.lineTo(M + 30, fy);
  ctx.stroke();
  ctx.strokeStyle = accent;
  ctx.beginPath();
  ctx.moveTo(M + 9, fy - 13);
  ctx.lineTo(M + 25, fy - 13);
  ctx.stroke();
  ctx.fillStyle = muted;
  ctx.font = `600 28px ${fonts.mono}`;
  ctx.fillText("VON ATLAS", M + 48, fy - 4);

  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
}

/** Teilen mit System-Sheet, sonst Download (Desktop/Android-Browser). Ein
 *  AbortError ist ein Nutzer-Abbruch — dann KEIN Download aufdrängen. */
export async function shareCoverBlob(blob: Blob, issue: MagazineIssue): Promise<void> {
  const file = new File([blob], `magazin-${issue.monthKey}.png`, { type: "image/png" });
  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: issue.headline });
      return;
    } catch (e) {
      if ((e as DOMException).name === "AbortError") return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `magazin-${issue.monthKey}.png`;
  a.click();
  URL.revokeObjectURL(url);
}
