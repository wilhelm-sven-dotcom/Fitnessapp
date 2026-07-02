/**
 * A restrained, skin-voiced footer mark for the hero cards on /progress — so the
 * skin identity carries past the Splash boot instead of stopping at it. Only the
 * active skin's variant renders (CSS `.only-*`, no JS / no hydration flash):
 *   blueprint → a mono measurement scale (engineering ruler)
 *   tactile   → a raised, brushed instrument bar (panel depth + sheen)
 *   editorial → a hairline·diamond·hairline magazine divider
 * Purely decorative — hidden from assistive tech.
 */
export function SkinSignature() {
  return (
    <div className="mt-4" aria-hidden>
      {/* Blueprint — ruler ticks. */}
      <div className="only-blueprint flex items-end justify-center gap-[3px] opacity-60">
        {Array.from({ length: 25 }, (_, i) => (
          <span key={i} className="w-px bg-line" style={{ height: i % 4 === 0 ? 9 : 4 }} />
        ))}
      </div>
      {/* Tactile — raised brushed bar. */}
      <div className="only-tactile flex justify-center">
        <span
          className="h-1.5 w-12 rounded-pill bg-surface-2 bg-hero-sheen"
          style={{ boxShadow: "var(--panel-shadow)" }}
        />
      </div>
      {/* Editorial — magazine divider. */}
      <div className="only-editorial flex items-center justify-center gap-2">
        <span className="h-px w-10 bg-line" />
        <span className="h-1.5 w-1.5 rotate-45 bg-line" />
        <span className="h-px w-10 bg-line" />
      </div>
    </div>
  );
}
