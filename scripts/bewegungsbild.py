"""Bewegungsbild aus einem ChatGPT-Raster (2 × 2 Phasen) erzeugen.

    python3 scripts/bewegungsbild.py <raster.png> <id> [<raster.png> <id> ...]
    python3 scripts/bewegungsbild.py --ziel <ordner> <raster.png> <id> ...

Braucht Pillow und numpy (`pip install pillow numpy`).

Ablauf je Bild:
  1. Die vier Felder an den weißen Stegen schneiden.
  2. Jedes Feld an der Bodenlinie von Feld 1 ausrichten. ChatGPT setzt die
     Felder nicht exakt gleich, meist 2 bis 6 px, einmal 15 px versetzt; ohne
     Ausgleich springt das Gerät beim Abspielen.
  3. Alle vier auf denselben 3:2-Ausschnitt schneiden und nebeneinander
     ablegen:
       public/bewegung/<id>.webp        vier Phasen je 720 × 480
       public/bewegung/<id>-klein.webp  vier Phasen je 360 × 240

Danach die Kennung in `lib/bewegung.ts` eintragen. Ob die Geräte still
stehen, zeigt `--zwiebel <datei.png>`: alle vier Phasen übereinander; was
doppelt erscheint, ist verrutscht.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

GRUND = np.array([0xEE, 0xF0, 0xF4], dtype=np.int16)  # Hintergrund der Bilder
GROSS, KLEIN = (720, 480), (360, 240)


def _steg(a: np.ndarray, achse: int) -> tuple[int, int]:
    """Weißer Steg in der Bildmitte: zusammenhängende, fast ganz weiße Zeilen bzw. Spalten."""
    anteil = (a.min(axis=2) >= 250).mean(axis=achse)
    n = len(anteil)
    kand = [i for i in range(int(n * 0.35), int(n * 0.65)) if anteil[i] > 0.97]
    if not kand:
        raise ValueError("kein weißer Steg gefunden (ist das ein 2 × 2-Raster?)")
    bloecke, start = [], kand[0]
    for a_, b_ in zip(kand, kand[1:]):
        if b_ != a_ + 1:
            bloecke.append((start, a_))
            start = b_
    bloecke.append((start, kand[-1]))
    return min(bloecke, key=lambda b: abs((b[0] + b[1]) / 2 - n / 2))


def _rand(a: np.ndarray, achse: int) -> tuple[int, int]:
    """Erste und letzte nicht weiße Zeile bzw. Spalte (ein weißer Außenrand fällt weg)."""
    idx = np.where((a.min(axis=2) >= 250).mean(axis=achse) < 0.97)[0]
    return int(idx[0]), int(idx[-1])


def felder(pfad: Path) -> list[np.ndarray]:
    """Die vier Felder: oben links, oben rechts, unten links, unten rechts."""
    a = np.asarray(Image.open(pfad).convert("RGB")).astype(np.int16)
    sx, sy = _steg(a, 0), _steg(a, 1)
    x0, x1 = _rand(a, 0)
    y0, y1 = _rand(a, 1)
    boxen = [(x0, y0, sx[0], sy[0]), (sx[1] + 1, y0, x1 + 1, sy[0]),
             (x0, sy[1] + 1, sx[0], y1 + 1), (sx[1] + 1, sy[1] + 1, x1 + 1, y1 + 1)]
    return [a[b[1]:b[3], b[0]:b[2]] for b in boxen]


def bodenlinie(f: np.ndarray) -> tuple[int, int]:
    """(x-Anfang, y) der Bodenlinie: unterste dunkle Linie über fast die halbe Breite."""
    dunkel = f.max(axis=2) < 90
    anteil = dunkel.mean(axis=1)
    kand = np.where(anteil > 0.45)[0]
    if not len(kand):
        raise ValueError("keine Bodenlinie gefunden")
    y = int(kand[-1])
    oben = y
    while oben - 1 >= 0 and anteil[oben - 1] > 0.45:
        oben -= 1
    xs = np.where(dunkel[(oben + y) // 2])[0]
    # längster zusammenhängender Lauf
    best, start, prev = (int(xs[0]), int(xs[0])), int(xs[0]), int(xs[0])
    for x in [int(v) for v in xs[1:]] + [None]:
        if x is None or x != prev + 1:
            if prev - start > best[1] - best[0]:
                best = (start, prev)
            if x is not None:
                start = x
        if x is not None:
            prev = x
    return best[0], y


def _verschiebe(f: np.ndarray, dx: int, dy: int) -> np.ndarray:
    h, w, _ = f.shape
    out = np.empty_like(f)
    out[:] = GRUND
    xs0, xd0, ys0, yd0 = max(0, -dx), max(0, dx), max(0, -dy), max(0, dy)
    bw, bh = w - abs(dx), h - abs(dy)
    out[yd0:yd0 + bh, xd0:xd0 + bw] = f[ys0:ys0 + bh, xs0:xs0 + bw]
    return out


def phasen(pfad: Path) -> tuple[list[Image.Image], list[tuple[int, int]]]:
    """Ausgerichtete Phasen im gemeinsamen 3:2-Ausschnitt und der Versatz je Feld."""
    fs = felder(pfad)
    linien = [bodenlinie(f) for f in fs]
    (rx0, ry), h, w = linien[0], min(f.shape[0] for f in fs), min(f.shape[1] for f in fs)
    versatz = [(rx0 - x, ry - y) for x, y in linien]
    ausgerichtet = [_verschiebe(f[:h, :w], dx, dy) for f, (dx, dy) in zip(fs, versatz)]
    mx = max(abs(dx) for dx, _ in versatz) + 2
    my = max(abs(dy) for _, dy in versatz) + 2
    x0, y0, x1, y1 = mx, my, w - mx, h - my
    bw, bh = x1 - x0, y1 - y0
    if bw / bh > 1.5:  # zu breit: seitlich gleichmäßig kürzen
        neu = int(round(bh * 1.5))
        x0 += (bw - neu) // 2
        x1 = x0 + neu
    else:  # zu hoch: oben kürzen, unten steht die Bodenlinie
        y0 = y1 - int(round(bw / 1.5))
    bilder = [Image.fromarray(a[y0:y1, x0:x1].astype(np.uint8)) for a in ausgerichtet]
    return bilder, versatz


def speichere(bilder: list[Image.Image], ziel: Path, kennung: str) -> list[Path]:
    ziel.mkdir(parents=True, exist_ok=True)
    out = []
    for (fw, fh), anhang in ((GROSS, ""), (KLEIN, "-klein")):
        bogen = Image.new("RGB", (fw * 4, fh), tuple(int(v) for v in GRUND))
        for i, b in enumerate(bilder):
            bogen.paste(b.resize((fw, fh), Image.LANCZOS), (i * fw, 0))
        p = ziel / f"{kennung}{anhang}.webp"
        bogen.save(p, "WEBP", quality=80, method=6)
        out.append(p)
    return out


def zwiebel(bilder: list[Image.Image], datei: Path) -> None:
    arr = [np.asarray(b).astype(np.int16) for b in bilder]
    Image.fromarray(np.minimum.reduce(arr).astype(np.uint8)).save(datei)


def main(argv: list[str]) -> int:
    ziel = Path(__file__).resolve().parent.parent / "public" / "bewegung"
    zwiebel_datei = None
    rest = []
    i = 0
    while i < len(argv):
        if argv[i] == "--ziel":
            ziel = Path(argv[i + 1])
            i += 2
        elif argv[i] == "--zwiebel":
            zwiebel_datei = Path(argv[i + 1])
            i += 2
        else:
            rest.append(argv[i])
            i += 1
    if not rest or len(rest) % 2:
        print(__doc__)
        return 2
    for raster, kennung in zip(rest[::2], rest[1::2]):
        bilder, versatz = phasen(Path(raster))
        dateien = speichere(bilder, ziel, kennung)
        if zwiebel_datei:
            zwiebel(bilder, zwiebel_datei.with_name(f"{zwiebel_datei.stem}-{kennung}{zwiebel_datei.suffix}"))
        groessen = ", ".join(f"{p.name} {p.stat().st_size // 1024} KB" for p in dateien)
        print(f"{kennung}: Versatz {versatz}, Ausschnitt {bilder[0].size[0]} × {bilder[0].size[1]} → {groessen}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
