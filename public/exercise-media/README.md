# Übungs-Demo-Clips (drop-in)

Lege hier echte Demonstrations-Clips ab — sie erscheinen **automatisch** im
Ausführungs-Guide (`GuideSheet`), ohne Code-Änderung.

## Konvention
- Dateiname = die Übungs-ID aus `lib/exercises.ts`, Endung `.mp4`:
  `goblet.mp4`, `pushup.mp4`, `rdl_db.mp4`, `ohp_stand.mp4`, `hip_thrust.mp4`,
  `plank.mp4`, …
- Der Guide prüft beim Öffnen, ob `/exercise-media/<id>.mp4` existiert. Wenn ja,
  zeigt er das Video (Umschalter **Video / Illustration**); wenn nein, greift die
  Premium-2D-Figur. Kein Eintrag in `lib/exercises.ts` nötig.
- Alternativ kann pro Übung eine explizite (auch externe) URL über
  `Exercise.videoUrl` gesetzt werden — die hat Vorrang.
- Der Service Worker cacht gleichartige (same-origin) GET-Requests → die Clips
  sind nach dem ersten Abspielen **offline** verfügbar.

## Format-Empfehlung
- Kurz (~3–6 s), loop-fähig, **stumm** (wird `loop muted` abgespielt).
- Klein halten: 480–640 px Breite, H.264/MP4, möglichst < 2–3 MB pro Clip.
- Optional zuschneiden/verkleinern: `ffmpeg -i in.mp4 -t 6 -vf scale=480:-2 -an out.mp4`.

## Lizenz
Nur lizenzsaubere Quellen verwenden (z. B. **Pexels-Lizenz** / **Pixabay-Content-
Lizenz** — kommerziell frei, ohne Attribution; oder Wikimedia-Commons CC mit
Attribution). Quelle/Lizenz je Clip hier unten dokumentieren:

| Datei | Übung | Quelle (URL) | Lizenz |
|-------|-------|--------------|--------|
| _z. B. goblet.mp4_ | Goblet Squat | _https://…_ | Pexels |

> Hinweis: In der Build-/CI-Umgebung dieses Projekts ist der ausgehende Netzzugriff
> auf Medien-Hosts gesperrt — Clips müssen daher aus einer Umgebung **mit** Netz
> (oder lokal) hier abgelegt und committet werden.
