import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

/**
 * `/sw.js` — der Service Worker, beim Bauen zusammengesetzt.
 *
 * Die Logik steht in `worker.js` daneben. Diese Route stellt eine Zeile davor:
 * die Liste ALLER Dateien, die der Build erzeugt hat (Skripte, Styles,
 * Schriften aus `.next/static`, dazu die Gerätebilder aus `public/geraete`),
 * und einen Fingerabdruck davon als Kennung.
 *
 * Warum so: Der Worker lädt beim Installieren genau diese Liste vor. Die App
 * hat danach ihren ganzen Code im Cache und braucht im Studio kein Netz mehr —
 * auch nicht für Teile, die erst später nachgeladen würden. Und weil die
 * Kennung im Skript steht, ist `/sw.js` nach jedem Build mit geändertem Code
 * ein anderes Skript: daran erkennt der Browser das Update, ohne dass die
 * Seite ihre Version kennen muss.
 *
 * `force-static`: die Route läuft einmal beim Bauen (dann liegen die Dateien
 * schon in `.next/static`), nie auf dem Server.
 */
export const dynamic = "force-static";

/** Als Funktion, damit die Spurensuche des Builds die Ordner nicht für
 *  Laufzeit-Dateien der Route hält und mit einpackt. */
const ordner = (...teile: string[]) => path.join(process.cwd(), ...teile);

async function dateienIn(dir: string): Promise<string[]> {
  let eintraege;
  try {
    eintraege = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const e of eintraege) {
    const voll = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await dateienIn(voll)));
    else out.push(voll);
  }
  return out;
}

/** Dateipfad → Adresse, so kodiert wie Next sie ins HTML schreibt. */
const adresse = (praefix: string, basis: string, datei: string) =>
  praefix + path.relative(basis, datei).split(path.sep).map(encodeURIComponent).join("/");

export async function GET() {
  const quelle = await readFile(ordner("app", "sw.js", "worker.js"), "utf8");

  const statisch = ordner(".next", "static");
  const build = (await dateienIn(statisch))
    // `_buildManifest.js` und `_ssgManifest.js` gehören zum alten Pages-Router.
    .filter((f) => /\.(?:js|css|woff2)$/.test(f) && !path.basename(f).startsWith("_"))
    .map((f) => adresse("/_next/static/", statisch, f))
    .sort();

  const bilderOrdner = ordner("public", "geraete");
  const bildDateien = (await dateienIn(bilderOrdner)).filter((f) => f.endsWith(".webp")).sort();
  const bilder = bildDateien.map((f) => adresse("/geraete/", bilderOrdner, f));

  if (process.env.NODE_ENV === "production" && !build.some((f) => f.endsWith(".js"))) {
    // Ohne Liste gäbe es einen Worker, der nichts vorlädt und sich trotzdem
    // für fertig hält. Dann lieber gar kein Build.
    throw new Error("sw.js: keine Build-Dateien in .next/static gefunden");
  }

  const hash = createHash("sha256").update(quelle);
  for (const f of build) hash.update(f);
  // Bilder tragen keinen Hash im Namen: ihr Inhalt zählt mit.
  for (const f of bildDateien) hash.update(path.basename(f)).update(await readFile(f));
  const bau = { v: hash.digest("hex").slice(0, 12), dateien: [...build, ...bilder] };

  return new Response(`const BAU = ${JSON.stringify(bau)};\n${quelle}`, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
