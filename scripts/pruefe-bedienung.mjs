/**
 * Nachweis „Bedienung“, am Produktions-Build (Handy-Format 390 × 844):
 *
 *   A  Auf jedem Bildschirm und in jedem Blatt hat jedes Bedienelement einen
 *      Namen (für Screenreader und Sprachsteuerung) und eine Tippfläche von
 *      mindestens 44 × 44 px. Ein Platzhalter im Feld zählt nicht als Name.
 *      Ausgenommen sind nur Verweise mitten im Fließtext.
 *   B  Meldungen verdecken nie den Knopf, den man als Nächstes braucht: auf
 *      Heute stehen sie über Dock und Leiste, im Training oben unter dem Kopf
 *      statt über „Satz eintragen“. Der Ansage-Bereich steht schon vor der
 *      ersten Meldung im Dokument, Fehler sind `role="alert"`.
 *   C  Ohne Netz steht „Offline“ im Kopf (Heute und Training) und verschwindet
 *      mit dem Netz wieder.
 *   D  Die Gewichtsstufe gehört zum Ort: Zuhause 1,25 kg und Studio 5 kg
 *      stehen nebeneinander, und die Plus-Taste im Training springt um die
 *      Stufe des heutigen Orts.
 *
 * Aufruf: npm run build && node scripts/pruefe-bedienung.mjs
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { chromium } from "playwright";
import { LOG, SETTINGS, starteServer } from "./lib/testdaten.mjs";

const PORT = 3199;
const exe = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium";
const ZIEL = 44;

if (!existsSync(".next/BUILD_ID")) {
  console.error("Kein Build gefunden – zuerst `npm run build`.");
  process.exit(1);
}
const { server, base: BASE } = await starteServer(spawn, PORT);
process.on("exit", () => server.kill("SIGTERM"));

const fehler = [];
const pruefe = (ok, text) => {
  console.log(`${ok ? "OK  " : "FEHL"} ${text}`);
  if (!ok) fehler.push(text);
};

const browser = await chromium.launch({ executablePath: exe });
const FENSTER = { viewport: { width: 390, height: 844 }, serviceWorkers: "block" };

/** Testdaten nur, solange das Gerät leer ist: ein Neuladen behält, was die
 *  Prüfung inzwischen eingestellt hat. `orte: false` lässt die App beide Orte
 *  (Zuhause, Studio) selbst anlegen. */
const mitDaten = async (ctx, { orte = true } = {}) =>
  ctx.addInitScript(
    ([settings, log, einOrt]) => {
      if (localStorage.getItem("wilhelm-training-settings")) return;
      localStorage.setItem(
        "wilhelm-training-settings",
        JSON.stringify(einOrt ? { ...settings, orteM1: true } : settings),
      );
      localStorage.setItem("wilhelm-training-log", JSON.stringify(log));
    },
    [SETTINGS("light"), LOG, orte],
  );

// ── Messen: Namen und Tippflächen aller sichtbaren Bedienelemente ────────
const messe = (seite) =>
  seite.evaluate((ziel) => {
    const sichtbar = (el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return false;
      const st = getComputedStyle(el);
      if (st.visibility === "hidden" || st.display === "none" || Number(st.opacity) === 0) return false;
      // Außerhalb des Fensters: gehört zur Seite, man kann hinscrollen.
      if (r.bottom < 0 || r.top > innerHeight) return true;
      // Im Fenster, aber von einem Blatt verdeckt: gehört nicht zu diesem Bild.
      const x = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2));
      const y = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2));
      const oben = document.elementFromPoint(x, y);
      return !oben || el.contains(oben) || oben.contains(el) || !!oben.closest("label")?.contains(el);
    };
    const name = (el) => {
      const direkt = el.getAttribute("aria-label");
      if (direkt && direkt.trim()) return direkt.trim();
      const verweis = el.getAttribute("aria-labelledby");
      if (verweis) {
        const t = verweis
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent ?? "")
          .join(" ")
          .trim();
        if (t) return t;
      }
      if ("labels" in el && el.labels && el.labels.length) {
        const t = [...el.labels].map((l) => l.textContent ?? "").join(" ").trim();
        if (t) return t;
      }
      const istFeld = /^(input|textarea|select)$/i.test(el.tagName);
      const text = (el.textContent ?? "").trim();
      if (text && !istFeld) return text;
      return el.querySelector?.("img[alt]")?.getAttribute("alt") || el.getAttribute("title") || "";
    };
    const wahl =
      'button, a[href], input:not([type="hidden"]):not([type="file"]), textarea, select, [role="button"], [role="switch"], [role="tab"]';
    const funde = [];
    for (const el of document.querySelectorAll(wahl)) {
      if (!sichtbar(el)) continue;
      const r = el.getBoundingClientRect();
      // Ein Feld in einem <label> lässt sich über das ganze Label antippen.
      const flaeche = el.closest("label")?.getBoundingClientRect() ?? r;
      const b = Math.round(Math.max(r.width, flaeche.width));
      const h = Math.round(Math.max(r.height, flaeche.height));
      const n = name(el);
      const imText = el.tagName === "A" && getComputedStyle(el).display === "inline";
      funde.push({
        was: `${el.tagName.toLowerCase()} „${(n || el.getAttribute("placeholder") || "").slice(0, 40)}“ ${b}×${h}`,
        ohneName: !n,
        klein: !imText && (b < ziel || h < ziel),
      });
    }
    return funde;
  }, ZIEL);

