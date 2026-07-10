import type {
  Exercise,
  Template,
  EquipItem,
  EquipKey,
  Pattern,
} from "@/lib/types";

/* ===================== Übungsbibliothek ===================== */
/* req-Token: none | weight(db|kb|bar) | dumbbell | kettlebell | bar | pullup | rings | bands | box | bench */
export const LIB: Exercise[] = [
  // SQUAT
  { id: "goblet", name: "Goblet Squat", pattern: "squat", tag: "Beine", req: ["weight"], weighted: true, sets: 3, repLow: 10, repHigh: 12, unit: "Wdh", cue: "Gewicht vor der Brust, Oberkörper aufrecht, Core fest.",
    steps: ["Gewicht mit beiden Händen vor der Brust halten.", "Gesäß nach hinten und runter, Knie folgen den Zehen.", "Bis Oberschenkel waagerecht, aus den Fersen hoch."], back: "Brust offen, aufrecht, Mitte fest. Grüne Linie gerade.", easier: "Halbe Tiefe oder ohne Gewicht." },
  { id: "squat_bw", name: "Kniebeuge (Körpergewicht)", pattern: "squat", tag: "Beine", req: ["none"], weighted: false, sets: 3, repLow: 15, repHigh: 25, unit: "Wdh", cue: "Aufrecht, langsam runter, Spannung halten.",
    steps: ["Schulterbreiter Stand, Arme vor.", "Tief und kontrolliert beugen, aufrecht bleiben.", "Aus den Fersen hoch."], back: "Rumpf fest, Rücken gerade.", easier: "Weniger tief, an Stuhllehne festhalten." },
  { id: "squat_bar", name: "Langhantel-Kniebeuge", pattern: "squat", tag: "Beine", req: ["bar"], weighted: true, sets: 3, repLow: 5, repHigh: 8, unit: "Wdh", cue: "Stange auf dem oberen Rücken, Core hart, Brust auf.",
    steps: ["Stange auf dem Trapez, schulterbreiter Stand.", "Hüfte zurück und runter, Knie über den Zehen.", "Bis Oberschenkel waagerecht, aus den Fersen hoch."], back: "Rumpf hart anspannen, Rücken neutral, nicht rund werden.", easier: "Weniger Gewicht, Kniebeuge zur Box." },
  // LUNGE
  { id: "bss", name: "Bulgarian Split Squat", pattern: "lunge", tag: "Beine", req: ["box"], weighted: true, sets: 3, repLow: 8, repHigh: 10, unit: "Wdh", cue: "Hinterer Fuß erhöht, Rumpf aufrecht. Pro Bein.",
    steps: ["Hinterer Fuß erhöht hinter dir.", "Vorderes Bein beugen, Knie über dem Fuß.", "Aus der Ferse hoch. Seite wechseln."], back: "Aufrecht, nur leicht aus der Hüfte geneigt.", easier: "Ohne Gewicht, kleinere Schrittlänge." },
  { id: "reverse_lunge", name: "Ausfallschritt rückwärts", pattern: "lunge", tag: "Beine", req: ["none"], weighted: true, sets: 3, repLow: 8, repHigh: 12, unit: "Wdh", cue: "Schritt zurück, Rumpf aufrecht. Pro Bein.",
    steps: ["Aus dem Stand einen Schritt nach hinten.", "Hinteres Knie Richtung Boden, vorne stabil.", "Zurück in den Stand. Seite wechseln."], back: "Oberkörper aufrecht, nicht nach vorne kippen.", easier: "Ohne Gewicht, kleinere Schritte." },
  { id: "stepup", name: "Step-ups", pattern: "lunge", tag: "Beine", req: ["box"], weighted: true, sets: 3, repLow: 10, repHigh: 12, unit: "Wdh", cue: "Auf stabile Erhöhung, Kraft aus der Ferse. Pro Bein.",
    steps: ["Ganzen Fuß auf die Stufe.", "Über die Ferse hochsteigen.", "Kontrolliert absteigen. Seite wechseln."], back: "Aufrecht, nicht nach vorne kippen.", easier: "Niedrigere Stufe, ohne Gewicht." },
  // HINGE
  { id: "glutebridge", name: "Glute Bridge mit Gewicht", pattern: "hinge", tag: "Gesäß", req: ["weight"], weighted: true, sets: 3, repLow: 12, repHigh: 15, unit: "Wdh", cue: "Schultern am Boden, Hüfte hoch, oben anspannen.",
    steps: ["Auf den Rücken, Füße hüftbreit auf.", "Gewicht auf der Hüfte halten.", "Hüfte hoch bis Schulter-Hüfte-Knie eine Linie."], back: "Kraft aus dem Po, nicht aus dem Rücken. Nicht überstrecken.", easier: "Nur Körpergewicht." },
  { id: "hip_thrust", name: "Hip Thrust", pattern: "hinge", tag: "Gesäß", req: ["weight", "box"], weighted: true, sets: 3, repLow: 10, repHigh: 15, unit: "Wdh", cue: "Schultern auf Box, Hüfte voll strecken.",
    steps: ["Schultern an Box/Sofa anlehnen.", "Gewicht auf der Hüfte.", "Hüfte hoch bis voll gestreckt, oben halten."], back: "Bewegung aus dem Po, Rippen unten lassen.", easier: "Ohne Gewicht oder kleinere Auflage." },
  { id: "rdl_db", name: "Rumänisches KH-Kreuzheben (leicht)", pattern: "hinge", tag: "Beinrückseite", req: ["dumbbell"], weighted: true, sets: 3, repLow: 10, repHigh: 12, unit: "Wdh", cue: "Hüfte zurück, Rücken absolut gerade, leicht bleiben.", backCaution: true,
    steps: ["Leichte Hanteln vor den Oberschenkeln.", "Hüfte nach hinten schieben, Knie leicht gebeugt.", "Bis Dehnung in den Beinrückseiten, dann zurück."], back: "Rücken kompromisslos gerade, nicht rund. Bei Reizung weglassen.", easier: "Sehr leicht, geringere Tiefe." },
  { id: "deadlift", name: "Kreuzheben (Langhantel)", pattern: "hinge", tag: "Beinrückseite & Rücken", req: ["bar"], weighted: true, sets: 3, repLow: 4, repHigh: 6, unit: "Wdh", cue: "Rücken absolut gerade, Stange nah am Körper, aus den Beinen ziehen.", backCaution: true,
    steps: ["Mittelfuß unter der Stange, Schienbein nah dran.", "Brust raus, Rücken neutral, Stange greifen.", "Boden wegdrücken, Stange eng hochziehen, oben Hüfte strecken."], back: "Kompromisslos gerader Rücken. Bei Rückenreizung weglassen.", easier: "Leichter oder aus erhöhter Position (Rack Pull)." },
  { id: "rdl_bar", name: "Rumänisches Kreuzheben (Langhantel)", pattern: "hinge", tag: "Beinrückseite", req: ["bar"], weighted: true, sets: 3, repLow: 6, repHigh: 10, unit: "Wdh", cue: "Hüfte weit zurück, Stange nah, Rücken gerade.", backCaution: true,
    steps: ["Stange vor den Oberschenkeln, Knie leicht gebeugt.", "Hüfte nach hinten schieben, Stange am Bein entlang.", "Bis Dehnung der Beinrückseite, dann Hüfte nach vorne."], back: "Rücken gerade, nicht rund. Bei Reizung weglassen.", easier: "Kurzhanteln, geringere Tiefe." },
  // HPUSH
  { id: "floorpress", name: "Kurzhantel Floor Press", pattern: "hpush", tag: "Brust", req: ["dumbbell"], weighted: true, sets: 3, repLow: 8, repHigh: 12, unit: "Wdh", cue: "Rücken flach am Boden, Oberarme tippen auf, kein Hohlkreuz.",
    steps: ["Rücken flach, Knie gebeugt, Füße auf.", "Hanteln über der Brust.", "Absenken bis Oberarme aufsetzen, dann hoch."], back: "Unterer Rücken am Boden, kein Hohlkreuz.", easier: "Leichter, langsamer absenken." },
  { id: "pushup", name: "Liegestütze", pattern: "hpush", tag: "Brust", req: ["none"], weighted: false, sets: 3, repLow: 8, repHigh: 15, unit: "Wdh", cue: "Körper als Brett, Core fest.",
    steps: ["Hände schulterbreit, Körper gerade.", "Absenken bis Brust knapp über Boden.", "Hochdrücken."], back: "Po anspannen, Hüfte nicht durchhängen.", easier: "Knie absetzen oder Hände erhöht." },
  { id: "dips", name: "Ring-Dips / Liegestütz", pattern: "hpush", tag: "Brust", req: ["rings"], weighted: false, sets: 3, repLow: 8, repHigh: 12, unit: "Wdh", cue: "Schulterblätter stabil, Core fest.",
    steps: ["An den Ringen abstützen.", "Absenken bis Schulter auf Ellbogenhöhe.", "Hochdrücken."], back: "Körper als Einheit, Schultern weg von den Ohren.", easier: "Liegestütz statt Dips." },
  { id: "bench_bar", name: "Langhantel-Bankdrücken", pattern: "hpush", tag: "Brust", req: ["bar", "bench"], weighted: true, sets: 3, repLow: 5, repHigh: 8, unit: "Wdh", cue: "Schulterblätter zusammen, Füße fest, Stange zur unteren Brust.",
    steps: ["Flach auf die Bank, Schulterblätter zusammenziehen.", "Stange aus der Ablage, über der Brust halten.", "Kontrolliert zur unteren Brust senken, dann hochdrücken."], back: "Leichte natürliche Rückenspannung, Po bleibt auf der Bank.", easier: "Kurzhanteln oder weniger Gewicht." },
  { id: "bench_incline", name: "Schrägbankdrücken (Langhantel)", pattern: "hpush", tag: "Obere Brust", req: ["bar", "bench"], weighted: true, sets: 3, repLow: 6, repHigh: 10, unit: "Wdh", cue: "Bank ~30°, Stange zur oberen Brust.",
    steps: ["Bank auf etwa 30° stellen.", "Schulterblätter zusammen, Stange über der oberen Brust.", "Zur oberen Brust senken, dann hochdrücken."], back: "Fest angelehnt, kein Abheben aus der Bank.", easier: "Kurzhanteln, weniger Neigung." },
  { id: "bench_db", name: "Kurzhantel-Bankdrücken", pattern: "hpush", tag: "Brust", req: ["dumbbell", "bench"], weighted: true, sets: 3, repLow: 8, repHigh: 12, unit: "Wdh", cue: "Auf der Bank, Hanteln über der Brust, tiefe Dehnung.",
    steps: ["Flach auf die Bank, Hanteln über der Brust.", "Kontrolliert bis auf Brusthöhe senken.", "Hochdrücken, oben nicht anschlagen."], back: "Schulterblätter stabil, Po auf der Bank.", easier: "Leichter oder Floor Press am Boden." },
  // VPUSH
  { id: "ohp_seat", name: "Schulterdrücken, sitzend", pattern: "vpush", tag: "Schultern", req: ["dumbbell"], weighted: true, sets: 3, repLow: 8, repHigh: 12, unit: "Wdh", cue: "Aufrecht sitzen, Bauch fest, kein Hohlkreuz.",
    steps: ["Aufrecht sitzen, Hanteln auf Schulterhöhe.", "Hoch drücken bis fast gestreckt.", "Kontrolliert absenken."], back: "Bauch fest, nicht ins Hohlkreuz drücken.", easier: "Ein Arm abwechselnd, leichter." },
  { id: "ohp_stand", name: "Schulterdrücken, stehend", pattern: "vpush", tag: "Schultern", req: ["dumbbell"], weighted: true, sets: 3, repLow: 8, repHigh: 12, unit: "Wdh", cue: "Po und Bauch fest, kein Ausweichen ins Kreuz.",
    steps: ["Stand hüftbreit, Hanteln auf Schulterhöhe.", "Hoch drücken, Rumpf fest.", "Kontrolliert absenken."], back: "Rippen unten, kein Hohlkreuz.", easier: "Sitzend ausführen." },
  { id: "pike_pushup", name: "Pike Liegestütz", pattern: "vpush", tag: "Schultern", req: ["none"], weighted: false, sets: 3, repLow: 6, repHigh: 12, unit: "Wdh", cue: "Hüfte hoch, Kopf Richtung Boden.",
    steps: ["Umgekehrtes V, Hüfte hoch.", "Kopf Richtung Boden absenken.", "Hochdrücken."], back: "Rücken gerade, kontrolliert.", easier: "Hände erhöht." },
  { id: "ohp_bar", name: "Langhantel-Schulterdrücken", pattern: "vpush", tag: "Schultern", req: ["bar"], weighted: true, sets: 3, repLow: 5, repHigh: 8, unit: "Wdh", cue: "Stange auf den vorderen Schultern, Po und Bauch fest, gerade nach oben.",
    steps: ["Stange auf den vorderen Schultern, schulterbreit greifen.", "Bauch und Po fest, Stange gerade über den Kopf drücken.", "Kopf leicht durchschieben, kontrolliert absenken."], back: "Kein Hohlkreuz — Rippen unten, Rumpf hart.", easier: "Sitzend mit Kurzhanteln." },
  // HPULL
  { id: "row1", name: "Einarmiges Rudern, abgestützt", pattern: "hpull", tag: "Rücken", req: ["dumbbell"], weighted: true, sets: 3, repLow: 10, repHigh: 12, unit: "Wdh", cue: "Eine Hand abstützen, Rücken gerade. Pro Arm.",
    steps: ["Eine Hand auf Box/Stuhl, Rücken parallel zum Boden.", "Hantel eng zur Hüfte ziehen.", "Kontrolliert absenken. Seite wechseln."], back: "Grüne Linie absolut gerade, nicht rund.", easier: "Höher abstützen, leichter." },
  { id: "ringrow", name: "Ring-Rudern (Inverted Row)", pattern: "hpull", tag: "Rücken", req: ["rings"], weighted: false, sets: 3, repLow: 10, repHigh: 12, unit: "Wdh", cue: "Körper gerade wie ein Brett, Schulterblätter zusammen.",
    steps: ["Unter die Ringe, gestreckt aufhängen, Fersen am Boden.", "Brust zu den Ringen ziehen.", "Kontrolliert ablassen."], back: "Körper bleibt ein gerades Brett.", easier: "Aufrechter stellen." },
  { id: "band_row", name: "Rudern mit Band", pattern: "hpull", tag: "Rücken", req: ["bands"], weighted: false, sets: 3, repLow: 12, repHigh: 15, unit: "Wdh", cue: "Band fixieren, eng zum Bauch ziehen.",
    steps: ["Band auf Brusthöhe fixieren.", "Mit geradem Rücken zum Bauch ziehen, Ellbogen eng.", "Kontrolliert zurück."], back: "Aufrecht, nicht aus dem Rücken reißen.", easier: "Weniger Bandspannung." },
  { id: "row_bar", name: "Langhantelrudern", pattern: "hpull", tag: "Rücken", req: ["bar"], weighted: true, sets: 3, repLow: 6, repHigh: 10, unit: "Wdh", cue: "Oberkörper vorgebeugt, Rücken gerade, zur unteren Brust ziehen.", backCaution: true,
    steps: ["Hüfte zurück, Oberkörper etwa 45° vorgebeugt, Rücken neutral.", "Stange zum Bauch/zur unteren Brust ziehen, Ellbogen eng.", "Kontrolliert ablassen, Rücken bleibt fest."], back: "Vorgebeugte Position — Rücken bewusst gerade halten. Bei Reizung Einarm-Rudern abgestützt.", easier: "Leichter oder Einarmrudern abgestützt." },
  // VPULL
  { id: "pullup", name: "Klimmzüge", pattern: "vpull", tag: "Rücken", req: ["pullup"], weighted: false, sets: 3, repLow: 6, repHigh: 10, unit: "Wdh", cue: "Schulterblätter runter, sauber hoch. Band als Hilfe.",
    steps: ["Etwas weiter als schulterbreit greifen.", "Hochziehen bis Kinn über die Stange.", "Kontrolliert ablassen."], back: "Hängen entlastet die Wirbelsäule, nicht pendeln.", easier: "Negativ oder mit Band." },
  { id: "chinup", name: "Chin-ups (Untergriff)", pattern: "vpull", tag: "Rücken & Bizeps", req: ["pullup"], weighted: false, sets: 3, repLow: 6, repHigh: 10, unit: "Wdh", cue: "Untergriff schulterbreit, sauber hoch.",
    steps: ["Untergriff, schulterbreit.", "Hochziehen bis Kinn über die Stange.", "Kontrolliert ablassen."], back: "Nicht ins Hohlkreuz schwingen.", easier: "Negativ oder mit Band." },
  { id: "band_pulldown", name: "Latzug mit Band", pattern: "vpull", tag: "Rücken", req: ["bands"], weighted: false, sets: 3, repLow: 12, repHigh: 15, unit: "Wdh", cue: "Band hoch fixieren, zur Brust ziehen.",
    steps: ["Band über Kopf fixieren.", "Ellbogen nach unten-außen zur Brust ziehen.", "Kontrolliert zurück."], back: "Aufrecht, Rumpf stabil.", easier: "Weniger Spannung." },
  // ARM
  { id: "curl", name: "Bizeps Curls", pattern: "arm", tag: "Bizeps", req: ["weight"], weighted: true, sets: 3, repLow: 10, repHigh: 12, unit: "Wdh", cue: "Ellbogen fix, kein Schwung aus dem Rücken.",
    steps: ["Aufrecht, Hanteln seitlich.", "Unterarme hochcurlen, Ellbogen fix.", "Langsam ablassen."], back: "Kein Schwung aus Rücken/Hüfte.", easier: "Im Sitzen." },
  { id: "hammer_curl", name: "Hammer Curls", pattern: "arm", tag: "Bizeps", req: ["dumbbell"], weighted: true, sets: 3, repLow: 10, repHigh: 12, unit: "Wdh", cue: "Neutralgriff, Ellbogen fix.",
    steps: ["Hanteln im Hammergriff seitlich.", "Hochcurlen ohne Schwung.", "Langsam ablassen."], back: "Fester Stand, ruhige Mitte.", easier: "Im Sitzen, leichter." },
  { id: "tri_oh", name: "Trizeps über Kopf (KH)", pattern: "arm", tag: "Trizeps", req: ["dumbbell"], weighted: true, sets: 3, repLow: 10, repHigh: 15, unit: "Wdh", cue: "Ellbogen eng, nur Unterarm bewegt.",
    steps: ["Eine Hantel über dem Kopf, beide Hände.", "Hinter den Kopf absenken, Ellbogen eng.", "Wieder strecken."], back: "Rippen unten, kein Hohlkreuz.", easier: "Leichter, sitzend." },
  // LATERAL
  { id: "lateral", name: "Seitheben", pattern: "lateral", tag: "Schultern", req: ["dumbbell"], weighted: true, sets: 3, repLow: 12, repHigh: 15, unit: "Wdh", cue: "Leicht und sauber, Ellbogen führen, kein Schwung.",
    steps: ["Aufrecht, leichte Hanteln seitlich.", "Arme bis Schulterhöhe heben.", "Langsam ablassen."], back: "Kein Schwung, fester Stand.", easier: "Im Sitzen, sehr leicht." },
  { id: "face_pull", name: "Face Pull (Band)", pattern: "lateral", tag: "Hintere Schulter", req: ["bands"], weighted: false, sets: 3, repLow: 15, repHigh: 20, unit: "Wdh", cue: "Band zum Gesicht ziehen, Schultern öffnen.",
    steps: ["Band auf Kopfhöhe fixieren.", "Zum Gesicht ziehen, Ellbogen hoch.", "Kontrolliert zurück."], back: "Aufrecht, Rumpf stabil.", easier: "Weniger Spannung." },
  // CORE / Rücken-Stabis
  { id: "plank", name: "Unterarmstütz (Plank)", pattern: "core", tag: "Core", req: ["none"], weighted: false, sets: 3, repLow: 30, repHigh: 45, unit: "Sek", cue: "Gerade Linie, Bauch und Po fest.",
    steps: ["Unterarme unter den Schultern.", "Körper gerade von Kopf bis Ferse.", "Halten, ruhig atmen."], back: "Bauch und Po fest, Hüfte nicht durchhängen.", easier: "Auf den Knien." },
  { id: "sideplank", name: "Side Plank", pattern: "core", tag: "Rücken-Stabi", req: ["none"], weighted: false, sets: 3, repLow: 20, repHigh: 40, unit: "Sek", cue: "Gerade Linie, Hüfte oben. Pro Seite.", backStabilizer: true,
    steps: ["Auf eine Seite, Unterarm unter der Schulter.", "Hüfte hoch, Körper gerade.", "Halten, Seite wechseln."], back: "Seitliche Rumpfstabilität, gerade Linie.", easier: "Knie ablegen." },
  { id: "pallof", name: "Pallof Press (Band)", pattern: "core", tag: "Rücken-Stabi", req: ["bands"], weighted: false, sets: 3, repLow: 10, repHigh: 12, unit: "Wdh", cue: "Arme rausdrücken, gegen Rotation stabil. Pro Seite.", backStabilizer: true,
    steps: ["Seitlich zum fixierten Band, Band vor der Brust.", "Arme gerade nach vorne drücken.", "Halten, zurück. Seite wechseln."], back: "Rumpf gegen die Verdrehung stabil. Schützt den unteren Rücken.", easier: "Weniger Spannung, näher zum Anker." },
  { id: "birddog", name: "Bird Dog", pattern: "core", tag: "Rücken-Stabi", req: ["none"], weighted: false, sets: 3, repLow: 8, repHigh: 12, unit: "Wdh", cue: "Gegenüberliegende Hand und Bein strecken, Rumpf ruhig.", backStabilizer: true,
    steps: ["Vierfüßlerstand, Rücken neutral.", "Rechten Arm und linkes Bein strecken.", "Kurz halten, wechseln."], back: "Becken stabil, kein Durchhängen. Top für den unteren Rücken.", easier: "Nur Bein oder nur Arm." },
  { id: "deadbug", name: "Dead Bug", pattern: "core", tag: "Rücken-Stabi", req: ["none"], weighted: false, sets: 3, repLow: 8, repHigh: 12, unit: "Wdh", cue: "Unterer Rücken bleibt am Boden.", backStabilizer: true,
    steps: ["Auf dem Rücken, Arme und Beine in die Luft.", "Gegenüberliegenden Arm und Bein absenken.", "Zurück, Seite wechseln."], back: "Lende gegen den Boden gedrückt halten.", easier: "Nur Beine bewegen." },
  { id: "gb_march", name: "Glute Bridge March", pattern: "core", tag: "Rücken-Stabi", req: ["none"], weighted: false, sets: 3, repLow: 10, repHigh: 16, unit: "Wdh", cue: "Hüfte oben halten, abwechselnd Knie heben.", backStabilizer: true,
    steps: ["In die Brücke, Hüfte hoch.", "Ein Knie zur Brust heben, Becken stabil.", "Wechseln, Hüfte bleibt oben."], back: "Becken nicht kippen, Po fest.", easier: "Ohne Marsch, nur Brücke halten." },
  { id: "suitcase", name: "Koffertragen (Suitcase Carry)", pattern: "core", tag: "Rücken-Stabi", req: ["weight"], weighted: false, sets: 3, repLow: 20, repHigh: 40, unit: "Sek", cue: "Schwere Hantel einseitig, aufrecht gehen.", backStabilizer: true,
    steps: ["Eine schwere Hantel in einer Hand.", "Aufrecht gehen, nicht zur Seite kippen.", "Zeit pro Seite."], back: "Rumpf gegen das seitliche Ziehen stabil halten.", easier: "Leichter, kürzere Zeit." },
  // CARDIO (Peloton / Bike) — geplant; die Ist-Aufzeichnung kommt aus Strava.
  { id: "bike_zone2", name: "Peloton · Zone 2", pattern: "cardio", tag: "Cardio", req: ["bike"], weighted: false, sets: 1, repLow: 20, repHigh: 30, unit: "Min", cue: "Locker im Grundlagenbereich — du kannst dabei noch reden (Zone 2).",
    steps: ["Niedriger bis mittlerer Widerstand.", "Gleichmäßig treten, ~85–95 rpm.", "20–30 Min ruhig durchfahren."], back: "Aufrecht sitzen, Schultern locker.", easier: "Kürzer fahren, weniger Widerstand." },
  { id: "bike_intervals", name: "Peloton · Intervalle", pattern: "cardio", tag: "Cardio", req: ["bike"], weighted: false, sets: 1, repLow: 18, repHigh: 22, unit: "Min", cue: "Nach dem Einrollen 5×(1 Min hart / 1 Min locker), dann ausrollen.",
    steps: ["3 Min locker einrollen.", "5 Runden: 1 Min hart (hoch atmen), 1 Min locker.", "3 Min ausrollen."], back: "Im Sitzen fahren, Rumpf ruhig.", easier: "4 Runden statt 5, kürzere harte Phasen." },
  { id: "bike_finisher", name: "Peloton · Sprint-Finisher", pattern: "cardio", tag: "Cardio", req: ["bike"], weighted: false, sets: 1, repLow: 6, repHigh: 10, unit: "Min", cue: "Kurzer, knackiger Abschluss: 5×(20 s All-out / 40 s locker).",
    steps: ["1–2 Min locker antreten.", "5 Runden: 20 s Vollgas, 40 s locker.", "1 Min ausrollen."], back: "Sauber sitzen, nicht verkrampfen.", easier: "3 Runden, kürzere Sprints." },
  { id: "bike_recovery", name: "Peloton · Recovery Spin", pattern: "cardio", tag: "Cardio", req: ["bike"], weighted: false, sets: 1, repLow: 10, repHigh: 15, unit: "Min", cue: "Ganz locker drehen — fördert die Erholung, kein Ehrgeiz.",
    steps: ["Sehr niedriger Widerstand.", "Locker kurbeln, ruhig atmen.", "10–15 Min."], back: "Entspannt aufrecht.", easier: "Kürzer." },
];

