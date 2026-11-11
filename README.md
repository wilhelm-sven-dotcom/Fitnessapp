# spotter

Hochpersonalisierte Trainings-App für Muskelaufbau mit **ATLAS**, dem
KI-Trainingspartner, der jede Einheit frisch zusammenstellt und live durchs
Training begleitet. Der Name ist die Rolle: der Spotter, der Kumpel an der
Bank, der dich beim Heben sichert („Eine geht noch.“); die Bedienung spricht
schlichtes, freundliches Deutsch. Vorher hieß die App „Platte 311“. Ganzkörper-Fokus, Zeitfenster frei
wählbar (10–180 Minuten, Stufen oder eigene Zahl), mit besonderem Augenmerk auf einen empfindlichen unteren
Rücken.

## Wie die App funktioniert

**Heute (`/`)** — Zuerst die Frage „Wo trainierst du heute?“ (Zuhause,
Studio oder eigene Orte, jeweils mit eigener Geräteliste), danach stellt
ATLAS die Einheit aus genau den Übungen zusammen, die der Ort hergibt. Der Ort
ist oben jederzeit umschaltbar; eine unberührte Einheit wird dann neu
zusammengestellt. ATLAS stellt jeden Tag eine neue Einheit aus dem gesamten
Katalog zusammen: bedarfsgerecht (Wochen-Volumen-Defizit + Tage seit letztem
Reiz je Muskel), abwechslungsreich (am längsten nicht verwendete Übung je
Muster) und passend zum Zeitbudget. Keine festen Pläne, keine Vorlagen. Die
Einheit ist frei editierbar (tauschen, ergänzen, Sätze ändern, Wunsch-Feld
„heute bitte Oberkörper"), Varianten: Rücken-Reset (gewichtsfrei) und
„Die Prüfung" (Maximalkraft-Test). Oben stehen Wochentag und Fokus, darunter
die Wochenleiste (Montag bis Sonntag, Wochenziel drei Einheiten); Zeit und
„Los geht’s“ liegen im Dock über der Tab-Leiste.

**Training (`/workout`)** — folgt der Einstellung Hell oder Dunkel: Check-in
(Tagesform) → geführtes Aufwärmen → eine Übung nach der anderen (mit
animierter Phasenfigur) → Abschluss. Sätze werden lokal gepuffert eingetragen
(kein Re-Render pro Tastendruck), die Satzpause läuft unten im Dock und
rechnet aus der Uhr, und der Live-Zustand ist bei jedem Commit gerätelokal
persistiert — ein Reload oder Crash mitten im Satz kostet nichts (Resume).
Meldungen stehen oben unter dem Kopf, nie über „Satz eintragen“. ATLAS reagiert
auf **jeden Satz**: sofort deterministisch, und mit Server-Key ersetzt die
KI-Reaktion die Zeile — mit Blick auf das komplette Transkript der Einheit,
inklusive übernehmbarer Eingriffe (Gewicht, Pause). Ein neuer Rekord bekommt
seinen eigenen Moment samt teilbarem Poster.

**ATLAS (`/coach`)** — Missions-Status, Tages-Direktive, Wochen-Rückblick
(deterministisch sofort, ATLAS-Fassung gestreamt) und der Chat mit
persistiertem Verlauf — Antworten rendern strukturiert
(Beobachtung/Einschätzung/Plan).

**Katalog (`/uebungen`)** — 115 Übungen mit deutschem Voll-Content (Ausführung, Rücken-Hinweis, leichtere Variante,
Phasenfigur-Piktogramm), nach Ort aufgeteilt (Studio / Zuhause / Alle) und
filterbar nach Muster und Muskel. Im Studio wählst du die Kraftgeräte einzeln
und trainierst auf Wunsch nur an Geräten (Maschinen und Kabelzug); der
Katalog zeigt das Studio dann nach Geräten, jedes mit Zeichnung oder deinem
eigenen Foto, das auch im Training und auf Heute erscheint. Eigene Übungen sind erstklassig: voller Editor (Muskeln, Equipment,
Schema, Cues) — sie fließen automatisch in Pools, Wochenvolumen und ATLAS'
Auswahl.

**Fortschritt (`/fortschritt`)** — vier Register: Übersicht (Level, Phase,
Rekorde, Volumen je Woche, Verläufe je Übung als Liste mit Mini-Kurve), Verlauf
(Timeline für Kraft **und** Ausdauer inkl. Strava-Importe, jede Einheit mit
Mini-Phasenband), Körper (Gewicht, Bauchumfang, Vorher/Nachher-Fotos) und
Muskeln (Wochenarbeit in vier Blaustufen).

## Weitere Features

- **Bewegungsbilder** — alle Studio-Übungen (22), alle Aufwärmübungen (24)
  und 84 der 93 freien Übungen zeigen eine Illustration mit Person, die in vier
  Phasen die Bewegung vormacht: groß im Übungsdetail und beim Aufwärmen, als
  Kachel auf der Trainingskarte. Übungen ohne Bild zeigen die Phasenfigur
  (`public/bewegung/README.md`, Prompt für die übrigen:
  `docs/bewegungsbilder-prompt-zuhause.md`).
- **Steigerung** — doppelte Progression: Gewicht hoch, sobald alle Sätze die
  obere Wiederholungsgrenze schaffen und mindestens 1 in Reserve bleibt (oder
  bei 3 in Reserve). Entlastungs- und Test-Einheiten sind kein Ausgangswert.
  Nach 14 Tagen Lücke ruhig einsteigen, nach 28 Tagen 10 % leichter.
- **RIR-Autoregulation** — Gewichtsempfehlung aus Reps-in-Reserve; Tagesform
  (Check-in + Sprungtest) skaliert Last und Satzzahl.
- **Rücken-Intelligenz** — Ampel nach jeder Einheit; „rot" erzwingt
  rückenschonende Auswahl, 2× rot → Arzt-Hinweis; Rücken-Reset-Einheit.
- **Automatische Aufwärmsätze** (40 %/65 %) bei der ersten Übung je Muskel +
  geführtes Aufwärm-Programm.
- **Satzpause** — Grundübungen 2:00, sonst 1:30; läuft aus der Uhr und stimmt
  auch nach Sperre oder Neuladen.
- **Gym-Modus** — Sprach-Ansagen, Wake-Lock, Spotify-Now-Playing.
- **Gewichtsstufe je Ort** — zuhause 1,25 kg, im Studio 5 kg: Vorschläge und
  die Plus-Minus-Tasten runden auf die Stufe des heutigen Orts.
- **ATLAS-Server-API** (`/api/atlas/*`) — session (Plan), set (Reaktion auf
  einen Satz), debrief, chat, briefing (Textströme), status (Stand und
  Selbsttest). Ein gemeinsamer Aufruf (`lib/atlas/call.ts`), gecachtes
  System-Präfix, strukturierte Ausgabe, Server-Sanitizer, Minuten-Limits,
  zuschaltbarer Zugangscode. Siehe „ATLAS“ unten.
- **Ohne Netz** — der Service Worker lädt beim Installieren alle Hauptseiten
  und den ganzen Code des Builds vor; im Studio braucht die App kein Netz.
  Ein Update wartet, bis das Training gespeichert ist (siehe unten).
- **Cloud-Sync** — optionaler Login (Supabase). Dieses Gerät ist die
  Wahrheit, die Cloud die Sicherung; der Live-Trainingszustand synct bewusst
  NICHT (gerätelokal).
- **Export/Import** als JSON, ohne die Zugänge zu Strava und Spotify;
  einspielen als „Ergänzen“ oder „Ersetzen“.

## ATLAS

| Aufgabe | Modell | Nachdenken (`effort`) |
|---|---|---|
| Plan, Chat, Wochen-Rückblick | `claude-fable-5-2` | mittel |
| Auswertung nach der Einheit | `claude-fable-5-2` | wenig |
| Reaktion auf einen Satz | `claude-sonnet-5-5` | wenig |
| Ersatz, wenn ein Modell die Anfrage nicht annimmt | `claude-opus-5-5` | wie die Aufgabe |

Zuordnung und Grenzen stehen in `lib/atlas/models.ts`, der eine Weg zu Claude
in `lib/atlas/call.ts`:

- Strukturierte Antworten (Plan, Satz-Reaktion) über `output_config.format`
  mit den Schemas aus `lib/atlas/session-tool.ts` und `live-tool.ts`. Einen
  erzwungenen Tool-Aufruf (`tool_choice`) weisen diese Modelle ab, ebenso
  `thinking`, `temperature` und ein vorgeschriebenes Antwort-Präfix.
- Jede Antwort wird auf ihren Endegrund geprüft: Ablehnung und abgeschnittene
  Antwort sind Fehler, kein Ergebnis. Bei einer Ablehnung aus
  Sicherheitsgründen antwortet serverseitig ein anderes Modell
  (`fallbacks: "default"`).
- Nimmt ein Modell die Anfrage gar nicht an (400, 403, 404), geht sie einmal an
  das Ersatzmodell. Fable 5.2 verlangt im Anthropic-Konto 30 Tage
  Datenaufbewahrung und antwortet sonst mit 400. Ist das Guthaben im
  Anthropic-Konto aufgebraucht, sagt die App genau das („ATLAS pausiert“) und
  fragt kein Ersatzmodell, denn das Guthaben gilt für alle Modelle.
- Textströme enden mit einer Statuszeile (`lib/atlas/fehler.ts`). Ein
  Fehlersatz steht nie im Text und damit nie im gespeicherten Chat.
- Jeder Aufruf schreibt eine Zeile ins Server-Protokoll (`[atlas]`): Aufgabe,
  Modell, Dauer, Token, Cache-Treffer. Keine Inhalte.

Prüfen: `npm run pruefe:atlas` stellt die Schnittstelle lokal nach (kein
Schlüssel, keine Kosten). Gegen die echte Schnittstelle prüft „ATLAS testen“
unter Einstellungen → Training: zwei kleinste Anfragen, die zeigen, welches
Modell antwortet, wie schnell, und woran es sonst hängt.

## Ohne Netz und ohne Datenverlust

**Service Worker.** `/sw.js` entsteht beim Bauen: `app/sw.js/route.ts` stellt
vor die Logik (`worker.js`) die Liste aller Skripte, Styles, Schriften und
Bilder (Geräte, Bewegungen, Momente) des Builds samt Fingerabdruck. Der Worker lädt beim Installieren
diese Liste und die sechs Hauptseiten vor; fehlt etwas, bleibt der bisherige
Worker im Amt. Seitenaufrufe gehen zuerst ins Netz, höchstens 3 s, dann kommt
die vorgeladene Seite; `/api/` fasst der Worker nie an. Ein neuer Build
wartet, bis die Seite ihn freigibt, und das tut sie nie in `/workout`
(`components/pwa/ServiceWorkerRegister.tsx`). Von Hand zu pflegen ist nichts.

**Daten** (`lib/storage.ts`). localStorage ist der Speicher der App.

- Schreiben meldet Erfolg. Die laufende Einheit wird erst weggeräumt, wenn
  sie wirklich im Verlauf steht; ist der Speicher voll, sagt die App das.
- Vom Verlauf und den Körperwerten bleibt die Fassung vor der ersten Änderung
  des Tages als Sicherung (`…-sicherung`), zurückzuholen unter Einstellungen
  → Daten. Unlesbare Werte werden beiseitegelegt (`…-defekt`), nicht gelöscht.
- Eine Einheit, die vor mehr als sechs Stunden begann und in der Sätze
  stehen, verschwindet nicht mehr: Heute fragt „speichern oder verwerfen“.
- Cloud: Beim ersten Anmelden mit einem Konto wird zusammengeführt
  (`lib/merge.ts`). Danach wird nichts mehr still zurückgeholt, sonst käme
  Gelöschtes wieder; was ohne Netz geändert wurde, wird nachgereicht.
- „Alle Daten löschen“ löscht alles auf dem Gerät und in der Cloud; die App
  startet danach wie neu.

Nachweis: `npm run pruefe:offline` und `npm run pruefe:daten`.

## Sicherheit

- Der Anthropic-Schlüssel liegt nur auf dem Server. Mit `ATLAS_ZUGANGSCODE`
  nimmt der Server ATLAS-Anfragen nur mit diesem Code an.
- Jede Antwort trägt Sicherheits-Header (`next.config.mjs`): kein Erraten des
  Dateityps, keine Einbettung in fremde Seiten, fremde Adressen erfahren nur
  die Herkunft, und Mikrofon, Standort, Zahlung und USB sind abgeschaltet
  (die Kamera nicht: Fortschrittsfotos nutzen sie). HTTPS erzwingt Vercel. Eine vollständige
  Content-Security-Policy gibt es bewusst nicht: sie verlangte eine Kennung je
  Antwort, dann wäre keine Seite mehr statisch und ließe sich nicht für das
  Training ohne Netz vorladen.
- Der Export enthält keine Zugänge zu Strava und Spotify.

## Design

„spotter“ — der Kumpel an der Bank: Weiß und Tinte, Elektroblau für
Aktionen und Daten, Signalorange für Rekorde, Sonnengelb für Sticker. Karten
und Knöpfe tragen einen dicken Tinte-Rand (2,5 px) und einen harten
Versatz-Schatten; Etiketten sind leicht gedrehte Sticker; Körperregionen sind
kleine Kacheln (Beine Orange, Druck Blau, Zug Gelb, Rumpf Weiß). ATLAS spricht
in Sprechblasen. Schriften: Bricolage Grotesque (Titel, Zahlen, Knöpfe) und
Onest (Text). Hell ist der Grundzustand, Dunkel folgt der Einstellung. Das
App-Zeichen ist eine Sprechblase mit Hantel auf Blau; beim Kaltstart läuft ein
blaues Startbild mit Sticker (abschaltbar unter Einstellungen · Darstellung).
Nach einem Rekord wird die Fläche orange und die PR-Karte springt auf.
Verbindliche Tokens, Rezepte und Regeln: `.claude/skills/ui-style/SKILL.md`.

## Stack

Next.js 15.5 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v3 ·
Framer Motion · @anthropic-ai/sdk. Persistenz über `localStorage`,
abstrahiert in `lib/storage.ts` (Supabase-Spiegel optional).

## Entwicklung

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # Produktions-Build
npm test         # Unit-Tests der Trainingslogik (tests/, node:test über tsx)
npm run smoke    # End-to-End-Smoke gegen den Build (ohne API-Key = Fallback-Pfade)
npm run pruefe:training   # misst im Fokus-Modus, was Strings nicht hergeben
npm run pruefe:zeit       # zählt ATLAS-Anfragen beim Umstellen der Trainingszeit
npm run pruefe:ort        # Ortswahl Zuhause/Studio: Frage, Umschalten, Geräte
npm run pruefe:offline    # ohne Netz: Seiten, Training, Neuladen, Update wartet im Training
npm run pruefe:daten      # Speichern, liegengebliebene Einheit, Löschen, Export/Import, Strava
npm run pruefe:atlas      # ATLAS-Routen gegen eine nachgestellte Schnittstelle (kein Schlüssel nötig)
npm run pruefe:bedienung  # jedes Bedienelement benannt und mindestens 44 px, Meldungen, Offline, Gewichtsstufe je Ort
npm run tempo             # Rechenzeit mit 150 Einheiten im Verlauf, mit Grenzen
npm run pruefe            # alle Prüfungen nacheinander (Port 3199, dazu 3198 und 3197)
npm run fotos -- --klein  # Bildschirmfotos nach .fotos/, mit --klein auch 375 × 667
npm run messen            # wo Start-, Satz- und ATLAS-Eingabe liegen (JSON)
npm run kontrast          # WCAG-Kontrast der Farb-Tokens, hell und dunkel
npm run pruefe:tokens     # Fundstellen alter Token-Namen (Look-Wechsel)
```

Bei GitHub läuft für jeden Pull Request und jeden Stand des
Produktions-Branches `.github/workflows/pruefung.yml`: Lint, Typen,
Unit-Tests, Build, Kontrast und Token-Namen. Die Prüfungen im Browser
(`npm run pruefe`) laufen lokal vor jedem Push; sie messen Zeiten, und die
schwanken auf den geteilten Rechnern von GitHub zu stark.

## Umgebungsvariablen

Siehe `.env.local.example`. Für ATLAS' KI wird `ANTHROPIC_API_KEY`
**serverseitig** benötigt (lokal in `.env.local`, in Produktion in den
Vercel-Projekt-Einstellungen). Der Schlüssel verlässt nie den Server. Ohne
Schlüssel läuft die App vollständig über die deterministischen Fallbacks
(Basis-Planer, Live-Zeilen, Debrief).

Für Cloud-Sync werden `NEXT_PUBLIC_SUPABASE_URL` und
`NEXT_PUBLIC_SUPABASE_ANON_KEY` gesetzt und das SQL aus
[`supabase/SETUP.md`](supabase/SETUP.md) eingespielt (Tabelle `app_state` mit
Row-Level-Security pro Nutzer, privater Bucket für die Fortschrittsfotos).
Ohne Konfiguration bleiben die Daten lokal.

### Anmeldung ohne Mail-Limit

Der **eingebaute Supabase-Mailer hat eine harte Stundenrate** (eine Handvoll
Mails, projektweit). Das ist eine Projekt-Einstellung, keine Code-Frage — im
Repo lässt sie sich nicht ändern. Die App umgeht sie deshalb: Anmelden **und**
Kontoanlegen laufen über E-Mail + Passwort und brauchen gar keine Mail. Die
Anmelde-Mail bleibt nur als Notausgang. Damit der auch in der App auf dem
Home-Bildschirm funktioniert, sollte die Mail einen Code statt eines Links
enthalten (Vorlage umstellen: `supabase/SETUP.md`, Abschnitt D). Kommt doch ein
Link, nimmt das Code-Feld auch den kopierten Link und meldet direkt in der App
an (`lib/anmeldung.ts`).

Damit das Anlegen wirklich mailfrei durchläuft, müssen im Supabase-Projekt zwei
Auth-Schalter stehen. Die Befehle dafür — und das SQL für Tabelle und
Foto-Bucket — stehen zum Kopieren in **[`supabase/SETUP.md`](supabase/SETUP.md)**.

## Struktur

- `app/` — Seiten: Heute (`/`), Training (`/workout`), ATLAS (`/coach`),
  Katalog (`/uebungen`), Fortschritt, Einstellungen + `api/atlas/*`
- `components/session/` — der Fokus-Stepper (Runner, Übungsansicht, Pause,
  ATLAS-Panel, Übersicht, Abschluss)
- `components/phasen/` — Phasenfiguren (freeze/zoetrop/marey) + Myologie;
  `components/ui/Phasenband.tsx` — der Filmstreifen der Einheit
- `components/` — Home-, Coach-, Fortschritts- und UI-Komponenten
- `lib/` — Session-Modell (`session-model`, `session-fallback`,
  `active-session`), ATLAS (`atlas/*`), Übungskatalog, Progression (RIR),
  Volumen/Trainer-Engine, Einheiten-Nummern (`platte.ts`), Storage
- `tests/` — Unit-Tests der Logik; `scripts/` — Prüfungen im Browser, Fotos,
  Kontrast

Regeln, die mehrere Bildschirme teilen, stehen je an einer Stelle:
Wochenanfang (Montag) und Tag/Woche in Millisekunden in `lib/zeit.ts`, das
Wochenziel von drei Einheiten in `lib/training-science.ts`, die
Entlastungswoche (sieben Tage, 60 % Last, ein Satz weniger) in
`lib/periodization.ts`, Satzpause und Zeitmodell in `lib/session-time.ts`,
Steigerung und Trainingslücke in `lib/progression.ts`, die Gewichtsstufe je Ort
in `lib/orte.ts`.

Daten-Schlüssel: `wilhelm-training-{log,equip,custom,body,cardio,cardio-hidden,
disabled,gyms,settings,exercise-videos,warmup-videos,exercise-notes,mission,
jumps,today,chat,rapport}` (synct) und `wilhelm-training-active` (bewusst nur
lokal — der Live-Zustand einer laufenden Einheit). Dazu nur lokal:
`…-sicherung`, `…-sicherung-tag`, `…-defekt` und die Vermerke
`…-cloud-{offen,konto,leeren}`. „Alle Daten löschen“ entfernt alles mit dem
Präfix `wilhelm-training-`.