let gesamt = 0;
const bild = async (seite, wo, hin) => {
  try {
    await hin();
    // Blätter und Seitenwechsel fahren ein — erst messen, wenn sie stehen.
    await seite.waitForTimeout(450);
  } catch (e) {
    pruefe(false, `A · ${wo}: nicht erreicht (${String(e.message).split("\n")[0]})`);
    return;
  }
  const funde = await messe(seite);
  gesamt += funde.length;
  const ohne = funde.filter((f) => f.ohneName);
  const klein = funde.filter((f) => f.klein);
  pruefe(
    funde.length > 0 && ohne.length === 0 && klein.length === 0,
    `A · ${wo}: ${funde.length} Bedienelemente, ohne Namen ${ohne.length}, unter ${ZIEL} px ${klein.length}`,
  );
  for (const f of ohne.slice(0, 8)) console.log(`       ohne Namen: ${f.was}`);
  for (const f of klein.slice(0, 8)) console.log(`       zu klein:   ${f.was}`);
};

const zu = async (seite) => {
  await seite.keyboard.press("Escape");
  await seite.waitForTimeout(400);
};
const blatt = (seite) => seite.locator("[data-sheet]").first().waitFor({ timeout: 6000 });
const reiter = (seite, name) => seite.getByRole("button", { name, exact: true }).first();
const komma = (zahl) => String(zahl).replace(".", ",");
/** Rechtecke überlappen sich? */
const ueberlappt = (a, b) =>
  !!a && !!b && a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
/** Der Ansage-Bereich der Meldungen (components/ui/Toaster.tsx). */
const ANSAGE = 'div[role="status"][aria-live="polite"]';
/**
 * Löst die Meldung „Speicher voll“ aus — ein Fehler, den jede Seite zeigt. Die
 * App meldet ihn höchstens einmal je Minute; wer ihn ein zweites Mal braucht,
 * lädt die Seite vorher neu. Gesucht wird im Ansage-Bereich: `role="alert"`
 * trägt auch der Seitenansager von Next.
 */
const melde = async (seite) => {
  await seite.evaluate(() => window.dispatchEvent(new Event("spotter-speicher-voll")));
  const meldung = seite.locator(`${ANSAGE} [role="alert"]`).first();
  await meldung.waitFor({ timeout: 4000 });
  await seite.waitForTimeout(400);
  return meldung;
};

