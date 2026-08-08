/**
 * Navigation ist absichtlich sofort: kein gekeyter Remount, keine
 * Eintritts-Animation pro Routenwechsel. Der frühere `key={pathname}`-Wrapper
 * hat bei jeder Navigation den ganzen Seitenbaum neu aufgebaut und alle
 * Mount-Animationen erneut abgespielt — das las sich wie ein Ladebildschirm.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
