/**
 * Kontrast der Farb-Tokens nach WCAG 2.1 (relative Luminanz), hell und dunkel.
 *
 *   npm run kontrast            → Bericht, Exit 0
 *   npm run kontrast -- --streng → Exit 1, sobald ein Paar unter seiner Grenze liegt
 *
 * Liest die CSS-Variablen aus app/globals.css (:root = hell,
 * [data-theme="dark"] = dunkel) und löst var()-Verweise auf. Grenzen: Text
 * 4,5:1 (WCAG 1.4.3), Bedienelemente und Grafik 3:1 (WCAG 1.4.11).
 * Die Paarliste unten gehört zum Design-System: wer Rollen ändert, ändert sie mit.
 */
import { readFileSync } from "node:fs";

const STRENG = process.argv.includes("--streng");
const css = readFileSync("app/globals.css", "utf8");

function block(selector) {
  const i = css.indexOf(selector + " {");
  if (i < 0) return {};
  const body = css.slice(css.indexOf("{", i) + 1, css.indexOf("}", i));
  const vars = {};
  for (const m of body.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) vars[m[1]] = m[2].trim();
  return vars;
}
const hell = block(":root");
const dunkel = { ...hell, ...block('[data-theme="dark"]') };

function aufloesen(vars, wert, tiefe = 0) {
  const m = /^var\(--([\w-]+)\)$/.exec(wert ?? "");
  if (m && tiefe < 10) return aufloesen(vars, vars[m[1]], tiefe + 1);
  return wert;
}
function lum(hex) {
  const h = hex.replace("#", "");
  const voll = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(voll.slice(i, i + 2), 16) / 255);
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function kontrast(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

// [Vordergrund, Hintergrund, Grenze, wofür]
const PAARE = [
  ["fg", "base", 4.5, "Text auf Grund"],
  ["fg", "card", 4.5, "Text auf Fläche"],
  ["muted", "base", 4.5, "Nebentext auf Grund"],
  ["muted", "card", 4.5, "Nebentext auf Fläche"],
  ["muted", "surface-2", 4.5, "Nebentext auf Fläche-2"],
  ["on-accent", "accent", 4.5, "Schrift auf Akzent"],
  ["accent-ink", "card", 4.5, "Akzent als Schrift"],
  ["cyanotypie", "card", 3, "Daten/Fokus auf Fläche"],
  ["messing", "card", 4.5, "Rekord als Schrift"],
];

let fehler = 0;
for (const [name, vars] of [["hell", hell], ["dunkel", dunkel]]) {
  console.log(`\n${name}`);
  for (const [v, h, grenze, wofuer] of PAARE) {
    const a = aufloesen(vars, vars[v]);
    const b = aufloesen(vars, vars[h]);
    if (!a?.startsWith("#") || !b?.startsWith("#")) {
      console.log(`  ?    ${v} / ${h}: nicht auflösbar (${a} / ${b})`);
      continue;
    }
    const k = kontrast(a, b);
    const ok = k >= grenze;
    if (!ok) fehler++;
    console.log(`  ${ok ? "ok  " : "ZU WENIG"} ${k.toFixed(2).replace(".", ",")}:1  ${v} auf ${h}  (${wofuer}, Grenze ${String(grenze).replace(".", ",")})`);
  }
}
console.log(fehler ? `\n${fehler} Paar(e) unter der Grenze.` : "\nAlle Paare über der Grenze.");
process.exit(STRENG && fehler ? 1 : 0);
