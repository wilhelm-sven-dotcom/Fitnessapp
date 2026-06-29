# Trainingswissenschaft — Evidenzgrundlage der App

> Diese Datei ist die zitierte Grundlage für die Trainingslogik (Engine, Coach,
> Session-Builder). Jede Regel verweist auf die aktuelle Studienlage. Werte werden
> hier zentral begründet und in `lib/training-science.ts` (`VOLUME_LANDMARKS`,
> `TRAINING_PRINCIPLES`) bzw. der Engine umgesetzt — beim Ändern beides synchron halten.
>
> Wichtig: Das ist sportwissenschaftliche Orientierung, kein medizinischer Rat. Bei
> Schmerzen oder wiederholten Reizungen → Arzt/Physio (die App weist aktiv darauf hin).

Stand der Recherche: Juni 2026. Profil-Kontext: Hypertrophie, 3× Ganzkörper/Woche,
20–30 Min, empfindlicher unterer Rücken, Cardio über Peloton/Strava.

---

## 1. Volumen — wie viele Sätze pro Muskel?

**Befund.** Mehr wöchentliches Volumen → mehr Hypertrophie, aber mit klar abnehmendem
Ertrag. Praktische Landmarken: **MEV ~4–8** Sätze/Muskel/Woche (darunter wächst kaum
etwas), **produktiver Bereich ~10–20**, darüber (~22+) selten mehr Nutzen bei steigenden
Erholungskosten.

**Quelle.** Pelland et al. 2024, „The Resistance Training Dose-Response" (Meta-Regression,
67 Studien, n≈2058). <https://pubmed.ncbi.nlm.nih.gov/41343037/> ·
<https://sportrxiv.org/index.php/server/preprint/view/460>

**In der App.** `VOLUME_LANDMARKS = { mev: 6, target: 10, mav: 20, mrv: 22 }`. Treibt das
Wochenvolumen-Verdikt, den Balance-Radar, die „über Ziel"/„hängt zurück"-Cards und die
Volumen-Hinweise im Coach-Kontext. Unterversorgte Muskeln werden bei der Planung priorisiert.

---

## 2. Nähe zum Muskelversagen (RIR)

**Befund.** Näher am Versagen trainieren hilft der Hypertrophie, der Effekt flacht aber
ab etwa **2 RIR** ab — Sätze bei RIR 0–3 (Großteil 1–2) liefern den Reiz, stures Versagen
bringt v. a. mehr Ermüdung. Versagen vs. 1–2 RIR: vergleichbarer Muskelzuwachs.

**Quellen.** Robinson et al. 2024, Proximity-to-Failure-Meta-Regression (55 Hypertrophie-,
67 Kraftstudien) <https://sportrxiv.org/index.php/server/preprint/view/295> · Refalo et al.
2024, J Sports Sci <https://www.tandfonline.com/doi/full/10.1080/02640414.2024.2321021>

**In der App.** `rirAdjust`/`presc` in `lib/progression.ts`: alle Arbeitssätze RIR 0–1 →
+Last; ein Satz bei RIR ≥3 → eine Stufe leichter; RIR 2 → Gewicht halten, +1 Wdh. Genau
das „nah dran, aber nicht stur bis zum Versagen".

---

## 3. Progressive Überlastung & Frequenz

**Befund.** Fortschritt entsteht durch steigenden Reiz über die Zeit (doppelte Progression:
erst Wiederholungen in der Spanne, dann Last). Frequenz pro Muskel hat bei **gleichem
Wochenvolumen** vernachlässigbaren Zusatzeffekt — 2×/Woche ist praktisch (Erholung,
Volumenverteilung), nicht weil „öfter = mehr".

**Quelle.** Pelland et al. 2024 (s. o.; Frequenz-Slope ≈ 0 bei äquivalentem Volumen).

**In der App.** Doppelte Progression in `presc`; 3× Ganzkörper trifft jeden Muskel ~2–3×/Woche.

---

## 4. Pausen & Übungsauswahl

**Befund.** Längere Satzpausen (**~2–3 Min** bei Grundübungen) sind für Kraft/Hypertrophie
besser als sehr kurze; Isolation/Core dürfen kürzer. Tendenz in neuerer Evidenz: Übungen,
die den Muskel in der **gedehnten Position** unter Last fordern, begünstigen Wachstum.

