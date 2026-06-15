import type { PoseLandmarker } from "@mediapipe/tasks-vision";

// WASM runtime + model are fetched at runtime (kept out of the app bundle).
const WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

export function isPoseSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

let cached: PoseLandmarker | null = null;
let loading: Promise<PoseLandmarker | null> | null = null;

/** Lazily import MediaPipe and build a VIDEO-mode landmarker. Cached; null on failure. */
export async function getPoseLandmarker(): Promise<PoseLandmarker | null> {
  if (cached) return cached;
  if (loading) return loading;
  loading = (async () => {
    try {
      const vision = await import("@mediapipe/tasks-vision");
      const fileset = await vision.FilesetResolver.forVisionTasks(WASM_CDN);
      const lm = await vision.PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        runningMode: "VIDEO",
        numPoses: 1,
      });
      cached = lm;
      return lm;
    } catch {
      loading = null;
      return null;
    }
  })();
  return loading;
}