export const TEMPLATE: Template[] = [
  { key: "A", name: "Ganzkörper A", focus: "Beine & Druck", slots: ["squat", "hpush", "hinge", "vpush", "core"] },
  { key: "B", name: "Ganzkörper B", focus: "Beine & Zug", slots: ["lunge", "vpull", "hpull", "arm", "core"] },
  { key: "C", name: "Ganzkörper C", focus: "Mix & Stabilität", slots: ["squat", "hpush", "hpull", "lateral", "core"] },
];

/** Optionaler Peloton/Cardio-Tag — startbar, aber NICHT in der A/B/C-Auto-Rotation. */
export const CARDIO_DAY: Template = {
  key: "peloton",
  name: "Peloton",
  focus: "Cardio",
  slots: ["cardio", "cardio"],
};

/** „Die Prüfung" — ATLAS-Testtag: nur die Kernmuster, Rampe zum schweren Satz. */
export const EXAM_DAY: Template = {
  key: "exam",
  name: "Die Prüfung",
  focus: "Maximalkraft",
  slots: ["squat", "hinge", "hpush", "vpull"],
};

export const EQUIP_LIST: EquipItem[] = [
  { key: "db", label: "Kurzhanteln" }, { key: "kb", label: "Kettlebell" }, { key: "bar", label: "Langhantel" },
  { key: "pullup", label: "Klimmzugstange" }, { key: "rings", label: "Turnringe" }, { key: "bands", label: "Bänder" },
  { key: "box", label: "Erhöhung / Box" }, { key: "bench", label: "Hantelbank" },
  { key: "bike", label: "Peloton / Bike" },
];

export const DEFAULT_EQUIP: EquipKey[] = ["db", "kb", "bar", "pullup", "rings", "bands", "box", "bench", "bike"];

export const PATTERN_LABEL: Record<Pattern, string> = {
  squat: "Kniebeuge", lunge: "Ausfallschritt/Bein", hinge: "Hüfte/Gesäß", hpush: "Druck horizontal", vpush: "Druck über Kopf", hpull: "Zug horizontal", vpull: "Zug vertikal", arm: "Arme", lateral: "Schultern", core: "Core / Rücken-Stabi", cardio: "Cardio / Bike",
};

export const PROFILE: [string, string][] = [
  ["Ziel", "Muskelaufbau"],
  ["Frequenz", "3× pro Woche"],
  ["Dauer", "20–30 Min / Einheit"],
  ["Körper", "1,93 m · 90 kg"],
  ["Achtung", "Unterer Rücken schonen"],
];