try {
  const ctx = await browser.newContext(FENSTER);
  await mitDaten(ctx);
  const pg = await ctx.newPage();

  // ── A · Heute ─────────────────────────────────────────────────────────
  await bild(pg, "Heute", () => pg.goto(BASE + "/", { waitUntil: "networkidle" }));

  // ── B · Meldung auf Heute ─────────────────────────────────────────────
  pruefe(
    (await pg.locator(ANSAGE).count()) === 1,
    "B · der Ansage-Bereich steht schon vor der ersten Meldung im Dokument",
  );
  {
    const meldung = await melde(pg);
    const m = await meldung.boundingBox();
    const start = await pg.getByRole("button", { name: /Los geht/ }).first().boundingBox();
    const leiste = await pg.locator("nav").last().boundingBox();
    pruefe(
      !!m && !ueberlappt(m, start) && !ueberlappt(m, leiste),
      `B · Heute: die Meldung steht über „Los geht’s“ und der Leiste (Unterkante ${Math.round((m?.y ?? 0) + (m?.height ?? 0))} px, Knopf ab ${Math.round(start?.y ?? 0)} px)`,
    );
    await meldung.click();
    await pg.waitForTimeout(500);
  }

  // ── C · Offline auf Heute ─────────────────────────────────────────────
  const offlineSchild = pg.getByRole("status").filter({ hasText: "Offline" });
  pruefe((await offlineSchild.count()) === 0, "C · mit Netz steht kein „Offline“ im Kopf");
  await ctx.setOffline(true);
  await offlineSchild.first().waitFor({ timeout: 4000 }).catch(() => {});
  pruefe(await offlineSchild.first().isVisible().catch(() => false), "C · ohne Netz steht „Offline“ im Kopf von Heute");
  await ctx.setOffline(false);
  await pg.waitForTimeout(400);
  pruefe((await offlineSchild.count()) === 0, "C · mit dem Netz verschwindet der Hinweis wieder");

  // ── A · Blätter auf Heute ─────────────────────────────────────────────
  await bild(pg, "Heute · Einheit umbauen", async () => {
    await pg.getByRole("button", { name: /Umbauen|Bearbeiten/ }).first().click();
    await blatt(pg);
  });
  await zu(pg);
  await bild(pg, "Heute · Zeit frei wählen", async () => {
    await pg.getByLabel(/Zeitbudget frei/).first().click();
    await blatt(pg);
  });
  await zu(pg);

  // ── A · Training ──────────────────────────────────────────────────────
  await bild(pg, "Tagesform", async () => {
    await pg.getByText("Los geht", { exact: false }).first().click();
    await pg.getByText("Überspringen").first().waitFor({ timeout: 8000 });
  });
  await bild(pg, "Aufwärmen", async () => {
    await pg.getByText("Überspringen").first().click();
    await pg.getByLabel("Aufwärmen beenden").waitFor({ timeout: 8000 });
  });
  await bild(pg, "Training · Satzkarte", async () => {
    await pg.getByLabel("Aufwärmen beenden").click();
    await pg.getByTestId("stage-order").waitFor({ timeout: 15000 });
  });

  // ── B und C · Meldung und Offline im Training ─────────────────────────
  {
    // Neu laden: die Einheit läuft weiter, und „Speicher voll“ darf wieder melden.
    await pg.reload({ waitUntil: "networkidle" });
    await pg.getByTestId("stage-order").waitFor({ timeout: 15000 });
    const meldung = await melde(pg);
    const m = await meldung.boundingBox();
    const eintragen = await pg.getByRole("button", { name: /Satz eintragen/ }).first().boundingBox();
    const schliessen = await pg.getByLabel("Training beenden").boundingBox();
    pruefe(
      !!m && !!eintragen && !ueberlappt(m, eintragen) && m.y + m.height < eintragen.y,
      `B · Training: die Meldung steht oben, „Satz eintragen“ bleibt frei (Meldung bis ${Math.round((m?.y ?? 0) + (m?.height ?? 0))} px, Knopf ab ${Math.round(eintragen?.y ?? 0)} px)`,
    );
    pruefe(!!m && !ueberlappt(m, schliessen), "B · Training: die Meldung verdeckt auch den Schließen-Knopf nicht");
    await meldung.click();
    await pg.waitForTimeout(500);

    const uebersicht = await pg.getByLabel(/Einheit im Überblick/).boundingBox();
    pruefe(
      !!uebersicht && uebersicht.height >= ZIEL && !!schliessen && schliessen.width >= ZIEL && schliessen.height >= ZIEL,
      `B · Kopf im Training: Übersicht ${Math.round(uebersicht?.width ?? 0)} × ${Math.round(uebersicht?.height ?? 0)} px, Schließen ${Math.round(schliessen?.width ?? 0)} × ${Math.round(schliessen?.height ?? 0)} px`,
    );

    await ctx.setOffline(true);
    await offlineSchild.first().waitFor({ timeout: 4000 }).catch(() => {});
    pruefe(await offlineSchild.first().isVisible().catch(() => false), "C · ohne Netz steht „Offline“ auch im Kopf des Trainings");
    await ctx.setOffline(false);
    await pg.waitForTimeout(400);
  }

  await bild(pg, "Training · Übersicht", async () => {
    await pg.getByLabel(/Einheit im Überblick/).click();
    await blatt(pg);
  });
  await zu(pg);
  await bild(pg, "Training · Anleitung", async () => {
    await pg.getByRole("button", { name: "Anleitung" }).first().click();
    await blatt(pg);
  });
  await zu(pg);
  await bild(pg, "Training · Tauschen", async () => {
    await pg.getByRole("button", { name: "Tauschen" }).first().click();
    await blatt(pg);
  });
  await zu(pg);
  await bild(pg, "Training · Pause", async () => {
    await pg.getByRole("button", { name: /Satz eintragen/ }).first().click();
    await pg.getByText("Pause beenden").first().waitFor({ timeout: 8000 });
  });
  await bild(pg, "Training · Beenden-Frage", async () => {
    await pg.getByText("Pause beenden").first().click();
    await pg.getByLabel("Training beenden").click();
    await blatt(pg);
  });
  await zu(pg);

  // ── A · Fortschritt ───────────────────────────────────────────────────
  await bild(pg, "Fortschritt · Übersicht", () => pg.goto(BASE + "/fortschritt", { waitUntil: "networkidle" }));
  await bild(pg, "Fortschritt · Verlauf", () => reiter(pg, "Verlauf").click());
  await bild(pg, "Fortschritt · Verlauf · Einheit aufgeklappt", () =>
    pg.locator("main [aria-expanded]").first().click(),
  );
  await bild(pg, "Fortschritt · Verlauf · Cardio nachtragen", async () => {
    await pg.getByRole("button", { name: /Cardio/ }).first().click();
    await blatt(pg);
  });
  await zu(pg);
  await bild(pg, "Fortschritt · Körper", () => reiter(pg, "Körper").click());
  await bild(pg, "Fortschritt · Körper · Eintragen", async () => {
    await pg.getByRole("button", { name: /Körperdaten eintragen/ }).first().click();
    await blatt(pg);
  });
  await zu(pg);
  await bild(pg, "Fortschritt · Muskeln", () => reiter(pg, "Muskeln").click());

  // ── A · Katalog ───────────────────────────────────────────────────────
  await bild(pg, "Katalog", () => pg.goto(BASE + "/uebungen", { waitUntil: "networkidle" }));
  await bild(pg, "Katalog · Übungsdetail", async () => {
    await pg.locator("[data-exercise-id] button, button.min-h-14").first().click();
    await blatt(pg);
  });
  await bild(pg, "Katalog · Übungsdetail · Verlauf", () =>
    pg.locator("[data-sheet]").getByRole("button", { name: "Verlauf", exact: true }).click(),
  );
  await zu(pg);
  await bild(pg, "Katalog · Filter Muster", async () => {
    await pg.getByRole("button", { name: /^Muster/ }).first().click();
    await blatt(pg);
  });
  await zu(pg);
  await bild(pg, "Katalog · Alle Orte", () => pg.getByRole("button", { name: /^Alle/ }).first().click());
  await bild(pg, "Katalog · Eigene Übung", async () => {
    await pg.getByRole("button", { name: /Eigene Übung|Übung anlegen|Neue Übung/ }).first().click();
    await blatt(pg);
  });
  await zu(pg);

  // ── A · ATLAS und Einstellungen ───────────────────────────────────────
  await bild(pg, "ATLAS", () => pg.goto(BASE + "/coach", { waitUntil: "networkidle" }));
  await bild(pg, "Einstellungen · Training", () => pg.goto(BASE + "/settings", { waitUntil: "networkidle" }));
  for (const r of ["Aussehen", "Dienste", "Daten"])
    await bild(pg, `Einstellungen · ${r}`, () => reiter(pg, r).click());
  await ctx.close();

  // ── A · Begrüßung auf einem leeren Gerät ──────────────────────────────
  {
    const leer = await browser.newContext(FENSTER);
    const neu = await leer.newPage();
    await bild(neu, "Begrüßung", async () => {
      await neu.goto(BASE + "/", { waitUntil: "networkidle" });
      // Erst messen, wenn das Startbild weg ist und das Feld oben liegt.
      await neu.waitForFunction(
        () => {
          const feld = document.querySelector('input[aria-label="Dein Name"]');
          if (!feld) return false;
          const r = feld.getBoundingClientRect();
          return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === feld;
        },
        null,
        { timeout: 15000 },
      );
    });
    await leer.close();
  }
  console.log(`     (${gesamt} Bedienelemente gemessen)`);

  // ── D · Gewichtsstufe je Ort ──────────────────────────────────────────
  {
    const ctx2 = await browser.newContext(FENSTER);
    await mitDaten(ctx2, { orte: false });
    const pg2 = await ctx2.newPage();
    await pg2.goto(BASE + "/", { waitUntil: "networkidle" });
    await pg2.getByText("Wo trainierst du heute?").first().waitFor({ timeout: 15000 });
    await pg2.getByRole("button", { name: /^Zuhause/ }).first().click();
    await pg2.getByText("Los geht").first().waitFor({ timeout: 8000 });

    await pg2.goto(BASE + "/settings", { waitUntil: "networkidle" });
    const stufe = pg2.getByRole("group", { name: "Gewichtsstufe an diesem Ort" });
    const gewaehlt = () => stufe.locator('[aria-pressed="true"]').innerText();
    await stufe.waitFor({ timeout: 8000 });
    pruefe((await gewaehlt()) === "2,5 kg", `D · Zuhause beginnt mit der bisherigen Stufe (${await gewaehlt()})`);
    await stufe.getByRole("button", { name: "1,25 kg" }).click();
    await pg2.waitForTimeout(300);
    pruefe((await gewaehlt()) === "1,25 kg", "D · Zuhause lässt sich auf 1,25 kg stellen");

    await pg2.getByRole("group", { name: "Ort bearbeiten" }).getByRole("button", { name: /^Studio/ }).click();
    await pg2.waitForTimeout(300);
    pruefe((await gewaehlt()) === "2,5 kg", `D · das Studio behält dabei seine eigene Stufe (${await gewaehlt()})`);
    await stufe.getByRole("button", { name: "5 kg", exact: true }).click();
    await pg2.waitForTimeout(400);

    const orte = await pg2.evaluate(() => JSON.parse(localStorage.getItem("wilhelm-training-gyms") || "[]"));
    const je = Object.fromEntries(orte.map((o) => [o.name, o.weightStep]));
    pruefe(
      je.Zuhause === 1.25 && je.Studio === 5,
      `D · gespeichert je Ort: Zuhause ${komma(je.Zuhause)} kg, Studio ${komma(je.Studio)} kg`,
    );

    await pg2.goto(BASE + "/", { waitUntil: "networkidle" });
    await pg2.getByText("Los geht", { exact: false }).first().click();
    await pg2.getByText("Überspringen").first().click();
    await pg2.getByLabel("Aufwärmen beenden").click();
    await pg2.getByTestId("stage-order").waitFor({ timeout: 15000 });
    const mehr = pg2.getByLabel("Gewicht 1,25 kg mehr");
    pruefe((await mehr.count()) === 1, "D · die Plus-Taste im Training nennt die Stufe des Orts (1,25 kg)");
    if ((await mehr.count()) === 1) {
      const feld = pg2.getByLabel("Gewicht in kg").first();
      const vorher = Number(await feld.inputValue());
      await mehr.click();
      await pg2.waitForTimeout(200);
      const nachher = Number(await feld.inputValue());
      pruefe(
        Math.abs(nachher - vorher - 1.25) < 0.001,
        `D · ein Tipp auf Plus: ${komma(vorher)} kg → ${komma(nachher)} kg`,
      );
    }
    await ctx2.close();
  }
} catch (e) {
  pruefe(false, `Abbruch: ${String(e?.message ?? e).split("\n")[0]}`);
} finally {
  await browser.close();
  server.kill("SIGTERM");
}

if (fehler.length) {
  console.error(`\n${fehler.length} Prüfpunkt(e) fehlgeschlagen.`);
  process.exit(1);
}
console.log("\nBedienungs-Prüfung bestanden.");
process.exit(0);
