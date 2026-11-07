/**
 * Wächter gegen Token- und Schriftnamen des alten Looks.
 *
 *   npm run pruefe:tokens            → Bericht mit Fundstellen je Name, Exit 0
 *   npm run pruefe:tokens -- --streng → Exit 1, sobald ein Name noch vorkommt
 *
 * Durchsucht app/, components/, lib/ und die Tailwind-Konfiguration. Nach dem
 * Look-Wechsel läuft er streng; die Liste wird dann um die abgelösten Namen ergänzt.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const STRENG = process.argv.includes("--streng");
const ALT = [
  "cyanotypie",
  "messing",
  "accent-sessions",
  "tracking-gesperrt",
  "oldstandard",
  "Old_Standard",
  "plexmono",
  "IBM_Plex",
  "blaupause",
  "kreide-blau",
];

function dateien(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...dateien(p));
    else if (/\.(tsx?|css|mjs)$/.test(name)) out.push(p);
  }
  return out;
}
const liste = [...dateien("app"), ...dateien("components"), ...dateien("lib"), "tailwind.config.ts"];

let summe = 0;
for (const wort of ALT) {
  const treffer = [];
  for (const f of liste) {
    const n = readFileSync(f, "utf8").split(wort).length - 1;
    if (n) treffer.push(`${f} (${n})`);
  }
  const anzahl = treffer.reduce((s, t) => s + Number(/\((\d+)\)$/.exec(t)[1]), 0);
  summe += anzahl;
  console.log(`${anzahl ? "noch" : "weg "} ${String(anzahl).padStart(4)}  ${wort}${anzahl ? "  · " + treffer.slice(0, 4).join(", ") + (treffer.length > 4 ? " …" : "") : ""}`);
}
console.log(summe ? `\n${summe} Fundstellen alter Namen.` : "\nKeine alten Namen mehr.");
process.exit(STRENG && summe ? 1 : 0);