**Quellen.** Inter-set-Rest-Meta-Analyse 2024
<https://pmc.ncbi.nlm.nih.gov/articles/PMC11349676/> · Lengthened-Position-Literatur (laufende Evidenz).

**In der App.** Als Prinzip in `TRAINING_PRINCIPLES` → Coach/Builder berücksichtigen es.

---

## 5. Autoregulation (Tagesform / RIR)

**Befund.** Autoregulierte Steuerung (APRE/RPE/RIR, velocity-based) schlägt starre
Prozent-Vorgaben für Kraftzuwachs und individualisiert die Belastung.

**Quelle.** Netz-Metaanalyse 2025, „Autoregulated resistance training for maximal strength"
<https://pmc.ncbi.nlm.nih.gov/articles/PMC12336695/>

**In der App.** `lib/readiness.ts` (Schlaf/Energie/Rücken → Band → `loadMult`/`setDelta`/`cap`)
+ RIR-Autoregulation in `presc`. Die Tagesform-Abfrage steuert Last und Satzzahl pro Einheit.

---

## 6. Individuelle Variabilität

**Befund.** Menschen reagieren unterschiedlich auf dieselbe Dosis; ein guter Teil der
„Variabilität" ist allerdings Messrauschen. Wichtig fürs Coaching: **Non-Responder auf
niedriges Volumen reagieren oft, wenn das Volumen steigt** → bei Stillstand Volumen testen.
Einflussgrößen: Genetik/Muskeltypologie, Schlaf, Ernährung, Erfahrung.

**Quellen.** Higher volume offsets non-response, J Appl Physiol 2023
<https://journals.physiology.org/doi/full/10.1152/japplphysiol.00670.2023> ·
Within-individual-Designs 2025 <https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11825802/>

**In der App.** Profil-Erfahrung skaliert die Volumen-Erwartung (`profileKnobs`); der
`volumeBumpSignal`-Vorschlag rät bei stagnierenden Lifts mit Volumen-Spielraum zu +1 Satz.

---

## 7. Unterer Rücken — belasten statt vermeiden

**Befund.** Bei unspezifischen chronischen Rückenbeschwerden ist **progressives
Krafttraining wirksam** (weniger Schmerz, mehr Funktion/Belastbarkeit) und der reinen
Schonung überlegen. Konsequenz: nicht dauerhaft meiden, sondern **kontrolliert, progressiv
aufbauen** (neutrale Wirbelsäule, moderat starten, steigern).

**Quellen.** JOSPT 2024 RCT <https://www.jospt.org/doi/10.2519/jospt.2024.12349> ·
Meta-Analyse 2023 <https://pubmed.ncbi.nlm.nih.gov/36805624/>

**In der App.** `stressesInjury`/`resolveSession` schonen die gewählte Region (bevorzugen
gleiche Musterung ohne hohe Last) — als Start, nicht als Dauer-Tabu; Persona & Prinzipien
betonen den progressiven Aufbau. Bei zweimal „rot" in Folge rät die App zu Arzt/Physio.

---

## 8. Cardio ↔ Kraft (Interferenz-Effekt)

**Befund.** Hartes Ausdauertraining kann die **Unterkörper-Kraftentwicklung mindern**
(„interference effect"), am stärksten bei moderat-intensivem Dauer-Radfahren und innerhalb
**~24 h** vor dem Krafttraining. **Radfahren stört weniger als Laufen**, aber messbar.
Sequenz Kraft-vor-Ausdauer hilft.

**Quellen.** Concurrent-Training-Meta-Analysen 2023–2024, u. a.
<https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9908959/> ·
<https://pmc.ncbi.nlm.nih.gov/articles/PMC11057620/>

**In der App.** `lib/cardio-advice.ts`: harte Peloton-Fahrt < 24 h → Empfehlung „Beine
schonen / Oberkörper vorziehen"; 24–48 h oder moderat < 24 h → „leicht antasten". Sichtbar
als Home-Card, Workout-Banner und Tagesform-Kontext — Vorschlag, keine automatische Änderung.
