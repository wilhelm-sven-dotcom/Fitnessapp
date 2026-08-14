/**
 * Consistent page header: color-coded eyebrow (Bereichs-Quadrat + Label), an
 * h1 display title and an optional subtitle. Statisch — Seitenwechsel sind
 * sofort, ohne Einflug.
 */
export function PageHeader({
  title,
  eyebrow,
  subtitle,
  tone = "var(--accent)",
}: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  /** Bereichsfarbe des Wegleitsystems (CSS-Farbe), z. B. var(--gruen). */
  tone?: string;
}) {
  return (
    <div className="mb-5">
      {eyebrow && (
        <p className="mb-1 flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-accent-2">
          <span aria-hidden className="h-2 w-2" style={{ backgroundColor: tone }} />
          {eyebrow}
        </p>
      )}
      <h1 className="font-display text-2xl font-semibold tracking-tight text-fg">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </div>
  );
}
