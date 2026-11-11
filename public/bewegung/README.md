# Bewegungsbilder

Je Übung bzw. Aufwärmübung eine Datei mit vier Phasen nebeneinander: Start,
zwei Zwischenschritte, Umkehrpunkt. Die App spielt sie hart in der Folge
1-2-3-4-3-2 ab (`components/bewegung/BewegungsBild.tsx`, CSS `.bewegung` in
`app/globals.css`). Kreisbewegungen (Kurbel, Hüfte, Arme) laufen 1-2-3-4 durch,
sonst liefe die Kurbel rückwärts; sie stehen in `IM_KREIS` (`lib/bewegung.ts`).
Übungen ohne Bild zeigen weiter die Phasenfigur.

## Dateien

- `<id>.webp`: vier Phasen je 720 × 480 (Übungsdetail, Aufwärmen)
- `<id>-klein.webp`: vier Phasen je 360 × 240 (Kachel auf der Trainingskarte)
- `<id>` = Übungs-Id aus `lib/exercises.ts` bzw. Drill-Id aus `lib/warmup.ts`

## Neues Bild

ChatGPT liefert ein 2 × 2-Raster (Prompt-Blöcke S, A und Z, 1536 × 1024).
Daraus macht das Skript beide Dateien:

```bash
python3 scripts/bewegungsbild.py S01_Beinpresse.png leg_press
```

Es schneidet die Felder an den weißen Stegen, richtet sie an der Bodenlinie
von Feld 1 aus (ChatGPT versetzt die Felder um einige Pixel, bei Z02 um 15 px)
und schneidet alle auf denselben 3:2-Ausschnitt. Mit `--zwiebel probe.png`
legt es alle vier Phasen übereinander ab: was doppelt erscheint, ist
verrutscht und springt beim Abspielen.

Danach die Id in `MIT_BEWEGUNG` (`lib/bewegung.ts`) eintragen; der Test
`tests/bilder.test.ts` prüft, dass Datei und Eintrag zusammenpassen. Ein
ersetztes Bild braucht `BEWEGUNG_STAND` + 1, sonst behält der Service Worker
die alte Datei.

## Stand (Nov 2026)

| Prompt | Id | Übung |
|--------|----|-------|
| Z1 | `goblet` | Goblet Squat |
| Z2 | `walking_lunge` | Gehende Ausfallschritte |
| Z3 | `rdl_db` | Rumänisches KH-Kreuzheben |
| Z4 | `bench_db` | Kurzhantel-Bankdrücken |
| Z5 | `ohp_stand` | Schulterdrücken, stehend |
| Z7 | `pullup` | Klimmzüge |
| Z8 | `curl` | Bizeps Curls |
| Z9 | `lateral` | Seitheben |
| Z10 | `crunch` | Crunches |
| Z11 | `calf_raise_bw` | Wadenheben (Körpergewicht) |
| S1 | `leg_press` | Beinpresse |
| S2 | `hack_squat` | Hack Squat (Maschine) |
| S3 | `leg_extension` | Beinstrecker (Maschine) |
| S4 | `leg_curl` | Beinbeuger (Maschine) |
| S5 | `back_ext` | Rückenstrecker (Maschine/Bank) |
| S6 | `chest_press_machine` | Brustpresse (Maschine) |
| S7 | `pec_deck` | Butterfly (Maschine) |
| S8 | `reverse_fly_machine` | Reverse Butterfly (Maschine) |
| S9 | `shoulder_press_machine` | Schulterpresse (Maschine) |
| S10 | `row_machine` | Rudermaschine |
| S11 | `calf_seated` | Wadenheben sitzend (Maschine) |
| S12 | `pull_through` | Pull-Through am Kabel |
| S13 | `cable_fly` | Fliegende am Kabel |
| S14 | `cable_row` | Rudern am Kabel, sitzend |
| S15 | `lat_pulldown` | Latzug am Kabel |
| S16 | `straight_arm_pulldown` | Überzüge am Kabel |
| S17 | `cable_curl` | Bizeps am Kabel |
| S18 | `pushdown` | Trizepsdrücken am Kabel |
| S19 | `tri_cable_oh` | Trizeps über Kopf am Kabel |
| S20 | `cable_lateral` | Seitheben am Kabel |
| S21 | `face_pull_cable` | Face Pull am Kabel |
| S22 | `cable_chop` | Holzfäller am Kabel |
| A1 | `bike_easy` | Locker einrollen (Bike), im Kreis |
| A2 | `jumping_jacks` | Hampelmänner |
| A3 | `march_high` | Marschieren, Knie hoch |
| A4 | `cat_cow` | Katze-Kuh |
| A5 | `hip_circles` | Hüftkreisen, im Kreis |
| A6 | `ankle_rocks` | Sprunggelenk mobilisieren |
| A7 | `thoracic_open` | Brustwirbelsäule öffnen |
| A8 | `shoulder_circles` | Schulterkreisen, im Kreis |
| A9 | `worlds_greatest` | Weltbester Stretch |
| A10 | `squat_pry` | Tiefe Kniebeuge, federn |
| A11 | `leg_swings` | Beinpendel |
| A12 | `hip_flexor_dyn` | Hüftbeuger dynamisch |
| A13 | `arm_crossswings` | Armschwünge über Kreuz |
| A14 | `glute_bridge` | Glute Bridge |
| A15 | `gb_march` | Glute-Bridge-March (auch die Übung) |
| A16 | `bird_dog` | Bird Dog |
| A17 | `dead_bug` | Dead Bug |
| A18 | `side_plank_dip` | Seitstütz mit Absenken |
| A19 | `scap_pushup` | Schulterblatt-Liegestütz |
| A20 | `band_pullapart` | Band auseinanderziehen |
| A21 | `wall_slides` | Überkopf-Slides |
| A22 | `side_steps` | Seitwärtsgänge mit Miniband |
| A23 | `pogo_calf` | Waden-Federn |
| A24 | `pallof` | Anti-Rotations-Press (auch die Übung Pallof Press) |

Geliefert, aber nicht eingebaut: Z6 (Kurzhantelrudern vorgebeugt, beidarmig).
Der Katalog hat diese Übung nicht; einarmiges und brustgestütztes Rudern
sehen anders aus.

Damit sind alle Motive der Blöcke S und A eingebaut. Kleine Restfehler, beim
Abspielen kaum sichtbar: S5 rundet unten den Rücken (Abrollen statt neutraler
Rücken), bei S18 setzt das Kabel am Ende der Stange an statt in der Mitte, bei
S21 endet in Phase 3 ein Seilende an der Schulter statt in der Hand.
