/**
 * The app's logo: an upward "power chevron" in a rounded accent tile.
 * Single source of truth — used in the header, splash and the generated PWA
 * icons. `accent` defaults to the selectable brand color (CSS var); icon
 * generation passes an explicit hex (next/og can't read CSS variables).
 */
export function BrandMark({
  size = 24,
  accent = "var(--accent)",
  ink = "#0a0a0a",
  rounded = true,
  className,
}: {
  size?: number;
  accent?: string;
  ink?: string;
  rounded?: boolean;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      style={{ display: "block" }}
      aria-hidden="true"
    >
      {rounded && <rect x="0" y="0" width="100" height="100" rx="26" fill={accent} />}
      <g
        fill="none"
        stroke={ink}
        strokeWidth={11}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M28 54 L50 34 L72 54" />
        <path d="M28 72 L50 52 L72 72" />
      </g>
    </svg>
  );
}
