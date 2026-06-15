/**
 * Icon motif for the app: rose square with a near-black dumbbell.
 * Pure shapes (no text) so `next/og` ImageResponse needs no embedded font.
 * Kept within the central safe zone so it survives maskable cropping.
 */
export function iconArt(size: number) {
  const plateW = Math.round(size * 0.12);
  const plateH = Math.round(size * 0.46);
  const barW = Math.round(size * 0.2);
  const barH = Math.round(size * 0.12);
  const ink = "#0a0a0a";
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
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ width: plateW, height: plateH, background: ink, borderRadius: Math.round(size * 0.035) }} />
        <div style={{ width: barW, height: barH, background: ink, borderRadius: Math.round(size * 0.02) }} />
        <div style={{ width: plateW, height: plateH, background: ink, borderRadius: Math.round(size * 0.035) }} />
      </div>
    </div>
  );
}
