# Bewegungsbilder

Je Übung bzw. Aufwärmübung eine Datei mit vier Phasen nebeneinander: Start,
zwei Zwischenschritte, Umkehrpunkt. Die App spielt sie hart in der Folge
1-2-3-4-3-2 ab (`components/bewegung/BewegungsBild.tsx`, CSS `.bewegung` in
`app/globals.css`). Übungen ohne Bild zeigen weiter die Phasenfigur.

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
| S7 | `pec_deck` | Butterfly (Maschine) |
| S8 | `reverse_fly_machine` | Reverse Butterfly (Maschine) |
| S12 | `pull_through` | Pull-Through am Kabel |
| S16 | `straight_arm_pulldown` | Überzüge am Kabel |
| A3 | `march_high` | Marschieren, Knie hoch |
| A4 | `cat_cow` | Katze-Kuh |
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

Noch offen: S1 bis S6, S9 bis S11, S13 bis S15, S17 bis S22; A1, A2, A5 bis A17.
