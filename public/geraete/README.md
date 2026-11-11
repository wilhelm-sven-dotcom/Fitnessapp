# Gerätebilder (mitgeliefert)

Standardbild je Studiogerät. `GeraetBild` zeigt in dieser Reihenfolge: das
eigene Foto aus dem Studio (IndexedDB), dann das Bild aus diesem Ordner, dann
die gezeichnete Fassung aus `components/geraete/GeraetZeichnung.tsx`.

## Konvention

- Dateiname = Gerät-Key aus `components/geraete/GeraetZeichnung.tsx`
  (`m_beinpresse`, …, `cable`), je Gerät zwei Dateien:
  - `<key>.webp`, 1200 × 800 (Übungsdetail),
  - `<key>-klein.webp`, 360 × 240 (Heute, Katalog, Trainingskarte).
- Format 3:2, WebP, heller Grund. Die Boxen in der App haben dasselbe
  Seitenverhältnis (`aspect-bild`), damit nichts abgeschnitten wird.
- Neues Bild: beide Dateien ablegen und den Key in `MIT_BILD`
  (`lib/geraete.ts`) eintragen. Sonst ist kein Code nötig.
- Bild ersetzen: `GERAET_BILD_STAND` in `lib/geraete.ts` hochzählen. Der
  Service Worker cacht Bilder dauerhaft; erst die neue URL (`?v=…`) holt die
  neue Datei.

## Verkleinern

Aus dem Original (z. B. 1536 × 1024) mit Pillow:

```python
from PIL import Image
im = Image.open("original.webp").convert("RGB")  # vorher auf 3:2 zuschneiden
im.resize((1200, 800), Image.LANCZOS).save("m_beinpresse.webp", "WEBP", quality=82, method=6)
im.resize((360, 240), Image.LANCZOS).save("m_beinpresse-klein.webp", "WEBP", quality=80, method=6)
```

## Stand

| Key | Gerät | Quelle |
|-----|-------|--------|
| `cable` | Kabelzug | ChatGPT, Prompt unten |
| `m_waden` | Wadenmaschine | ChatGPT, Prompt unten |
| `m_rudern` | Rudermaschine | ChatGPT, Prompt unten |
| `m_schulterpresse` | Schulterpresse | ChatGPT, Prompt unten |
| `m_butterfly` | Butterfly | ChatGPT, Prompt unten |
| `m_beinpresse` | 45-Grad-Beinpresse | ChatGPT (G1, Nov 2026) |
| `m_hacksquat` | Hack-Squat-Maschine | ChatGPT (G2, Nov 2026) |
| `m_beinstrecker` | Beinstrecker | ChatGPT (G3, Nov 2026) |
| `m_beinbeuger` | Liegender Beinbeuger | ChatGPT (G4, Nov 2026) |
| `m_rueckenstrecker` | Rückenstrecker 45 Grad | ChatGPT (G5, Nov 2026) |
| `m_brustpresse` | Brustpresse | ChatGPT (G6, Nov 2026) |

Alle elf Studiogeräte haben jetzt ein Bild; die Zeichnung bleibt für eigene
Geräte-Keys ohne Bild und als Rückfall.

## Prompt

Mit diesem Prompt sind die Bilder entstanden; fehlende Geräte im selben Stil
nachziehen („weiter mit dem nächsten Gerät, gleicher Stil wie Bild 1“).

```text
Erstelle mir nacheinander 11 einzelne Bilder von Fitnessgeräten aus einem Fitnessstudio. Jedes Gerät bekommt ein eigenes Bild, alle im exakt gleichen Stil. Erzeuge die Bilder direkt hintereinander ohne Rückfragen und nenne über jedem Bild kurz die Nummer und den Gerätenamen.

STIL (gilt für jedes Bild):
- Flache Vektor-Illustration, keine Fotografie, keine Verläufe, keine weichen Schatten.
- Dicke, gleichmäßige Konturlinien in fast Schwarz (#0E0F14).
- Polster und Sitzflächen in Elektroblau (#2F45FF).
- Gewichtsscheiben und Gewichtsblock in Sonnengelb (#FFD43B).
- Rahmen und Stahlteile in Weiß bzw. sehr hellem Grau.
- Hintergrund einfarbig hellgrau (#EEF0F4), nur eine dünne Bodenlinie, keine Szenerie.
- Ansicht: Seitenansicht, leicht von schräg vorn (etwa 20 Grad), damit das Gerät räumlich wirkt.
- Querformat 3:2 (1536 × 1024). Das Gerät steht mittig, füllt etwa 75 % der Bildbreite und hat gleichmäßigen Rand zu allen Seiten.
- Keine Personen, kein Text im Bild, keine Zahlen, keine Logos oder Markennamen.
- Realistischer Aufbau wie im echten Studio, aber im klaren, freundlichen Illustrationsstil.
- Alle 11 Bilder müssen zusammenpassen: gleiche Linienstärke, gleiche Farben, gleicher Bildausschnitt und gleiche Perspektive wie Bild 1.

GERÄTE:
1. 45-Grad-Beinpresse: Sitz mit schräger Rückenlehne unten links, Schlitten mit großer Fußplatte auf schräger Schiene, gelbe Hantelscheiben seitlich am Schlitten.
2. Hack-Squat-Maschine: steile Schiene, Schlitten mit Rückenpolster und zwei Schulterpolstern, Fußplatte unten, gelbe Scheiben am Scheibenhalter.
3. Beinstrecker: Sitz mit Rückenlehne, Hebelarm mit runder Schienbeinrolle vor dem Sitz, gelber Gewichtsblock mit Steckgewichten im Turm dahinter.
4. Liegender Beinbeuger: leicht geknickte Liegebank, Hebel mit Fersenrolle am Fußende, gelber Gewichtsblock im Turm.
5. Rückenstrecker / Hyperextension-Bank 45 Grad: schräges Hüftpolster, Fußplatte mit runder Fersenrolle, kein Gewichtsblock.
6. Brustpresse-Maschine: Sitz und Rückenlehne, zwei Griffe auf Brusthöhe nach vorn, gelber Gewichtsblock im Turm hinten.
7. Butterfly-Maschine: Sitz, hohe Rückenlehne, zwei schwenkbare Armpolster links und rechts, gelber Gewichtsblock im Turm.
8. Schulterpresse-Maschine: Sitz, senkrechte Rückenlehne, zwei Griffe über Schulterhöhe, gelber Gewichtsblock im Turm.
9. Sitzende Rudermaschine: Sitz, Brustpolster vorne, zwei Zuggriffe am Hebel, gelber Gewichtsblock im Turm.
10. Wadenmaschine sitzend: Sitz, gepolsterter Kniehebel über den Oberschenkeln, kleiner Fußtritt, gelbe Scheiben am Hebel.
11. Kabelzug-Turm: hoher Turm mit gelbem Gewichtsblock, Umlenkrolle oben, Seil mit Einhandgriff.
```
