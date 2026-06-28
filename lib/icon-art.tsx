import { BrandMark } from "@/components/brand/BrandMark";
import { accentHex } from "@/lib/theme";

/** Turn an accent hex (#rrggbb) into an rgba string at the given alpha. */
function rgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * App icon motif: a deep, premium dark gradient with the upward power-chevron
 * (the BrandMark) glowing in the accent color, centered in the maskable safe
 * zone. Pure shapes + gradients, so `next/og` (Satori) needs no embedded font
 * and no SVG filters. The installed icon is fixed to the default brand accent
 * (Satori can't read the user's chosen accent CSS var); the in-app logo follows
 * the chosen accent.
 */
export function iconArt(size: number, accentId = "red") {
  const accent = accentHex(accentId);
  const mark = Math.round(size * 0.56);
  const halo = Math.round(size * 0.78);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        background: "linear-gradient(145deg, #26262b 0%, #0b0b0d 72%)",
      }}
    >
      {/* Soft accent glow behind the mark. */}
      <div
        style={{
          position: "absolute",
          width: halo,
          height: halo,
          borderRadius: halo,
          background: `radial-gradient(circle, ${rgba(accent, 0.55)} 0%, ${rgba(accent, 0)} 70%)`,
        }}
      />
      <BrandMark size={mark} rounded={false} accent={accent} ink={accent} />
    </div>
  );
}
