/**
 * Seitenkopf „spotter“: Kicker (fett, Normalschreibung), Titel in Bricolage
 * 800, optionale Bestandszeile. Statisch, ohne Einflug.
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
        <p className="mb-1 text-sm font-bold text-muted">
          {eyebrow}
        </p>
      )}
      <h1 className="font-display text-titel font-extrabold text-fg">{title}</h1>
      {subtitle && (
        <p className="mt-1.5 text-sm text-muted">
          {subtitle}
        </p>
      )}
    </div>
  );
}
