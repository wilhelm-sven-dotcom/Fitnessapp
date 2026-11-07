/**
 * Alle Playwright-Prüfungen nacheinander (sie teilen sich Port 3199).
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

const SKRIPTE = [
  "scripts/smoke.mjs",
  "scripts/pruefe-training.mjs",
  "scripts/pruefe-zeitbudget.mjs",
  "scripts/pruefe-ort.mjs",
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
