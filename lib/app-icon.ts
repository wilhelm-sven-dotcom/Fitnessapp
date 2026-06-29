/**
 * Client-side app-icon rendering. The server routes (`apple-icon`,
 * `manifest-icon`) can't read the user's settings, so a custom icon is drawn on
 * a <canvas> here and injected (apple-touch-icon + dynamic manifest) by
 * AppIconInstaller. One draw function feeds both the live preview and the export.
 */

import type { IconConfig } from "@/lib/types";
import { getPhoto } from "@/lib/photo-store";
import { PALETTE } from "@/lib/theme";

/** Background palette = the full app palette (incl. black & white). */
export const ICON_BG_PRESETS = PALETTE;

export const DEFAULT_ICON: IconConfig = { kind: "preset", bg: "#ff375f", glyph: "chevron" };

/** Perceived luminance 0..1 of a #rrggbb color. */
function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Ink that reads on the given background (dark glyph on light bg, else light). */
export function iconInk(bg: string): string {
  return luminance(bg) > 0.55 ? "#0b0b0d" : "#ffffff";
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  // Manual rounded-rect via arcTo (supported everywhere). ctx.roundRect only
  // shipped in Safari 16.4 and throws on older iOS — which crashed the icon
  // preview on the "Hantel" glyph.
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

/** Draw the icon (background + glyph, or a cover-fit image) into `ctx` at `size`. */
export function drawIcon(
  ctx: CanvasRenderingContext2D,
  size: number,
  config: IconConfig,
  img?: CanvasImageSource | null,
): void {
  ctx.clearRect(0, 0, size, size);

  if (config.kind === "image" && img) {
    // Cover-fit the uploaded image into the square (maskable: fill fully).
    const iw = (img as HTMLImageElement).width || size;
    const ih = (img as HTMLImageElement).height || size;
    const scale = Math.max(size / iw, size / ih);
    const w = iw * scale;
    const h = ih * scale;
    ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
    return;
  }

  // Preset: solid background fills the whole square (OS masks the corners).
  ctx.fillStyle = config.bg;
  ctx.fillRect(0, 0, size, size);

  const ink = config.ink ?? iconInk(config.bg);
  const s = size / 100; // BrandMark/glyph design grid is 100×100

  if (config.glyph === "letter") {
    const ch = (config.letter || "T").slice(0, 2).toUpperCase();
    ctx.fillStyle = ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `800 ${Math.round(size * (ch.length > 1 ? 0.42 : 0.56))}px ui-sans-serif, -apple-system, system-ui, sans-serif`;
    ctx.fillText(ch, size / 2, size * 0.54);
    return;
  }

  if (config.glyph === "dumbbell") {
    ctx.fillStyle = ink;
    roundRect(ctx, 30 * s, 45 * s, 40 * s, 10 * s, 4 * s); // handle
    roundRect(ctx, 20 * s, 34 * s, 12 * s, 32 * s, 4 * s); // left weight
    roundRect(ctx, 68 * s, 34 * s, 12 * s, 32 * s, 4 * s); // right weight
    roundRect(ctx, 13 * s, 41 * s, 6 * s, 18 * s, 3 * s); // left cap
    roundRect(ctx, 81 * s, 41 * s, 6 * s, 18 * s, 3 * s); // right cap
    return;
  }

  // chevron — the BrandMark power-chevron (two stacked).
  ctx.strokeStyle = ink;
  ctx.lineWidth = 11 * s;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(28 * s, 54 * s);
  ctx.lineTo(50 * s, 34 * s);
  ctx.lineTo(72 * s, 54 * s);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(28 * s, 72 * s);
  ctx.lineTo(50 * s, 52 * s);
  ctx.lineTo(72 * s, 72 * s);
  ctx.stroke();
}

/** Decode the uploaded image (if kind = image) for drawing. Null otherwise. */
export async function loadIconImage(config: IconConfig): Promise<HTMLImageElement | null> {
  if (config.kind !== "image" || !config.imageId) return null;
  const blob = await getPhoto(config.imageId);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } catch {
    return null;
  } finally {
    // Revoke on next tick so decode/draw can finish using it.
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
}

/** Render the icon to a PNG data URL at `size`. */
export function iconToDataUrl(config: IconConfig, size: number, img?: HTMLImageElement | null): string {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  drawIcon(ctx, size, config, img);
  return canvas.toDataURL("image/png");
}
