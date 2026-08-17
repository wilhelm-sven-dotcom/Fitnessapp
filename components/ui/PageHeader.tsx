/**
 * Consistent page header „Platte 311": Versal-Kicker (gesperrt), Titel in
 * Old-Standard-Kursive, optionale Versal-Bestandszeile. Statisch —
 * Seitenwechsel transportieren hart, ohne Einflug.
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
        <p className="mb-1 font-mono text-3xs font-semibold uppercase tracking-gesperrt-2 text-muted">
          {eyebrow}
        </p>
      )}
      <h1 className="font-display text-3xl italic leading-tight text-fg">{title}</h1>
      {subtitle && (
        <p className="mt-1.5 font-mono text-2xs uppercase tracking-gesperrt text-muted">
          {subtitle}
        </p>
      )}
    </div>
  );
}
