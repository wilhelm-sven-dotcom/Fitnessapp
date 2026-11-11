# Momentbilder

Bilder für besondere Momente und leere Seiten, aus dem ChatGPT-Prompt
(Block M). Adressen über `momentUrl()` in `lib/momente.ts`.

| Datei | Prompt | Wo |
|-------|--------|----|
| `begruessung.webp` | M1 | Begrüßung beim ersten Start |
| `rekord.webp` | M2 | PR-Karte nach dem Speichern |
| `gespeichert.webp` | M3 | Abschluss ohne Rekord |
| `verlauf-leer.webp` | M4 | Fortschritt → Verlauf, noch nichts |
| `uebersicht-leer.webp` | M5 | Fortschritt → Übersicht, noch nichts |
| `koerper-leer.webp` | M6 | Fortschritt → Körper, noch nichts |
| `nichts-gefunden.webp` | M7 | Katalog, Suche ohne Treffer |
| `atlas-aus.webp` | M8 | ATLAS ohne Schlüssel auf dem Server |
| `ort-zuhause.webp` | M9 | Ortsfrage: Orte ohne Maschinen |
| `ort-studio.webp` | M10 | Ortsfrage: Orte mit Maschinen oder Kabelzug |

Querformate (M1, M9, M10): 1200 × 800 und `-klein` 600 × 400. Sticker (M2
bis M8): 512 × 512 mit durchsichtigem Grund und weißer Außenkante, damit sie
auf hellem und dunklem Grund stehen. Ein ersetztes Bild braucht
`MOMENTE_STAND` + 1 in `lib/momente.ts`.
