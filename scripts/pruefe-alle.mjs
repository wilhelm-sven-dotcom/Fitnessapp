/**
 * Alle Playwright-Prüfungen nacheinander (sie teilen sich Port 3199; die
 * Offline-Prüfung belegt zusätzlich 3198, die ATLAS-Prüfung 3197).
 *
 *   npm run build && npm run pruefe
 *
 * Bricht beim ersten Fehlschlag ab und meldet, welches Skript es war.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

if (!existsSync(".next/BUILD_ID")) {
  console.error("Kein Build gefunden – zuerst `npm run build`.");
  process.exit(1);
}

// Ein liegengebliebener Server auf 3199 würde den ALTEN Build ausliefern —
// die Prüfungen liefen dann gegen fremde Chunks und scheiterten ohne Grund.
try {
  await fetch("http://127.0.0.1:3199/");
  console.error("Port 3199 ist belegt (alter Server?) – erst beenden, z. B. pkill -f next-server.");
  process.exit(1);
} catch {
  /* frei */
}

const SKRIPTE = [
  "scripts/smoke.mjs",
  "scripts/pruefe-training.mjs",
  "scripts/pruefe-zeitbudget.mjs",
  "scripts/pruefe-ort.mjs",
  "scripts/pruefe-offline.mjs",
  "scripts/pruefe-daten.mjs",
  "scripts/pruefe-atlas.mjs",
  "scripts/pruefe-bedienung.mjs",
  "scripts/tempo.mjs",
];

for (const s of SKRIPTE) {
  console.log(`\n━━ ${s} ━━`);
  const r = spawnSync(process.execPath, [s], { stdio: "inherit" });
  if (r.status !== 0) {
    console.error(`\nFEHLGESCHLAGEN: ${s} (Exit ${r.status})`);
    process.exit(r.status ?? 1);
  }
}
console.log(`\nAlle ${SKRIPTE.length} Prüfungen bestanden.`);
