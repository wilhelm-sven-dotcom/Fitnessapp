import { BrandMark } from "@/components/brand/BrandMark";

/**
 * App icon motif: full-bleed accent background with the upward power-chevron
 * (the BrandMark) centered in the maskable safe zone. Pure shapes, so
 * `next/og` ImageResponse needs no embedded font. Uses the default brand accent
 * (the installed icon is fixed; the in-app logo follows the chosen accent).
 */
export function iconArt(size: number) {
  const mark = Math.round(size * 0.6);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ff375f",
      }}
    >
      <BrandMark size={mark} rounded={false} accent="#ff375f" ink="#0a0a0a" />
    </div>
  );
}
