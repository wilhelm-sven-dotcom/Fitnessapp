import { BrandMark } from "@/components/brand/BrandMark";
import { accentHex } from "@/lib/theme";

/** München-’72-Lichtblau als festes Hex — Satori (next/og) kann keine
 *  CSS-Variablen lesen, deshalb hier roh (Spiegel von --accent, hell). */
const M72_BLAU = "#0c6a99";

/**
 * App icon motif München ’72: flat Lichtblau field, the upward power-chevron
 * (BrandMark) in white — a pictogram, no gradients, no glow. Pure shapes, so
 * `next/og` (Satori) needs no embedded font and no SVG filters. The installed
 * icon is fixed to the brand blue (Satori can't read the user's accent CSS
 * var); the in-app logo follows the chosen accent.
 */
export function iconArt(size: number, accentId?: string) {
  const accent = accentId ? accentHex(accentId) : M72_BLAU;
  const mark = Math.round(size * 0.56);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        background: accentId ? accent : M72_BLAU,
      }}
    >
      <BrandMark size={mark} rounded={false} accent="#ffffff" ink="#ffffff" />
    </div>
  );
}
