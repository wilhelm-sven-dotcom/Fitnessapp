/**
 * Consistent page header: an optional accent eyebrow, a display-font title and
 * an optional subtitle. Statisch — Seitenwechsel sind sofort, ohne Einflug.
 */
export function PageHeader({
  title,
  eyebrow,
  subtitle,
}: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-5">
      {eyebrow && (
        <p className="mb-1 font-mono text-xs uppercase tracking-widest text-accent-2">
          {eyebrow}
        </p>
      )}
      <h2 className="font-display text-2xl font-semibold tracking-tight text-fg">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </div>
  );
}
