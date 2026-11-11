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
und schneidet alle auf denselben 3:2-Ausschnitt. Zeichnet ChatGPT Box, Wand
oder Pfosten gegenüber der Bodenlinie versetzt, oder unterbricht ein Fuß die
Linie, richtet `--anker x0,y0,x1,y1` stattdessen an diesem feststehenden Teil
aus (Rechteck in Pixeln von Feld 1, nur Feststehendes darin):

```bash
python3 scripts/bewegungsbild.py --anker 160,330,230,428 Z16_Kniebeuge_zur_Box.png box_squat
``` Mit `--zwiebel probe.png`
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
| Z12 | `squat_bw` | Kniebeuge (Körpergewicht) |
| Z13 | `squat_bar` | Langhantel-Kniebeuge |
| Z14 | `front_squat` | Frontkniebeuge (Langhantel) |
| Z15 | `squat_db` | Kurzhantel-Kniebeuge |
| Z16 | `box_squat` | Kniebeuge zur Box (Anker: Box) |
| Z18 | `bss` | Bulgarian Split Squat |
| Z20 | `stepup` | Step-ups |
| Z21 | `split_squat` | Split Squat (statisch) |
| Z24 | `pistol_box` | Einbeinige Kniebeuge zur Box (Anker: Box) |
| Z25 | `glutebridge` | Glute Bridge mit Gewicht |
| Z26 | `hip_thrust` | Hip Thrust |
| Z27 | `deadlift` | Kreuzheben (Langhantel) |
| Z28 | `rdl_bar` | Rumänisches Kreuzheben (Langhantel) |
| Z29 | `kb_swing` | Kettlebell Swing |
| Z30 | `good_morning` | Good Morning (Langhantel) |
| Z31 | `rdl_single` | Einbeiniges Kreuzheben (KH) |
| Z32 | `sumo_deadlift` | Sumo-Kreuzheben |
| Z33 | `calf_raise_db` | Wadenheben mit Kurzhantel (Anker: Pfosten) |
| Z34 | `calf_single` | Einbeiniges Wadenheben (Anker: Pfosten) |
| Z35 | `floorpress` | Kurzhantel Floor Press |
| Z36 | `pushup` | Liegestütze |
| Z37 | `dips` | Dips an den Ringen |
| Z38 | `bench_bar` | Langhantel-Bankdrücken |
| Z39 | `bench_incline` | Schrägbankdrücken mit Langhantel |
| Z40 | `incline_db` | Schrägbankdrücken mit Kurzhanteln |
| Z41 | `db_fly` | Fliegende mit Kurzhanteln |
| Z42 | `pushup_deficit` | Liegestütze mit tiefem Dehnweg |
| Z43 | `ohp_seat` | Schulterdrücken sitzend mit Kurzhanteln |
| Z44 | `pike_pushup` | Pike-Liegestütz |
| Z45 | `ohp_bar` | Langhantel-Schulterdrücken, stehend |
| Z46 | `arnold_press` | Arnold Press, Frontansicht |
| Z47 | `push_press` | Push Press mit Langhantel |
| Z48 | `ohp_kb` | Einarmiges Kettlebell-Drücken, Frontansicht |
| Z49 | `row1` | Einarmiges Rudern, abgestützt |
| Z50 | `ringrow` | Ring-Rudern |
| Z51 | `band_row` | Rudern mit Band |
| Z52 | `row_bar` | Langhantelrudern (Anker: Füße) |
| Z53 | `chest_row_db` | Brustgestütztes Kurzhantelrudern |
| Z54 | `kb_row` | Kettlebell-Rudern |
| Z55 | `renegade_row` | Renegade Row |
| Z56 | `shrug_db` | Schulterheben mit Kurzhanteln, Frontansicht |
| Z57 | `chinup` | Chin-ups im Untergriff, Frontansicht |
| Z58 | `band_pulldown` | Latzug mit Band, Frontansicht |
| Z61 | `pullover_db` | Überzüge mit Kurzhantel |
| Z62 | `hammer_curl` | Hammer Curls |
| Z63 | `tri_oh` | Trizeps über Kopf mit Kurzhantel |
| Z64 | `incline_curl` | Schrägbank-Curls |
| Z65 | `concentration_curl` | Konzentrations-Curls, Frontansicht |
| Z66 | `curl_bar` | Langhantel-Curls |
| Z67 | `skull_crusher` | French Press liegend mit Kurzhanteln |
| Z68 | `diamond_pushup` | Enge Liegestütze |
| Z69 | `bench_dips` | Dips an der Bank |
| Z70 | `wrist_curl` | Handgelenk-Curls |
| Z72 | `face_pull` | Face Pull mit Band |
| Z73 | `band_lateral` | Seitheben mit Band, Frontansicht |
| Z74 | `reverse_fly_db` | Reverse Flys vorgebeugt, Frontansicht |
| Z75 | `front_raise` | Frontheben |
| Z76 | `upright_row` | Aufrechtes Rudern, Frontansicht |
| Z77 | `rear_delt_row` | Rudern für die hintere Schulter, Frontansicht |
| Z78 | `plank` | Unterarmstütz |
| Z79 | `sideplank` | Seitstütz, Frontansicht |
| Z80 | `suitcase` | Koffertragen |
| Z81 | `hollow_hold` | Hollow Hold |
| Z82 | `hanging_knee_raise` | Hängendes Knieheben |
| Z83 | `db_chop` | Holzfäller mit Kurzhantel, Frontansicht |
| Z84 | `around_world` | Around the World, Frontansicht, im Kreis |
| Z86 | `reverse_crunch` | Reverse Crunch |
| Z87 | `russian_twist` | Russian Twist, Frontansicht |
| Z89 | `superman` | Rückenschwimmer (Superman) |
| Z90 | `farmer_carry` | Farmer's Walk |
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

Damit sind alle Motive der Blöcke S und A eingebaut: alle 22 Studio-Übungen
und alle 24 Aufwärmübungen haben ein Bild. Im freien Bereich (Kurzhantel,
Langhantel, Kettlebell, Band, Ringe, Box, Bank, Körpergewicht) sind es 84 von
93; Bird Dog und Dead Bug aus dem Katalog nutzen dabei die Bilder der
gleichnamigen Aufwärmübungen (`GLEICH_WIE` in `lib/bewegung.ts`). Prompts in
`docs/bewegungsbilder-prompt-zuhause.md`.

Noch offen (Nachlieferung, Prompt im selben Dokument): Z17 Wandsitz, Z19
Ausfallschritt rückwärts, Z22 seitlicher Ausfallschritt, Z23 Cossack Squat
(Füße rutschen), Z59 Negativ-Klimmzüge (Füße unter der Bodenlinie), Z60
Schulterblatt-Klimmzüge (keine sichtbare Bewegung), Z71 Reverse Curls
(Langhantel statt Kurzhanteln), Z85 Scheibenwischer (Phasen springen), Z88
Mountain Climbers (kein Beinwechsel). Kleine Restfehler, beim
Abspielen kaum sichtbar: S5 rundet unten den Rücken (Abrollen statt neutraler
Rücken), bei S18 setzt das Kabel am Ende der Stange an statt in der Mitte, bei
S21 endet in Phase 3 ein Seilende an der Schulter statt in der Hand.
