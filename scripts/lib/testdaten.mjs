/**
 * Testdaten für Fotos und Messungen: vier Wochen Verlauf, Zuhause und Studio
 * im Wechsel, fünf Körperwerte. Nur für scripts/fotos.mjs und scripts/messen.mjs.
 */
export const day = (d) => new Date(Date.now() - d * 86400000).toISOString();
export const S = (weight, reps, rir = 2) => ({ weight: String(weight), reps: String(reps), rir });


export const LOG = [
  { date: day(26), dayKey: "today", dayName: "Ganzkörper · Beine & Druck", focus: "", ort: "Zuhause", exercises: [
    { id: "goblet", name: "Goblet Squat", unit: "Wdh", sets: [S(18, 12), S(18, 12), S(18, 11, 1)] },
    { id: "bench_db", name: "Kurzhantel-Bankdrücken", unit: "Wdh", sets: [S(20, 10), S(20, 9, 1)] },
    { id: "glutebridge", name: "Glute Bridge mit Gewicht", unit: "Wdh", sets: [S(24, 12), S(24, 12)] } ] },
  { date: day(23), dayKey: "today", dayName: "Ganzkörper · Zug", focus: "", ort: "Studio", exercises: [
    { id: "lat_pulldown", name: "Latzug am Kabel", unit: "Wdh", sets: [S(50, 10), S(52.5, 9), S(52.5, 8, 1)] },
    { id: "leg_press", name: "Beinpresse", unit: "Wdh", sets: [S(110, 12), S(110, 12)] },
    { id: "rdl_db", name: "Rumänisches Kreuzheben (KH)", unit: "Wdh", sets: [S(22, 10), S(22, 10)] } ] },
  { date: day(19), dayKey: "today", dayName: "Ganzkörper · Beine & Druck", focus: "", ort: "Zuhause", exercises: [
    { id: "goblet", name: "Goblet Squat", unit: "Wdh", sets: [S(20, 12), S(20, 11), S(20, 10, 1)] },
    { id: "bench_db", name: "Kurzhantel-Bankdrücken", unit: "Wdh", sets: [S(22, 9), S(22, 8, 1)] } ] },
  { date: day(16), dayKey: "today", dayName: "Ganzkörper · Zug", focus: "", ort: "Studio", exercises: [
    { id: "lat_pulldown", name: "Latzug am Kabel", unit: "Wdh", sets: [S(52.5, 10), S(55, 9), S(55, 8, 1)] },
    { id: "leg_press", name: "Beinpresse", unit: "Wdh", sets: [S(115, 12), S(120, 10)] } ] },
  { date: day(12), dayKey: "today", dayName: "Ganzkörper · Rücken & Schultern", focus: "", ort: "Zuhause", exercises: [
    { id: "rdl_db", name: "Rumänisches Kreuzheben (KH)", unit: "Wdh", sets: [S(24, 10), S(24, 10)] },
    { id: "glutebridge", name: "Glute Bridge mit Gewicht", unit: "Wdh", sets: [S(26, 12), S(26, 12)] } ] },
  { date: day(9), dayKey: "today", dayName: "Ganzkörper · Beine & Druck", focus: "", ort: "Zuhause", exercises: [
    { id: "goblet", name: "Goblet Squat", unit: "Wdh", sets: [S(20, 12), S(22, 10), S(22, 10, 1)] },
    { id: "bench_db", name: "Kurzhantel-Bankdrücken", unit: "Wdh", sets: [S(22.5, 10), S(22.5, 9, 1)] } ] },
  { date: day(5), dayKey: "today", dayName: "Ganzkörper · Zug", focus: "", ort: "Studio", exercises: [
    { id: "lat_pulldown", name: "Latzug am Kabel", unit: "Wdh", sets: [S(55, 10), S(57.5, 8, 1)] },
    { id: "leg_press", name: "Beinpresse", unit: "Wdh", sets: [S(120, 12), S(125, 10, 1)] } ] },
  { date: day(2), dayKey: "today", dayName: "Ganzkörper · Rücken & Schultern", focus: "", ort: "Zuhause", exercises: [
    { id: "goblet", name: "Goblet Squat", unit: "Wdh", sets: [S(22.5, 12), S(22.5, 11)] },
    { id: "glutebridge", name: "Glute Bridge mit Gewicht", unit: "Wdh", sets: [S(27.5, 12), S(27.5, 12)] } ] },
];
export const BODY = [28, 21, 14, 7, 1].map((d, i) => ({ date: day(d), weightKg: [84.1, 83.6, 83.4, 82.9, 82.6][i], waistCm: [92, 91.5, 91, 90.5, 90][i] }));
export const SETTINGS = (theme) => ({
  timeBudgetMin: 45, autoregOn: true, theme, themeMigratedM72: true, onboarded: true,
  benchMigrated: true, splash: "aus", userName: "Sven",
});


/** Startet `next start` auf `port` und wartet, bis die Seite antwortet. */
export async function starteServer(spawn, port) {
  const server = spawn("npx", ["next", "start", "-p", String(port)], {
    stdio: "ignore",
    env: { ...process.env, ANTHROPIC_API_KEY: "", NEXT_TELEMETRY_DISABLED: "1" },
  });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(base + "/")).ok) return { server, base };
    } catch {
      /* noch nicht oben */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  server.kill();
  throw new Error("Server startet nicht (npm run build vergessen?)");
}

/** Browser-Kontext mit eingespielten Testdaten. */
export async function kontextMitDaten(browser, { theme = "light", breite = 390, hoehe = 844, faktor = 2 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: hoehe }, deviceScaleFactor: faktor });
  await ctx.addInitScript(([settings, log, body]) => {
    if (!localStorage.getItem("wilhelm-training-settings")) {
      localStorage.setItem("wilhelm-training-settings", JSON.stringify(settings));
      localStorage.setItem("wilhelm-training-log", JSON.stringify(log));
      localStorage.setItem("wilhelm-training-body", JSON.stringify(body));
    }
  }, [SETTINGS(theme), LOG, BODY]);
  return ctx;
}
