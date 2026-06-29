"use client";

import { ArrowLeft, SwitchCamera, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Pressable } from "@/components/ui/pressable";
import { poseMetrics, type Landmark } from "@/lib/pose/angles";
import { checkForm } from "@/lib/pose/form-rules";
import { configForPattern } from "@/lib/pose/exercise-pose-config";
import { getPoseLandmarker, isPoseSupported } from "@/lib/pose/landmarker";
import { initRepState, updateRep, type RepState } from "@/lib/pose/rep-counter";
import { speak } from "@/lib/voice";
import type { Pattern } from "@/lib/types";

type Status = "loading" | "running" | "denied" | "unsupported" | "error";

// Landmark index pairs forming the drawn skeleton.
const BONES: [number, number][] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [24, 26], [26, 28],
];

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(pattern);
}

export function CameraView({
  exerciseName,
  pattern,
  voiceOn,
  onClose,
}: {
  exerciseName: string;
  pattern: Pattern;
  voiceOn: boolean;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [reps, setReps] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");

  const cfg = configForPattern(pattern);
  const repRef = useRef<RepState>(initRepState());
  const warnRef = useRef(false);
  const voiceRef = useRef(voiceOn);
  voiceRef.current = voiceOn;

  useEffect(() => {
    if (!isPoseSupported()) {
      setStatus("unsupported");
      return;
    }
    let cancelled = false;
    let raf = 0;
    let stream: MediaStream | null = null;
    repRef.current = initRepState();
    warnRef.current = false;
    setReps(0);
    setWarning(null);
    setStatus("loading");

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const v = videoRef.current!;
        v.srcObject = stream;
        await v.play();
      } catch {
        if (!cancelled) setStatus("denied");
        return;
      }

      const lm = await getPoseLandmarker();
      if (cancelled) return;
      if (!lm) {
        setStatus("error");
        return;
      }
      setStatus("running");

      const v = videoRef.current!;
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setStatus("error");
        return;
      }
      let last = -1;

      const loop = () => {
        if (cancelled) return;
        const ts = performance.now();
        if (v.readyState >= 2 && v.videoWidth && ts - last >= 55) {
          last = ts;
          let lms: Landmark[] = [];
          try {
            const res = lm.detectForVideo(v, ts);
            lms = (res?.landmarks?.[0] ?? []) as Landmark[];
          } catch {
            /* skip frame */
          }
          if (canvas.width !== v.videoWidth) canvas.width = v.videoWidth;
          if (canvas.height !== v.videoHeight) canvas.height = v.videoHeight;
          drawSkeleton(ctx, lms, canvas.width, canvas.height);

          if (lms.length && cfg) {
            const m = poseMetrics(lms);
            const value =
              cfg.rep.metric === "kneeAngle"
                ? m.kneeAngle
                : cfg.rep.metric === "elbowAngle"
                  ? m.elbowAngle
                  : m.hipAngle;
            if (value != null) {
              const next = updateRep(repRef.current, value, cfg.rep);
              if (next.reps !== repRef.current.reps) {
                setReps(next.reps);
                vibrate(40);
                if (voiceRef.current) speak(String(next.reps));
              }
              repRef.current = next;
            }
            const finding = checkForm(m, cfg);
            const warnNow = !!finding;
            if (warnNow !== warnRef.current) {
              warnRef.current = warnNow;
              setWarning(warnNow ? finding!.message : null);
              if (warnNow) {
                vibrate([60, 40, 60]);
                if (voiceRef.current) speak("Achtung, Rücken gerade halten.", { interrupt: true });
              }
            }
          }
        }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [facing, cfg]);

  const mirror = facing === "user" ? { transform: "scaleX(-1)" } : undefined;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 h-full w-full object-contain"
          style={mirror}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full object-contain"
          style={mirror}
        />

        {/* top bar */}
        <div
          className="absolute inset-x-0 top-0 flex items-center justify-between p-4"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)" }}
        >
          <Pressable
            onClick={onClose}
            aria-label="Schließen"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-fg focus:outline-none"
          >
            <ArrowLeft size={16} /> {exerciseName}
          </Pressable>
          <Pressable
            onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
            aria-label="Kamera wechseln"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            className="rounded-full p-2 text-fg focus:outline-none"
          >
            <SwitchCamera size={18} />
          </Pressable>
        </div>

        {/* rep counter */}
        {status === "running" && cfg && (
          <div
            className="absolute left-4 top-28 rounded-card px-4 py-2"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          >
            <p className="font-display text-5xl font-semibold tabular-nums text-neutral-50">{reps}</p>
            <p className="text-xs uppercase tracking-widest text-muted">Wdh</p>
          </div>
        )}

        {/* warning banner */}
        {warning && (
          <div className="absolute inset-x-4 top-16 flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-sm font-medium text-neutral-50">
            <TriangleAlert size={16} className="shrink-0" /> {warning}
          </div>
        )}

        {/* status overlays */}
        {status !== "running" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="text-lg font-medium text-fg">
              {status === "loading" && "Kamera & Modell laden…"}
              {status === "denied" && "Kamerazugriff nötig"}
              {status === "unsupported" && "Kamera nicht verfügbar"}
              {status === "error" && "Modell konnte nicht laden"}
            </p>
            <p className="max-w-xs text-sm text-muted">
              {status === "loading" && "Stell dich so hin, dass dich die Kamera ganz sieht."}
              {status === "denied" && "Erlaube den Kamerazugriff im Browser und lade neu."}
              {status === "unsupported" && "Dieses Gerät unterstützt den Kamera-Check nicht."}
              {status === "error" && "Prüfe deine Internetverbindung — das Modell wird einmalig geladen."}
            </p>
            {status !== "loading" && (
              <Pressable
                onClick={onClose}
                className="mt-2 rounded-xl bg-strong px-4 py-2 text-sm font-medium text-on-strong focus:outline-none"
              >
                Zurück
              </Pressable>
            )}
          </div>
        )}
      </div>

      {/* footer hint */}
      {status === "running" && (
        <div
          className="bg-black px-5 py-3 text-center"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
        >
          <p className="text-sm text-muted">
            {cfg ? cfg.hint : "Für diese Übung gibt es keine automatische Zählung — nutz die Skelett-Ansicht als Technik-Check."}
          </p>
          <p className="mt-0.5 text-xs text-faint">Beta · alles läuft on-device, kein Upload.</p>
        </div>
      )}
    </div>
  );
}

function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  lms: Landmark[],
  w: number,
  h: number,
) {
  ctx.clearRect(0, 0, w, h);
  if (!lms.length) return;
  const seen = (p?: Landmark) => p && (p.visibility ?? 1) >= 0.3;
  ctx.strokeStyle = "#30d158";
  ctx.fillStyle = "#30d158";
  ctx.lineWidth = Math.max(2, w * 0.005);
  BONES.forEach(([a, b]) => {
    const pa = lms[a];
    const pb = lms[b];
    if (!seen(pa) || !seen(pb)) return;
    ctx.beginPath();
    ctx.moveTo(pa.x * w, pa.y * h);
    ctx.lineTo(pb.x * w, pb.y * h);
    ctx.stroke();
  });
  const r = Math.max(3, w * 0.007);
  lms.forEach((p) => {
    if (!seen(p)) return;
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, r, 0, Math.PI * 2);
    ctx.fill();
  });
}
